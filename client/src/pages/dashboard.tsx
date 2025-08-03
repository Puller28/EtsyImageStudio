import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User, Project } from "@shared/schema";

import Navigation from "@/components/navigation";
import WorkflowProgress from "@/components/workflow-progress";
import ImageUpload from "@/components/image-upload";
import ProcessingControls from "@/components/processing-controls";
import MockupTemplates from "@/components/mockup-templates";
import EtsyListingGenerator from "@/components/etsy-listing-generator";
import ProcessingStatus from "@/components/processing-status";
import DownloadAssets from "@/components/download-assets";
import RecentProjects from "@/components/recent-projects";

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
  const { toast } = useToast();

  // Fetch user data
  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // Fetch recent projects
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Poll current project status
  const { data: projectStatus } = useQuery<Project>({
    queryKey: ["/api/projects", currentProject?.id],
    enabled: !!currentProject?.id,
    refetchInterval: 1000, // Always poll every second for active projects
    staleTime: 0, // Always consider data stale
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/projects", {
        method: "POST",
        body: data,
      });
      if (!response.ok) {
        throw new Error("Failed to create project");
      }
      return response.json();
    },
    onSuccess: (project) => {
      setCurrentProject(project);
      setCurrentStep(1);
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project Created",
        description: "Your artwork has been uploaded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload your artwork. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Process project mutation
  const processProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/process`);
      return response.json();
    },
    onSuccess: () => {
      setCurrentStep(2);
      toast({
        title: "Processing Started",
        description: "Your artwork is being processed. This may take a few minutes.",
      });
    },
  });

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
    const preview = URL.createObjectURL(file);
    setUploadedImage({ file, preview });
  };

  const handleRemoveImage = () => {
    if (uploadedImage) {
      URL.revokeObjectURL(uploadedImage.preview);
      setUploadedImage(undefined);
    }
    setCurrentProject(null);
    setCurrentStep(0);
  };

  const handleStartProcessing = async (options: { upscaleOption: "2x" | "4x" }) => {
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

    createProjectMutation.mutate(formData);
  };

  const handleProcessProject = () => {
    if (currentProject) {
      processProjectMutation.mutate(currentProject.id);
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

    try {
      const response = await fetch(`/api/projects/${currentProject.id}/download`);
      if (!response.ok) throw new Error("Download failed");
      
      const data = await response.json();
      if (data.downloadUrl) {
        // Create a link element and trigger download
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = `${currentProject.title || 'project'}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "Download Started",
          description: "Your project assets are being downloaded.",
        });
      }
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download project assets.",
        variant: "destructive",
      });
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
      label: "Create mockup",
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
      label: "Mockup image",
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
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user ? {
        name: user.name,
        avatar: user.avatar || undefined,
        credits: user.credits
      } : undefined} />
      
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <WorkflowProgress currentStep={currentStep} hasActiveProject={!!currentProject} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <ImageUpload
              onImageUpload={handleImageUpload}
              uploadedImage={uploadedImage}
              onRemoveImage={handleRemoveImage}
            />

            {uploadedImage && !currentProject && (
              <ProcessingControls
                onStartProcessing={handleStartProcessing}
                disabled={createProjectMutation.isPending}
              />
            )}

            {currentProject && currentStep < 2 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <button
                  onClick={handleProcessProject}
                  disabled={processProjectMutation.isPending}
                  className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors duration-200 disabled:bg-gray-300"
                >
                  {processProjectMutation.isPending ? "Starting..." : "Start Processing"}
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
              />
            )}
          </div>
        </div>

        {/* Recent Projects */}
        <div className="mt-8">
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
        </div>
      </div>
    </div>
  );
}
