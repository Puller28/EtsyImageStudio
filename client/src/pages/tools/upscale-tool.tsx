import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ImageUpload from "@/components/image-upload";
import ProcessingControls from "@/components/processing-controls";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/workspace-context";
import { Sparkles, ImageUp, Workflow } from "lucide-react";
import { useLocation } from "wouter";

interface UpscaleToolPageProps {
  showIntro?: boolean;
}

interface UploadedImage {
  file: File;
  preview: string;
}
interface StartProcessingOptions {
  upscaleOption: "2x" | "4x" | "none";
  selectedPrintFormats: string[];
}
function getAuthToken(): string | null {
  try {
    const authStorage = localStorage.getItem("auth-storage");
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      return parsed?.state?.token ?? parsed?.token ?? null;
    }
  } catch (error) {
    console.error("Failed to read auth token:", error);
  }
  return null;
}
export default function UpscaleToolPage({ showIntro = true }: UpscaleToolPageProps = {}) {
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | undefined>();
  const [projectName, setProjectName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResultProjectId, setLastResultProjectId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { setSelectedProjectId, selectedProjectId } = useWorkspace();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Check if selected project already has an image
  const { data: selectedProject } = useQuery({
    queryKey: ["/api/projects", selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return null;
      const res = await fetch(`/api/projects/${selectedProjectId}`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedProjectId,
  });

  const startProcessing = async (projectId: string) => {
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/projects/${projectId}/process`, {
        method: "POST",
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Processing API returned ${response.status}`);
      }

      toast({
        title: "Processing started",
        description: "We're preparing your upscaled and print-ready files.",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    } catch (error) {
      console.error("Failed to start processing from tools:", error);
      toast({
        title: "Processing not started",
        description: "Project saved, but the automation didn't kick in. Open the project and retry.",
        variant: "destructive",
      });
    }
  };

  const createProjectMutation = useMutation({
    mutationFn: async (payload: { formData: FormData }) => {
      const token = getAuthToken();
      const response = await fetch("/api/projects", {
        method: "POST",
        body: payload.formData,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to create project");
      }
      return response.json();
    },
    onSuccess: async (project: any) => {
      toast({
        title: "Processing started",
        description: "Taking you to the workflow to track progress...",
      });
      setLastResultProjectId(project?.id || null);
      setSelectedProjectId(project?.id || null);
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });

      if (project?.id) {
        // IMPORTANT: Wait for processing to start before navigating
        await startProcessing(project.id);
        
        // Navigate to workflow with the project selected
        navigate(`/workflow/run?project=${project.id}`);
      }

      setProjectName("");
      if (uploadedImage) {
        URL.revokeObjectURL(uploadedImage.preview);
        setUploadedImage(undefined);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start processing",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => setIsSubmitting(false),
  });
  const handleStartProcessing = async (options: StartProcessingOptions) => {
    // If we have an existing project with an image, just start processing
    if (hasExistingImage && selectedProjectId) {
      setIsSubmitting(true);
      try {
        await startProcessing(selectedProjectId);
        toast({
          title: "Processing started",
          description: "Taking you to the workflow to track progress...",
        });
        
        // Navigate to workflow to show progress
        setTimeout(() => {
          navigate(`/workflow/run?project=${selectedProjectId}`);
        }, 500);
      } catch (error) {
        toast({
          title: "Processing failed",
          description: "Unable to start processing. Please try again.",
          variant: "destructive",
        });
        setIsSubmitting(false);
      }
      return;
    }
    
    // Otherwise, create new project with uploaded image
    if (!uploadedImage) {
      toast({
        title: "Upload required",
        description: "Add an artwork file before running the tool.",
        variant: "destructive",
      });
      return;
    }
    if (!projectName.trim()) {
      toast({
        title: "Project title required",
        description: "Give this project a descriptive name so you can find it later.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("image", uploadedImage.file);
    formData.append("artworkTitle", projectName.trim());
    formData.append("styleKeywords", "workspace upload");
    formData.append("upscaleOption", options.upscaleOption);
    formData.append("printFormats", JSON.stringify(options.selectedPrintFormats));
    createProjectMutation.mutate({ formData });
  };
  // Check if we have a project with an existing image
  const hasExistingImage = selectedProject && (
    selectedProject.originalImageUrl || 
    selectedProject.thumbnailUrl
  );
  
  // Check if project is already processed (has upscaled image and print formats)
  const isProcessed = selectedProject && 
    selectedProject.status === 'completed' && 
    selectedProject.upscaledImageUrl && 
    selectedProject.resizedImages && 
    selectedProject.resizedImages.length > 0;
  
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-10">
      {/* Show success message if project is already processed */}
      {isProcessed && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="font-medium text-green-900">✅ Processing Complete: {selectedProject.title}</p>
          <p className="text-sm text-green-700">
            Your upscaled image and {selectedProject.resizedImages.length} print formats are ready! View them below or continue to the next workflow step.
          </p>
        </div>
      )}
      
      {/* Show project info if coming from workflow with existing image but not yet processed */}
      {hasExistingImage && !isProcessed && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="font-medium text-green-900">Project Selected: {selectedProject.title}</p>
          <p className="text-sm text-green-700">
            Your AI-generated artwork is ready. Choose your upscale option and processing settings below.
          </p>
        </div>
      )}
      
      {showIntro && !hasExistingImage && (
        <header className="mb-8 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-100">
                <ImageUp className="h-3.5 w-3.5" />
                Upscale & Prepare Artwork
              </div>
              <h1 className="mt-3 text-3xl font-semibold text-white">Image Upscale Studio</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Upload existing artwork, choose your upscale preference, and generate print-ready formats in a single action.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                className="border-indigo-400/60 bg-transparent text-indigo-100 hover:bg-indigo-500/20"
                onClick={() => navigate("/workflow")}
              >
                <Workflow className="mr-2 h-4 w-4" />
                Prefer guided workflow
              </Button>
              {lastResultProjectId && (
                <Button
                  variant="secondary"
                  className="bg-indigo-500/20 text-indigo-100 hover:bg-indigo-500/30"
                  onClick={() => window.open(`/workspace/projects/${lastResultProjectId}`, "_blank")}
                >
                  View last project
                </Button>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-sm text-indigo-100">
            <p className="text-base font-semibold text-white">Step 1: Create your project</p>
            <p className="mt-2 text-indigo-100/80">
              Add a project name, upload an artwork, and click Start Processing. We'll generate your upscaled master and print-ready files here,
              and you can switch to the guided workflow at any time.
            </p>
          </div>
        </header>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {isProcessed ? (
          // Show completed results
          <div className="space-y-6">
            <Card className="border-slate-800 bg-slate-900/70 text-slate-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Sparkles className="h-4 w-4" />
                  Upscaled Image
                </CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={selectedProject.upscaledImageUrl}
                  alt={`${selectedProject.title} - Upscaled`}
                  className="w-full rounded-lg shadow-lg"
                />
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={() => window.open(selectedProject.upscaledImageUrl, '_blank')}
                    className="flex-1 bg-indigo-500 hover:bg-indigo-600"
                  >
                    View Full Size
                  </Button>
                  <Button
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = selectedProject.upscaledImageUrl;
                      a.download = `${selectedProject.title}-upscaled.jpg`;
                      a.click();
                    }}
                    variant="outline"
                    className="flex-1 border-slate-700 text-slate-200 hover:bg-slate-800"
                  >
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-slate-800 bg-slate-900/70 text-slate-100">
              <CardHeader>
                <CardTitle className="text-white">Print Formats ({selectedProject.resizedImages.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedProject.resizedImages.map((format: any, index: number) => (
                    <div key={index} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                      <div>
                        <p className="font-medium text-white">{format.format}</p>
                        <p className="text-sm text-slate-400">{format.dimensions}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => window.open(format.url, '_blank')}
                        className="bg-indigo-500 hover:bg-indigo-600"
                      >
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : hasExistingImage ? (
          // Show existing project image (not yet processed)
          <Card className="border-slate-800 bg-slate-900/70 text-slate-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Sparkles className="h-4 w-4" />
                Your AI-Generated Artwork
              </CardTitle>
            </CardHeader>
            <CardContent>
              <img
                src={selectedProject.thumbnailUrl || selectedProject.originalImageUrl}
                alt={selectedProject.title}
                className="w-full rounded-lg shadow-lg"
              />
              <p className="mt-4 text-sm text-slate-400">
                This artwork is ready to be upscaled and processed. Choose your options on the right.
              </p>
            </CardContent>
          </Card>
        ) : (
          // Show upload form for new projects
          <Card className="border-slate-800 bg-slate-900/70 text-slate-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Sparkles className="h-4 w-4" />
                Artwork Upload
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium text-slate-200">
                  Project name
                  <span className="text-rose-400 ml-1">*</span>
                </label>
                <Input
                  placeholder="e.g. Boho Botanical Collection"
                  className="mt-2 border-slate-800 bg-slate-950/60 text-slate-100"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                />
              </div>
              <ImageUpload
                onImageUpload={(file) => {
                  if (uploadedImage) {
                    URL.revokeObjectURL(uploadedImage.preview);
                  }
                  const preview = URL.createObjectURL(file);
                  setUploadedImage({ file, preview });
                }}
                uploadedImage={uploadedImage}
                onRemoveImage={() => {
                  if (uploadedImage) {
                    URL.revokeObjectURL(uploadedImage.preview);
                  }
                  setUploadedImage(undefined);
                }}
              />
            </CardContent>
          </Card>
        )}
        {!isProcessed && (
          <Card className="border-slate-800 bg-slate-900/70 text-slate-100">
            <CardHeader>
              <CardTitle className="text-white">Processing Options</CardTitle>
            </CardHeader>
            <CardContent>
              <ProcessingControls
                onStartProcessing={({ upscaleOption, selectedPrintFormats }) =>
                  handleStartProcessing({
                    upscaleOption: upscaleOption,
                    selectedPrintFormats,
                  })
                }
                disabled={isSubmitting}
              />
            </CardContent>
          </Card>
        )}
        
        {isProcessed && (
          <Card className="border-slate-800 bg-slate-900/70 text-slate-100">
            <CardHeader>
              <CardTitle className="text-white">Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-300">
                Your project is complete! You can:
              </p>
              <div className="space-y-2">
                <Button
                  onClick={() => navigate("/tools/mockups")}
                  className="w-full bg-indigo-500 hover:bg-indigo-600"
                >
                  Create Mockups
                </Button>
                <Button
                  onClick={() => navigate("/tools/listing")}
                  variant="outline"
                  className="w-full border-slate-700 text-slate-200 hover:bg-slate-800"
                >
                  Generate Listing
                </Button>
                <Button
                  onClick={() => navigate(`/workspace/projects/${selectedProjectId}`)}
                  variant="outline"
                  className="w-full border-slate-700 text-slate-200 hover:bg-slate-800"
                >
                  View in Workspace
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}


