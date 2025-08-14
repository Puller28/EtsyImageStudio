import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { User, Project } from "@shared/schema";

import Navigation from "@/components/navigation";
import WorkflowProgress from "@/components/workflow-progress";
import ImageUpload from "@/components/image-upload";
import AIArtGenerator from "@/components/ai-art-generator";
import ProcessingControls from "@/components/processing-controls";
import MockupTemplates from "@/components/mockup-templates";
import EtsyListingGenerator from "@/components/etsy-listing-generator";
import ProcessingStatus from "@/components/processing-status";
import DownloadAssets from "@/components/download-assets";
import RecentProjects from "@/components/recent-projects";

import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Home, Palette } from "lucide-react";
import { Link } from "wouter";
import { Footer } from "@/components/footer";

interface UploadedImage {
  file: File;
  preview: string;
}

export default function Dashboard() {
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | undefined>();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("living-room");
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isGeneratingListing, setIsGeneratingListing] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showUploadMode, setShowUploadMode] = useState(false);

  const [isPackaging, setIsPackaging] = useState(false);
  const { toast } = useToast();

  const { user: authUser, token } = useAuth();

  // Fetch user data
  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // Use auth user data as fallback if API user data is not available
  const currentUser = user || authUser;

  // Fetch recent projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    staleTime: 30000, // Cache for 30 seconds to reduce database load
  });

  // Debug projects data
  useEffect(() => {
    console.log("📋 Projects data:", projects.length, projects);
  }, [projects]);

  // Poll current project status
  const { data: projectStatus } = useQuery<Project>({
    queryKey: ["/api/projects", currentProject?.id],
    enabled: !!currentProject?.id,
    refetchInterval: 2000, // Poll every 2 seconds for active projects
    staleTime: 0, // Always consider data stale
    retry: false, // Don't retry failed requests to avoid spam
  });

  // Debug project status updates
  useEffect(() => {
    if (projectStatus) {
      console.log("📊 Project status updated:", {
        id: projectStatus.id,
        status: projectStatus.status,
        hasEtsyListing: !!projectStatus.etsyListing,
        hasZipUrl: !!projectStatus.zipUrl,
        hasUpscaled: !!projectStatus.upscaledImageUrl,
        hasResized: projectStatus.resizedImages?.length || 0,
        hasMockup: !!projectStatus.mockupImageUrl
      });
    }
  }, [projectStatus]);

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (data: FormData) => {
      console.log("🔑 Token available:", !!token, token?.substring(0, 20) + '...');
      const headers: HeadersInit = {};
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch("/api/projects", {
        method: "POST",
        headers,
        body: data,
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to create project");
      }
      return response.json();
    },
    onSuccess: async (project) => {
      console.log("🟠 Project created successfully:", project.id);
      setCurrentProject(project);
      setCurrentStep(1);
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] }); // Refresh user data to show updated credits
      toast({
        title: "Project Created",
        description: "Your artwork has been uploaded successfully. Starting processing...",
      });
      
      // Automatically start processing after project creation
      console.log("🟠 Auto-starting processing for project:", project.id);
      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`/api/projects/${project.id}/process`, {
          method: 'POST',
          headers,
          credentials: "include",
        });
        
        if (response.ok) {
          console.log("🟠 Processing started successfully");
          queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] });
        } else {
          throw new Error(`Processing API returned ${response.status}`);
        }
      } catch (error) {
        console.error("🟠 Failed to start processing:", error);
        toast({
          title: "Processing Failed",
          description: "Project created but processing failed. Use the button to retry.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload your artwork. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Removed complex mutation system in favor of direct fetch calls

  // Generate listing mutation
  const generateListingMutation = useMutation({
    mutationFn: async ({ projectId, data }: { projectId: string; data: any }) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/generate-listing`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", currentProject?.id] });
      toast({
        title: "Listing Generated",
        description: "Your Etsy listing content has been generated successfully.",
      });
    },
  });

  // Update current step based on project status
  useEffect(() => {
    if (projectStatus) {
      // Update currentProject with latest data
      setCurrentProject(projectStatus);
      
      console.log("Project status changed:", projectStatus.status, "Current step:", currentStep);
      
      switch (projectStatus.status) {
        case "uploading":
          setCurrentStep(1); // Show processing controls after upload
          break;
        case "processing":
          setCurrentStep(2); // Show processing status
          break;
        case "completed":
          setCurrentStep(3); // Show completed status
          break;
        default:
          break;
      }
    }
  }, [projectStatus]);

  const handleImageUpload = (file: File) => {
    console.log("handleImageUpload called with file:", file.name);
    const preview = URL.createObjectURL(file);
    setUploadedImage({ file, preview });
    console.log("Image uploaded successfully, preview set");
  };

  const handleArtworkGenerated = (imageData: string, prompt: string) => {
    // Convert base64 to blob and create file
    const byteCharacters = atob(imageData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });
    const file = new File([blob], 'ai-generated-artwork.jpg', { type: 'image/jpeg' });
    
    const preview = URL.createObjectURL(blob);
    setUploadedImage({ file, preview });
    setShowAIGenerator(false);
    setShowUploadMode(false); // Hide AI generator to show preview
    
    toast({
      title: "AI Artwork Ready",
      description: "Preview your artwork below. Choose to process it further if you like it!",
    });
  };

  const handleRemoveImage = () => {
    if (uploadedImage) {
      URL.revokeObjectURL(uploadedImage.preview);
      setUploadedImage(undefined);
    }
    setCurrentProject(null);
    setCurrentStep(0);
    setShowAIGenerator(false);
    setShowUploadMode(false); // Reset to show options again
  };

  const handleStartProcessing = async (options: { upscaleOption: "2x" | "4x" }) => {
    console.log("🟠 handleStartProcessing called with options:", options);
    
    if (!uploadedImage) {
      toast({
        title: "No Image",
        description: "Please upload an image first.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("image", uploadedImage.file);
    formData.append("artworkTitle", uploadedImage.file.name.replace(/\.[^/.]+$/, ""));
    formData.append("styleKeywords", "digital art");
    formData.append("upscaleOption", options.upscaleOption);
    formData.append("mockupTemplate", selectedTemplate);

    console.log("🟠 About to call createProjectMutation.mutate with FormData");
    createProjectMutation.mutate(formData);
  };

  // Direct processing handler - bypasses mutation complexity
  const handleProcessProject = async (projectId: string) => {
    console.log("Direct processing for project:", projectId);
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/projects/${projectId}/process`, {
        method: 'POST',
        headers,
        credentials: "include",
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log("Processing completed:", result);
        queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
        toast({
          title: "Processing Completed",
          description: "Your artwork has been processed successfully!",
        });
      } else {
        throw new Error(`API returned ${response.status}`);
      }
    } catch (error) {
      console.error("Processing failed:", error);
      toast({
        title: "Processing Failed",
        description: "Failed to process. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateListing = async (data: { artworkTitle: string; styleKeywords: string }) => {
    if (!currentProject) return;
    
    setIsGeneratingListing(true);
    try {
      await generateListingMutation.mutateAsync({
        projectId: currentProject.id,
        data
      });
    } finally {
      setIsGeneratingListing(false);
    }
  };

  const handleDownload = async () => {
    if (!currentProject) return;

    console.log("🎁 Starting download for project:", currentProject.id);
    console.log("🎁 Setting packaging state to true");
    setIsPackaging(true);
    
    try {
      // Use the new ZIP generation endpoint that creates real ZIP files
      const response = await fetch(`/api/projects/${currentProject.id}/download-zip`);
      console.log("🎁 Download response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Download failed: ${response.status} - ${errorText}`);
      }
      
      // Create blob from response and download it directly
      const blob = await response.blob();
      console.log("🎁 Blob created, size:", blob.size);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentProject.title || 'project'}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log("🎁 Download completed successfully");
      toast({
        title: "Download Complete",
        description: "Your project assets have been downloaded successfully.",
      });
    } catch (error) {
      console.error("🎁 Download error:", error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download project assets.",
        variant: "destructive",
      });
    } finally {
      console.log("🎁 Resetting packaging state");
      // Force immediate state update with timeout to ensure React re-renders
      setTimeout(() => {
        setIsPackaging(false);
        console.log("🎁 Packaging state reset completed");
      }, 100);
    }
  };

  // Processing steps for status component
  const processingSteps = [
    {
      id: "upload",
      label: "Image uploaded successfully",
      status: uploadedImage ? "completed" : "pending"
    },
    {
      id: "upscale",
      label: `Upscaling image...`,
      status: projectStatus?.status === "processing" ? "processing" : projectStatus?.upscaledImageUrl ? "completed" : "pending"
    },
    {
      id: "resize",
      label: "Generate print formats",
      status: projectStatus?.resizedImages && projectStatus.resizedImages.length > 0 ? "completed" : "pending"
    },
    {
      id: "mockup",
      label: "Generate 5 professional mockups",
      status: projectStatus?.mockupImageUrl ? "completed" : "pending"
    },
    {
      id: "package",
      label: "Package assets",
      status: projectStatus?.zipUrl ? "completed" : "pending"
    }
  ] as Array<{id: string; label: string; status: "pending" | "processing" | "completed" | "failed"}>;

  // Download items for download component  
  const downloadItems = [
    {
      id: "original",
      label: "Original upscaled image",
      status: projectStatus?.upscaledImageUrl ? "completed" : "pending"
    },
    {
      id: "formats",
      label: "5 print-ready formats",
      status: projectStatus?.resizedImages && projectStatus.resizedImages.length > 0 ? "completed" : "pending"
    },
    {
      id: "mockup",
      label: "5 professional mockups",
      status: projectStatus?.mockupImageUrl ? "completed" : "pending"
    },
    {
      id: "listing",
      label: "Etsy listing text",
      status: projectStatus?.etsyListing ? "completed" : "pending"
    }
  ] as Array<{id: string; label: string; status: "pending" | "processing" | "completed" | "failed"}>;

  const progress = processingSteps.filter(step => step.status === "completed").length / processingSteps.length * 100;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation user={currentUser ? {
        name: currentUser.name,
        avatar: currentUser.avatar || undefined,
        credits: currentUser.credits
      } : undefined} />
      
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex-1">
        <WorkflowProgress currentStep={currentStep} hasActiveProject={!!currentProject} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {!uploadedImage && !showAIGenerator && !showUploadMode && (
              <div className="bg-white rounded-lg shadow-sm p-8">
                <div className="text-center space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900">Start Your Etsy Art Project</h2>
                  <p className="text-gray-600">Choose how you want to begin:</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setShowAIGenerator(true)}
                      className="p-6 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors duration-200 group"
                      data-testid="button-ai-generator"
                    >
                      <div className="flex flex-col items-center space-y-3">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200">
                          <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">Generate AI Art</h3>
                          <p className="text-sm text-gray-500">Create artwork using Google's Imagen 3</p>
                        </div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => {
                        console.log("Upload Your Art button clicked");
                        setShowAIGenerator(false);
                        setShowUploadMode(true);
                      }}
                      className="p-6 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200 group"
                      data-testid="button-upload-mode"
                    >
                      <div className="flex flex-col items-center space-y-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200">
                          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">Upload Your Art</h3>
                          <p className="text-sm text-gray-500">Use existing digital artwork</p>
                        </div>
                      </div>
                    </button>

                    <Link href="/template-mockups">
                      <button
                        className="w-full p-6 border-2 border-dashed border-green-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors duration-200 group"
                        data-testid="button-template-mockups"
                      >
                        <div className="flex flex-col items-center space-y-3">
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200">
                            <Home className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">Template Mockups</h3>
                            <p className="text-sm text-gray-500">5 room templates via API</p>
                          </div>
                        </div>
                      </button>
                    </Link>


                  </div>
                </div>
              </div>
            )}

            {showAIGenerator && !uploadedImage && (
              <AIArtGenerator onArtworkGenerated={handleArtworkGenerated} />
            )}

            {showUploadMode && !uploadedImage && (
              <ImageUpload
                onImageUpload={handleImageUpload}
                uploadedImage={uploadedImage}
                onRemoveImage={handleRemoveImage}
                onGenerateNew={() => {
                  setShowAIGenerator(true);
                  setUploadedImage(undefined);
                  setCurrentStep(0);
                  setShowUploadMode(false);
                }}
              />
            )}



            {uploadedImage && (
              <ImageUpload
                onImageUpload={handleImageUpload}
                uploadedImage={uploadedImage}
                onRemoveImage={() => {
                  handleRemoveImage();
                  setShowUploadMode(false);
                }}
                onGenerateNew={() => {
                  setShowAIGenerator(true);
                  setUploadedImage(undefined);
                  setCurrentStep(0);
                  setShowUploadMode(false);
                }}
              />
            )}

            {uploadedImage && !currentProject && (
              <ProcessingControls
                onStartProcessing={handleStartProcessing}
                disabled={createProjectMutation.isPending}
              />
            )}

            {currentProject && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <button
                  onClick={() => handleProcessProject(currentProject.id)}
                  className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors duration-200"
                >
                  {projectStatus?.status === "completed" ? "Process Again" : "Start Processing"}
                </button>
              </div>
            )}

            <MockupTemplates
              onSelectTemplate={setSelectedTemplate}
              selectedTemplate={selectedTemplate}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <EtsyListingGenerator
              onGenerate={handleGenerateListing}
              generatedListing={projectStatus?.etsyListing || undefined}
              isGenerating={isGeneratingListing}
            />

            {currentProject && (
              <ProcessingStatus
                steps={processingSteps}
                progress={progress}
              />
            )}

            {currentProject && (
              <DownloadAssets
                items={downloadItems}
                onDownload={handleDownload}
                downloadReady={projectStatus?.status === "completed"}
                isPackaging={isPackaging}
              />
            )}
          </div>
        </div>

        {/* Recent Projects */}
        <div className="mt-8">
          {projectsLoading ? (
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Recent Projects
                </h3>
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading your projects...</p>
                </div>
              </div>
            </div>
          ) : (
            <RecentProjects
              projects={projects.map(p => ({
                id: p.id,
                title: p.title,
                createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
                status: p.status,
                thumbnailUrl: p.originalImageUrl
              }))}
              onViewProject={(id) => console.log("View project:", id)}
            />
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
