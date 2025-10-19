import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Loader2 } from "lucide-react";
import ImageUpload from "@/components/image-upload";
import { TemplateSelector } from "@/components/template-selector";
import { MockupResults } from "@/components/mockup-results";
import Navigation from "@/components/navigation";
import { Footer } from "@/components/footer";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { User, Project } from "@shared/schema";
import { analytics } from "@/lib/analytics";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useWorkspace } from "@/contexts/workspace-context";

interface GeneratedMockup {
  template: {
    room: string;
    id: string;
    name: string;
  };
  image_data: string;
}

interface MockupPageProps {
  showChrome?: boolean;
  inWorkflow?: boolean; // Whether we're in the workflow (show next steps after mockup generation)
  onMockupsComplete?: () => void; // Callback when mockups are successfully generated
}

function getProjectPreviewUrl(project: Project): string | null {
  // Prefer original or thumbnail for faster loading (not the huge upscaled version!)
  // The mockup generator will handle the quality
  if (project.originalImageUrl) {
    return project.originalImageUrl;
  }

  if (project.thumbnailUrl) {
    return project.thumbnailUrl;
  }

  // Only use upscaled if nothing else available (it's huge and slow)
  if (project.upscaledImageUrl) {
    return project.upscaledImageUrl;
  }

  if (Array.isArray(project.resizedImages) && project.resizedImages.length > 0) {
    const firstWithUrl = project.resizedImages.find((asset) => asset?.url);
    if (firstWithUrl?.url) {
      return firstWithUrl.url;
    }
  }

  return null;
}

function hasProjectArtwork(project: Project): boolean {
  // For lightweight list data, check summary flags
  if (project.hasOriginalImage || project.hasUpscaledImage) {
    return true;
  }
  
  // For full project data, check actual URLs
  return Boolean(getProjectPreviewUrl(project));
}

function formatProjectDate(value?: string | Date | null): string {
  if (!value) {
    return "Unknown date";
  }
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }
  return date.toLocaleDateString();
}

