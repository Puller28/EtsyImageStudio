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

interface Template {
  id: string;
  room: string;
  name?: string;
  manifest_present: boolean;
  bg_present: boolean;
  bg?: string;
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
}

export function TemplateSelector({ uploadedFile, onMockupsGenerated }: TemplateSelectorProps) {
  const [selectedTemplates, setSelectedTemplates] = useState<Template[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

      return apiRequest("/api/apply-templates", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Mockups Generated Successfully",
        description: `Created ${data.mockups.length} mockups using ${data.credits_used} credits`,
      });
      onMockupsGenerated(data.mockups);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate mockups",
        variant: "destructive",
      });
    },
  });

  const handleTemplateToggle = (template: Template, checked: boolean) => {
    if (checked) {
      if (selectedTemplates.length >= 5) {
        toast({
          title: "Maximum Templates Reached",
          description: "You can select up to 5 templates at once",
          variant: "destructive",
        });
        return;
      }
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
      return;
    }

    if (selectedTemplates.length === 0) {
      toast({
        title: "No Templates Selected",
        description: "Please select at least one template",
        variant: "destructive",
      });
      return;
    }

    generateMockups.mutate({ file: uploadedFile, templates: selectedTemplates });
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

  const templatesByRoom: TemplatesByRoom = templatesData.rooms || {};

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Choose Your Mockup Templates</CardTitle>
          <CardDescription>
            Select up to 5 templates where you'd like to showcase your artwork. 
            Each template will create a professional mockup with your art perfectly placed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <Badge variant="outline">
              {selectedTemplates.length}/5 templates selected
            </Badge>
            {uploadedFile && (
              <Button 
                onClick={handleGenerate}
                disabled={selectedTemplates.length === 0 || generateMockups.isPending}
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
                    Generate Mockups (3 credits)
                  </>
                )}
              </Button>
            )}
          </div>

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
                              <div className="flex items-start space-x-3">
                                <Checkbox 
                                  checked={isSelected}
                                  onCheckedChange={() => {}} // Handled by card click
                                  className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium text-sm">
                                      {template.id}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {roomName.replace('_', ' ')} • Ready to use
                                  </p>
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