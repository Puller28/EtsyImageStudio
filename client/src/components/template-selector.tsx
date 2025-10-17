import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Image as ImageIcon, Download, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { analytics } from "@/lib/analytics";

interface Template {
  id: string;
  room: string;
  name?: string;
  manifest_present: boolean;
  bg_present: boolean;
  bg?: string;
  preview_url?: string;
  corners?: number[][];
  width?: number;
  height?: number;
}

interface TemplatesByRoom {
  [room: string]: Template[];
}

interface GeneratedMockup {
  template: {
    room: string;
    id: string;
    name: string;
  };
  image_data: string;
}

interface TemplateSelectorProps {
  uploadedFile: File | null;
  onMockupsGenerated: (mockups: GeneratedMockup[]) => void;
  sourceProjectId?: string | null; // Optional: if provided, mockups will be added to this existing project
}

const MAX_TEMPLATES = 10;

export function TemplateSelector({ uploadedFile, onMockupsGenerated, sourceProjectId }: TemplateSelectorProps) {
  const [selectedTemplates, setSelectedTemplates] = useState<Template[]>([]);
  const [stuckStateTimer, setStuckStateTimer] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (stuckStateTimer) {
        clearTimeout(stuckStateTimer);
      }
    };
  }, [stuckStateTimer]);

  // Fetch available templates
  const { data: templatesData, isLoading: templatesLoading, error: templatesError } = useQuery({
    queryKey: ["/api/templates"],
    enabled: true,
  });

  // Generate mockups mutation
  const generateMockups = useMutation({
    mutationFn: async (data: { file: File; templates: Template[] }) => {
      const formData = new FormData();
      formData.append("file", data.file);
      formData.append("templates", JSON.stringify(data.templates.map(t => ({
        room: t.room,
        id: t.id,
        name: t.name || `${t.room}_${t.id}`
      }))));
      
      // If we have a source project ID, send it so mockups are added to existing project
      if (sourceProjectId) {
        formData.append("project_id", sourceProjectId);
      }

      // Get token from auth store
      const getToken = () => {
        try {
          const authStorage = localStorage.getItem('auth-storage');
          const backupStorage = localStorage.getItem('auth-storage-backup');
          
          const storageData = authStorage || backupStorage;
          if (storageData) {
            const parsed = JSON.parse(storageData);
            return parsed.token || parsed.state?.token;
          }
        } catch (error) {
          console.error('Error getting token:', error);
        }
        return null;
      };

      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const response = await fetch("/api/apply-templates", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new Error(errorData.message || errorData.error || 'Failed to generate mockups');
      }

      const responseData = await response.json();
      console.log('✅ Mockup generation response:', responseData);
      return responseData;
    },
    onSuccess: (data: any) => {
      try {
        console.log('🎉 Mockup generation successful:', data);
        
        // Clear the stuck state timer
        if (stuckStateTimer) {
          clearTimeout(stuckStateTimer);
          setStuckStateTimer(null);
        }
        
        // Show success message
        toast({
          title: "Mockups Generated Successfully", 
          description: `Created ${data.mockups?.length || data.mockupCount || selectedTemplates.length} mockups using ${data.credits_used || selectedTemplates.length} credits`,
        });
        
        // Handle different response formats
        if (data.mockups && Array.isArray(data.mockups)) {
          onMockupsGenerated(data.mockups);
        } else if (data.project_id) {
          // If we got a project ID, redirect to projects page
          setTimeout(() => {
            window.location.href = `/projects/${data.project_id}`;
          }, 1500);
        } else {
          console.warn('⚠️ No mockups in response, redirecting to projects:', data);
          setTimeout(() => {
            window.location.href = '/projects';
          }, 1500);
        }
        
        // Clear selected templates
        setSelectedTemplates([]);
        
        // Invalidate queries to refresh user data
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        
        // Track successful completion
        analytics.funnelStep('mockup_generation_complete', 4);
        
      } catch (error) {
        console.error('❌ Error in onSuccess callback:', error);
        toast({
          title: "Processing Error",
          description: "Mockups generated but failed to display. Check your Projects page.",
          variant: "destructive",
        });
        
        // Still redirect to projects as a fallback
        setTimeout(() => {
          window.location.href = '/projects';
        }, 2000);
      }
    },
    onError: (error: any) => {
      console.error('❌ Mockup generation error:', error);
      
      // Clear the stuck state timer
      if (stuckStateTimer) {
        clearTimeout(stuckStateTimer);
        setStuckStateTimer(null);
      }
      
      // Show error message
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate mockups. Please try again.",
        variant: "destructive",
      });
      
      // Track error
      analytics.errorEncounter('mockup_generation_failed', 'template_selector', error.message || 'Unknown error');
    },
    onSettled: () => {
      // Force reset mutation state to prevent stuck loading
      console.log('🔄 Mutation settled - resetting state');
      
      // Always clear the timer when mutation settles
      if (stuckStateTimer) {
        clearTimeout(stuckStateTimer);
        setStuckStateTimer(null);
      }
      
      // Small delay to ensure UI updates properly
      setTimeout(() => {
        console.log('🔄 Mutation state fully settled');
      }, 100);
    },
  });

  const handleTemplateToggle = (template: Template, checked: boolean) => {
    if (checked) {
      if (selectedTemplates.length >= MAX_TEMPLATES) {
        toast({
          title: "Maximum Templates Reached",
          description: `You can select up to ${MAX_TEMPLATES} templates at once`,
          variant: "destructive",
        });
        return;
      }
      // Track template selection
      analytics.mockupTemplateSelect(template.room, template.id);
      analytics.funnelStep('template_selection', 2);
      
      setSelectedTemplates([...selectedTemplates, template]);
    } else {
      setSelectedTemplates(selectedTemplates.filter(t => 
        !(t.room === template.room && t.id === template.id)
      ));
    }
  };

  const handleGenerate = () => {
    if (!uploadedFile) {
      toast({
        title: "No File Selected",
        description: "Please upload an artwork file first",
        variant: "destructive",
      });
      analytics.errorEncounter('no_file_selected', 'mockup_generation', 'User attempted to generate without file');
      return;
    }

    if (selectedTemplates.length === 0) {
      toast({
        title: "No Templates Selected",
        description: "Please select at least one template",
        variant: "destructive",
      });
      analytics.errorEncounter('no_templates_selected', 'mockup_generation', 'User attempted to generate without templates');
      return;
    }

    // Track mockup generation start
    const creditsUsed = selectedTemplates.length; // 1 credit per template
    analytics.mockupGenerate(selectedTemplates.length, creditsUsed);
    analytics.funnelStep('mockup_generation_start', 3);

    // Clear any existing stuck state timer
    if (stuckStateTimer) {
      clearTimeout(stuckStateTimer);
    }

    // Set a timer to detect stuck state (10 minutes)
    const timer = setTimeout(() => {
      if (generateMockups.isPending) {
        console.warn('⚠️ Mutation appears stuck, attempting to reset');
        analytics.errorEncounter('generation_timeout', 'mockup_generation', 'Generation exceeded 10 minutes');
        toast({
          title: "Generation Taking Longer Than Expected",
          description: "The generation is still processing. Please wait or refresh the page if needed.",
          variant: "default",
        });
      }
    }, 10 * 60 * 1000); // 10 minutes

    setStuckStateTimer(timer);
    generateMockups.mutate({ file: uploadedFile, templates: selectedTemplates });
  };

  const handleForceReset = () => {
    if (stuckStateTimer) {
      clearTimeout(stuckStateTimer);
      setStuckStateTimer(null);
    }
    
    // Force reset the mutation
    generateMockups.reset();
    
    toast({
      title: "Generation Reset",
      description: "You can now try generating mockups again.",
    });
  };

  if (templatesLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading templates...</span>
        </CardContent>
      </Card>
    );
  }

  if (templatesError || !templatesData) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load templates. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  const templatesByRoom: TemplatesByRoom = (templatesData as any)?.rooms || {};
  const selectedCount = selectedTemplates.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Choose Your Mockup Templates</CardTitle>
          <CardDescription>
            Select up to {MAX_TEMPLATES} templates where you'd like to showcase your artwork.
            Explore every room style first, then upload and generate when you're ready.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col items-center gap-3 text-center md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col items-center gap-2">
              <Badge variant="outline">
                {selectedCount}/{MAX_TEMPLATES} templates selected
              </Badge>
              {!uploadedFile && (
                <Badge variant="secondary" className="text-xs">
                  Upload artwork to enable generation
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleGenerate}
                disabled={!uploadedFile || selectedCount === 0 || generateMockups.isPending}
                data-testid="button-generate-mockups"
              >
                {generateMockups.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    {selectedCount === 0
                      ? "Select templates to generate"
                      : `Generate Mockups (${selectedCount} credit${selectedCount !== 1 ? 's' : ''})`}
                  </>
                )}
              </Button>
              {generateMockups.isPending && (
                <Button 
                  variant="outline"
                  onClick={handleForceReset}
                  data-testid="button-reset-generation"
                  size="sm"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {!uploadedFile && (
            <p className="text-xs text-muted-foreground mb-4">
              You can browse and select templates without uploading. When you add your artwork, the Generate button above will activate.
            </p>
          )}

          {Object.keys(templatesByRoom).length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No templates available. Please contact support.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-6">
              {Object.entries(templatesByRoom).map(([roomName, templates]) => (
                <div key={roomName} className="space-y-3">
                  <h3 className="text-lg font-semibold capitalize">
                    {roomName.replace('_', ' ')} Templates
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates
                      .filter(template => template.manifest_present && template.bg_present)
                      .map((template) => {
                        const isSelected = selectedTemplates.some(t => 
                          t.room === template.room && t.id === template.id
                        );
                        
                        return (
                          <Card 
                            key={`${template.room}-${template.id}`}
                            className={`cursor-pointer transition-all ${
                              isSelected ? 'ring-2 ring-primary' : 'hover:shadow-md'
                            }`}
                            onClick={() => handleTemplateToggle(template, !isSelected)}
                          >
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                {/* Template Preview Image */}
                                <div className="relative aspect-[3/4] w-full bg-gray-100 rounded-md overflow-hidden">
                                  <img 
                                    src={template.preview_url || `/api/templates/preview/${template.room}/${template.id}`}
                                    alt={template.name || template.id}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      // Fallback to placeholder
                                      e.currentTarget.src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300"><rect width="200" height="300" fill="#f3f4f6"/><text x="100" y="150" text-anchor="middle" font-family="Arial" font-size="14" fill="#6b7280">${template.name || template.id}</text></svg>`)}`;
                                    }}
                                  />
                                  {isSelected && (
                                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                      <div className="bg-primary text-primary-foreground rounded-full p-2">
                                        <ImageIcon className="h-4 w-4" />
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Template Info */}
                                <div className="flex items-start space-x-3">
                                  <Checkbox 
                                    checked={isSelected}
                                    onCheckedChange={() => {}} // Handled by card click
                                    className="mt-1"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-medium text-sm">
                                        {template.name || template.id}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {roomName.replace('_', ' ')} - Ready to use
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