export function MockupPage({ showChrome = true, inWorkflow = false, onMockupsComplete }: MockupPageProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [generatedMockups, setGeneratedMockups] = useState<GeneratedMockup[]>([]);
  const [isProjectPickerOpen, setProjectPickerOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [importingProjectId, setImportingProjectId] = useState<string | null>(null);
  const [sourceProjectId, setSourceProjectId] = useState<string | null>(null); // Track which project the artwork came from
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false); // Track if we've auto-loaded the workflow project

  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const { selectedProjectId } = useWorkspace();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const currentUser = user || authUser;

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const projectOptions = useMemo(() => {
    return (projects || [])
      .filter((project) => hasProjectArtwork(project))
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  }, [projects]);

  const filteredProjectOptions = useMemo(() => {
    if (!projectSearch.trim()) {
      return projectOptions;
    }
    const query = projectSearch.trim().toLowerCase();
    return projectOptions.filter((project) => (project.title || "").toLowerCase().includes(query));
  }, [projectOptions, projectSearch]);

  const navUser = currentUser
    ? {
        name: currentUser.name,
        avatar: currentUser.avatar || undefined,
        credits: currentUser.credits,
      }
    : undefined;

  const handleFileUpload = (file: File) => {
    analytics.imageUpload(file.size, file.type);
    analytics.funnelStep("mockup_image_upload", 1);

    if (uploadedImageUrl) {
      URL.revokeObjectURL(uploadedImageUrl);
    }
    setGeneratedMockups([]);
    setUploadedFile(file);
    setUploadedImageUrl(URL.createObjectURL(file));
  };

  const handleUseProjectArtwork = async (project: Project) => {
    try {
      setImportingProjectId(project.id);
      
      // Fetch full project data (list view doesn't include image URLs)
      const fullProjectResponse = await apiRequest("GET", `/api/projects/${project.id}`);
      const fullProject: Project = await fullProjectResponse.json();
      const previewUrl = getProjectPreviewUrl(fullProject);
      
      if (!previewUrl) {
        toast({
          title: "No artwork found",
          description: "This project doesn't have an image we can reuse yet.",
          variant: "destructive",
        });
        return;
      }

      // Download the image in the background with streaming
      // Using fetch with proper headers for faster download
      const response = await fetch(previewUrl, {
        method: 'GET',
        headers: {
          'Accept': 'image/*',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Fetch failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const extension = blob.type.includes("png") ? "png" : "jpg";
      const safeTitle = (project.title || "project-artwork")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const fileName = `${safeTitle || "project-artwork"}-${project.id.slice(0, 8)}.${extension}`;
      const file = new File([blob], fileName, { type: blob.type || "image/jpeg" });

      handleFileUpload(file);
      setSourceProjectId(project.id); // Remember which project this artwork came from
      setProjectPickerOpen(false);
      
      toast({
        title: "Artwork selected",
        description: `Using the image from "${project.title || "Untitled project"}". Mockups will be added to this project.`,
      });
    } catch (error) {
      console.error("Failed to reuse project artwork:", error);
      toast({
        title: "Unable to load artwork",
        description: "We couldn't fetch that project image. Try another project or upload a file manually.",
        variant: "destructive",
      });
    } finally {
      setImportingProjectId(null);
    }
  };

  const handleMockupsGenerated = (mockups: GeneratedMockup[]) => {
    analytics.mockupComplete(mockups.length, 0);
    analytics.funnelStep("mockup_generation_complete", 3);
    setGeneratedMockups(mockups);
    
    // Notify workflow that mockups are complete
    if (onMockupsComplete) {
      console.log('✅ Mockups generated, notifying workflow');
      onMockupsComplete();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReset = () => {
    setGeneratedMockups([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStartOver = () => {
    if (uploadedImageUrl) {
      URL.revokeObjectURL(uploadedImageUrl);
    }
    setUploadedFile(null);
    setUploadedImageUrl("");
    setGeneratedMockups([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    return () => {
      if (uploadedImageUrl) {
        URL.revokeObjectURL(uploadedImageUrl);
      }
    };
  }, [uploadedImageUrl]);

  useEffect(() => {
    if (!isProjectPickerOpen) {
      setProjectSearch("");
      setImportingProjectId(null);
    }
  }, [isProjectPickerOpen]);

  // Auto-load selected project's artwork when in workflow mode
  useEffect(() => {
    if (inWorkflow && selectedProjectId && !hasAutoLoaded && projects.length > 0) {
      const project = projects.find(p => p.id === selectedProjectId);
      if (project && hasProjectArtwork(project)) {
        console.log('🎨 Auto-loading artwork from workflow project:', project.id);
        setHasAutoLoaded(true);
        handleUseProjectArtwork(project);
      }
    }
  }, [inWorkflow, selectedProjectId, hasAutoLoaded, projects]);

  const hasUploadedImage = Boolean(uploadedFile);
  const showResults = generatedMockups.length > 0;

  const content = (
    <main className="flex-1 container mx-auto py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {showResults ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={handleReset} data-testid="button-back">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Select Different Templates
                </Button>
                {!inWorkflow && (
                  <Button variant="ghost" onClick={handleStartOver} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Upload New Artwork
                  </Button>
                )}
              </div>
              {uploadedImageUrl && (
                <div className="flex items-center space-x-3 bg-muted/40 px-3 py-2 rounded-md border">
                  <img
                    src={uploadedImageUrl}
                    alt="Uploaded artwork"
                    className="w-12 h-12 object-cover rounded border"
                  />
                  <div>
                    <p className="text-sm font-medium">{uploadedFile?.name}</p>
                    <p className="text-xs text-muted-foreground">Ready for additional mockups</p>
                  </div>
                </div>
              )}
            </div>
            <MockupResults mockups={generatedMockups} onReset={handleReset} inWorkflow={inWorkflow} />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">
                Pick your mockup rooms, then upload your artwork
              </h1>
              <p className="text-muted-foreground max-w-2xl">
                Browse every mockup style before committing to an upload. Select the rooms you love, add your artwork,
                and generate polished previews in one go.
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <ImageUpload
                onImageUpload={handleFileUpload}
                uploadedImage={
                  uploadedFile
                    ? {
                        file: uploadedFile,
                        preview: uploadedImageUrl,
                      }
                    : undefined
                }
                onRemoveImage={() => {
                  if (uploadedImageUrl) {
                    URL.revokeObjectURL(uploadedImageUrl);
                  }
                  setUploadedFile(null);
                  setUploadedImageUrl("");
                }}
                onOpenProjectPicker={() => setProjectPickerOpen(true)}
              />
              <TemplateSelector 
                uploadedFile={uploadedFile} 
                onMockupsGenerated={handleMockupsGenerated}
                sourceProjectId={sourceProjectId}
              />
            </div>
            {hasUploadedImage && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Next step:</span>
                Choose up to 10 templates and click Generate to place your uploaded artwork.
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={isProjectPickerOpen} onOpenChange={setProjectPickerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Use artwork from an existing project</DialogTitle>
            <DialogDescription>
              Reuse any uploaded or upscaled artwork without leaving the mockup tool.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {projectOptions.length > 0 && (
              <Input
                placeholder="Search projects"
                value={projectSearch}
                onChange={(event) => setProjectSearch(event.target.value)}
              />
            )}
            {projectsLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Loading your projects...</div>
            ) : projectOptions.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                You don't have any projects with artwork yet. Upload a file to get started.
              </div>
            ) : filteredProjectOptions.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No projects found for "{projectSearch}".
              </div>
            ) : (
              <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {filteredProjectOptions.map((project) => {
                  const previewUrl = getProjectPreviewUrl(project);
                  const isUsingThis = importingProjectId === project.id;

                  return (
                    <div
                      key={project.id}
                      className="flex items-center gap-4 rounded-lg border border-muted bg-muted/10 p-3 transition hover:border-primary/60 hover:bg-primary/5"
                    >
                      <div className="h-16 w-16 overflow-hidden rounded-md border bg-muted">
                        {previewUrl ? (
                          <img src={previewUrl} alt={project.title || "Project artwork"} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                            No preview
                          </div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <p className="truncate text-sm font-medium text-foreground">{project.title || "Untitled project"}</p>
                        <p className="text-xs text-muted-foreground">
                          {(project.status || "pending").toUpperCase()} - {formatProjectDate(project.createdAt)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        type="button"
                        onClick={() => handleUseProjectArtwork(project)}
                        disabled={isUsingThis}
                        className="shrink-0"
                      >
                        {isUsingThis ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          "Use artwork"
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );

  if (!showChrome) {
    return <div className="flex flex-col min-h-full">{content}</div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation user={navUser} />
      {content}
      <Footer />
    </div>
  );
}
