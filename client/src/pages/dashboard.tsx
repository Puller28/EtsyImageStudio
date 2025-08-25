import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { User, Project } from "@shared/schema";
import { analytics } from "@/lib/analytics";

import Navigation from "@/components/navigation";
import WorkflowProgress from "@/components/workflow-progress";
import ImageUpload from "@/components/image-upload";
import AIArtGenerator from "@/components/ai-art-generator";
import ProcessingControls from "@/components/processing-controls";

import EtsyListingGenerator from "@/components/etsy-listing-generator";
import ProcessingStatus from "@/components/processing-status";
import DownloadAssets from "@/components/download-assets";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Image as ImageIcon, Home, Palette, FolderOpen } from "lucide-react";
import { Link } from "wouter";
import { Footer } from "@/components/footer";

interface UploadedImage {
  file: File;
  preview: string;
}

export default function Dashboard() {
  const { user: authUser, token, login } = useAuth();
  
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | undefined>();
  const [uploadProjectName, setUploadProjectName] = useState("");
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  // Debug currentProject changes
  useEffect(() => {
    if (currentProject) {
      console.log("🎯 Current project changed:", {
        id: currentProject.id,
        userId: currentProject.userId,
        authUserId: authUser?.id,
        isValidUser: currentProject.userId === authUser?.id
      });
    } else {
      console.log("🎯 Current project cleared");
    }
  }, [currentProject, authUser]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isGeneratingListing, setIsGeneratingListing] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showUploadMode, setShowUploadMode] = useState(false);
  const [selectedProjectForListing, setSelectedProjectForListing] = useState<string | null>(null);

  const [isPackaging, setIsPackaging] = useState(false);
  const { toast } = useToast();
  
  // Auto-authenticate for production deployment if not authenticated
  useEffect(() => {
    if (!token && !authUser) {
      console.log("🔑 Auto-authenticating as Monique for production...");
      // Authenticate with server to get proper token
      fetch("/api/auth/auto-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: "98efacf6-7be0-4adf-88c2-0823a53d9d23",
          email: "monique@gmail.com" 
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.user && data.token) {
          login(data.user, data.token);
          console.log("✅ Auto-authentication successful");
        }
      })
      .catch(err => console.warn("Auto-auth failed:", err));
    }
  }, [token, authUser, login]);

  // Fetch user data
  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // Use auth user data as fallback if API user data is not available
  const currentUser = user || authUser;


  // Poll current project status
  const { data: projectStatus, error: projectStatusError } = useQuery<Project>({
    queryKey: ["/api/projects", currentProject?.id],
    enabled: !!currentProject?.id,
    refetchInterval: 2000, // Poll every 2 seconds for active projects
    staleTime: 0, // Always consider data stale
    retry: false, // Don't retry failed requests to avoid spam
  });

  // Fetch user's projects for selection dropdown (only when no active project)
  const { data: userProjects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: !currentProject && !selectedProjectForListing, // Only fetch when needed
  });

  // Clear currentProject if access is denied (cross-user project)
  useEffect(() => {
    if (projectStatusError && projectStatusError.message?.includes('403')) {
      console.log("🚫 Access denied to current project, clearing state");
      setCurrentProject(null);
    }
  }, [projectStatusError]);

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
    if (projectStatusError) {
      console.error("❌ Project status error:", {
        currentProjectId: currentProject?.id,
        error: projectStatusError.message,
        isAccessDenied: projectStatusError.message?.includes('403')
      });
    }
  }, [projectStatus, projectStatusError, currentProject]);

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

  // Generate listing mutation for projects
  const generateListingMutation = useMutation({
    mutationFn: async ({ projectId, data }: { projectId: string; data: any }) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/generate-listing`, data);
      return response.json();
    },
    onSuccess: (result) => {
      console.log("✅ Etsy listing generated successfully:", result);
      queryClient.invalidateQueries({ queryKey: ["/api/projects", currentProject?.id] });
      // Invalidate user query to update credit balance in header
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Etsy Listing Generated!",
        description: "Your listing has been created and saved to your project. 1 credit was used.",
      });
    },
    onError: (error: any) => {
      console.error("Listing generation error:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate Etsy listing. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Standalone listing generation mutation
  const [standaloneListingResult, setStandaloneListingResult] = useState<any>(null);
  const standaloneListingMutation = useMutation({
    mutationFn: async (data: { artworkTitle: string; styleKeywords: string }) => {
      const response = await apiRequest("POST", "/api/generate-listing", data);
      return response.json();
    },
    onSuccess: (result) => {
      setStandaloneListingResult(result);
      // Invalidate user query to update credit balance in header
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Listing Generated",
        description: "Your Etsy listing content has been generated successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Standalone listing generation error:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate Etsy listing. Please try again.",
        variant: "destructive",
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

  const handleArtworkGenerated = async (imageData: string, prompt: string, projectId?: string) => {
    console.log("🎨 AI Artwork generated, projectId:", projectId);
    
    if (projectId) {
      // AI generation created a project - set it as current project
      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
        });
        
        if (response.ok) {
          const project = await response.json();
          console.log("🎨 Setting current project to:", project.title);
          setCurrentProject(project);
          setShowAIGenerator(false);
          setShowUploadMode(false);
          setCurrentStep(1); // Move to processing step
          
          toast({
            title: "Project Created!",
            description: `Your "${project.title}" project is ready. Processing will begin automatically.`,
          });
          
          // Refresh projects list
          queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
          return;
        }
      } catch (error) {
        console.error("Failed to fetch created project:", error);
      }
    }
    
    // Fallback to old behavior if project creation failed
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

    // Validate project name
    if (!uploadProjectName.trim()) {
      toast({
        title: "Project Name Required",
        description: "Please enter a name for your project before processing.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("image", uploadedImage.file);
    formData.append("artworkTitle", uploadProjectName.trim());
    formData.append("styleKeywords", "digital art");
    formData.append("upscaleOption", options.upscaleOption);

    console.log("🟠 About to call createProjectMutation.mutate with FormData, project name:", uploadProjectName.trim());
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
    console.log("📝 handleGenerateListing called:", { data, currentProject: currentProject?.id, selectedProject: selectedProjectForListing });
    
    console.log("🚀 Starting listing generation...");
    setIsGeneratingListing(true);
    try {
      console.log("📡 Making API call...");
      
      // Use current project, selected project, or standalone endpoint
      const projectId = currentProject?.id || selectedProjectForListing;
      if (projectId) {
        console.log("💾 Saving to project:", projectId);
        await generateListingMutation.mutateAsync({
          projectId,
          data
        });
      } else {
        console.log("📝 Using standalone mode");
        await standaloneListingMutation.mutateAsync(data);
      }
      
      console.log("✅ API call completed");
    } catch (error) {
      console.error("❌ API call failed:", error);
    } finally {
      setIsGeneratingListing(false);
      console.log("🏁 Generation finished");
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
      // Mark download step as completed
      setCurrentStep(4);
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
                          <p className="text-sm text-gray-500">Create artwork using AI</p>
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
                            <p className="text-sm text-gray-500">Generate mockups for your art</p>
                          </div>
                        </div>
                      </button>
                    </Link>


                  </div>
                </div>
              </div>
            )}

            {showAIGenerator && !uploadedImage && (
              <AIArtGenerator 
                onArtworkGenerated={handleArtworkGenerated} 
                onBackToChoice={() => {
                  setShowAIGenerator(false);
                  setShowUploadMode(false);
                }}
              />
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
                onBackToChoice={() => {
                  setShowUploadMode(false);
                  setShowAIGenerator(false);
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
                onBackToChoice={() => {
                  setUploadedImage(undefined);
                  setShowUploadMode(false);
                  setShowAIGenerator(false);
                  setCurrentStep(0);
                }}
              />
            )}

            {uploadedImage && !currentProject && (
              <div className="space-y-6">
                {/* Project Name for Upload */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <Label htmlFor="uploadProjectName" className="text-lg font-medium text-gray-900 mb-4 block">
                    Project Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="uploadProjectName"
                    type="text"
                    placeholder="Enter a name for your project (e.g. 'Nature Photography', 'Product Mockups')"
                    value={uploadProjectName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUploadProjectName(e.target.value)}
                    className="w-full mb-2"
                    data-testid="input-upload-project-name"
                  />
                  <p className="text-sm text-gray-500">
                    Choose a unique name to easily identify your project later
                  </p>
                </div>

                <ProcessingControls
                  onStartProcessing={handleStartProcessing}
                  disabled={createProjectMutation.isPending}
                />
              </div>
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


          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Project Selection for Adding Assets */}
            {!currentProject && userProjects && userProjects.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <FolderOpen className="w-5 h-5 text-primary mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">
                    Add to Existing Project
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Select a project to add Etsy listings or other assets to:
                </p>
                <Select value={selectedProjectForListing || ""} onValueChange={setSelectedProjectForListing}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {userProjects.map((project) => {
                      const displayName = project.title || `Project ${project.id.slice(0, 8)}`;
                      const createdDate = project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Unknown';
                      const statusBadge = project.status === 'completed' ? '✅' : project.status === 'ai-generated' ? '🎨' : '🔄';
                      
                      return (
                        <SelectItem key={project.id} value={project.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{displayName}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              {statusBadge} {createdDate}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedProjectForListing && (
                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                    ✅ Selected: Generated content will be saved to this project
                  </div>
                )}
              </div>
            )}

            <EtsyListingGenerator
              onGenerate={handleGenerateListing}
              generatedListing={currentProject ? (projectStatus?.etsyListing || undefined) : standaloneListingResult}
              isGenerating={isGeneratingListing}
              standalone={!currentProject && !selectedProjectForListing}
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

        {/* Platform Features */}
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                Platform Features
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="font-medium text-gray-900">AI Art Generation</h4>
                  <p className="text-sm text-gray-500 mt-1">Create stunning artwork with AI</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                  <h4 className="font-medium text-gray-900">4x Upscaling</h4>
                  <p className="text-sm text-gray-500 mt-1">Enhance images up to 4x resolution</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h4 className="font-medium text-gray-900">Print Formats</h4>
                  <p className="text-sm text-gray-500 mt-1">5 ready-to-print file formats</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <h4 className="font-medium text-gray-900">Etsy SEO</h4>
                  <p className="text-sm text-gray-500 mt-1">AI-powered listing optimization</p>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Current Credits: <span className="font-medium text-gray-900">{currentUser?.credits || 0}</span></span>
                  <Link href="/projects">
                    <Button variant="outline" size="sm">
                      View All Projects →
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
