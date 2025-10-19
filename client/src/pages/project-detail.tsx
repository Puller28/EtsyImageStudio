import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Download, ArrowLeft, Clock, CheckCircle, Image, FileText, Package, RefreshCcw, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState, ReactNode, useRef } from "react";
import Navigation from "@/components/navigation";
import { Footer } from "@/components/footer";
import { useAuth } from "@/hooks/useAuth";
import type { User, ProjectAsset } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useWorkspace } from "@/contexts/workspace-context";

interface ProjectDetailPageProps {
  showChrome?: boolean;
}

interface Project {
  id: string;
  title: string;
  originalImageUrl: string;
  upscaledImageUrl?: string;
  mockupImageUrl?: string;
  mockupImages?: { [key: string]: string };
  resizedImages?: Array<{ size: string; url: string }>;
  etsyListing?: {
    title?: string;
    description?: string;
    tags?: string[];
    price?: string;
  };
  upscaleOption: string;
  status: string;
  zipUrl?: string;
  createdAt: Date;
  thumbnailUrl?: string;
  aiPrompt?: string;
  metadata?: any;
  updatedAt?: Date | string;
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

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, power);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[power]}`;
}
export default function ProjectDetailPage({ showChrome = true }: ProjectDetailPageProps = {}) {
  const params = useParams();
  const projectId = params?.id;
  const [, setLocation] = useLocation();
  const [selectedMockup, setSelectedMockup] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { setSelectedProjectId } = useWorkspace();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: project, isLoading, error } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
    retry: false, // Don't retry on 403/404 errors
    refetchInterval: (query) => {
      // Poll every 3 seconds if project is processing
      const data = query.state.data;
      if (data?.status === 'processing' || data?.status === 'ai-generated') {
        return 3000;
      }
      // Stop polling if completed or failed
      return false;
    },
  });

  const { data: assetsResponse, isLoading: assetsLoading } = useQuery<{ assets: ProjectAsset[] }>({
    queryKey: ["/api/projects", projectId, "assets"],
    enabled: !!projectId,
    queryFn: async () => {
      if (!projectId) {
        return { assets: [] };
      }
      const res = await apiRequest("GET", `/api/projects/${projectId}/assets`);
      return res.json() as Promise<{ assets: ProjectAsset[] }>;
    },
  });

  const assets = assetsResponse?.assets ?? [];

  const uploadAssetMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!projectId) throw new Error("No project selected");
      const formData = new FormData();
      formData.append("file", file);
      const token = getAuthToken();
      const response = await fetch(`/api/projects/${projectId}/assets`, {
        method: "POST",
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to upload asset");
      }

      return response.json() as Promise<ProjectAsset>;
    },
    onSuccess: () => {
      toast({ title: "Asset uploaded", description: "File stored in project workspace." });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "assets"] });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error?.message || "Unable to upload asset right now.",
        variant: "destructive",
      });
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (assetId: string) => {
      if (!projectId) throw new Error("No project selected");
      const token = getAuthToken();
      const response = await fetch(`/api/projects/${projectId}/assets/${assetId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to delete asset");
      }
    },
    onSuccess: () => {
      toast({ title: "Asset removed", description: "The file has been deleted." });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "assets"] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error?.message || "Unable to delete asset right now.",
        variant: "destructive",
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) {
        throw new Error("No project selected");
      }

      const response = await apiRequest("DELETE", `/api/projects/${projectId}`);
      return response.json() as Promise<{ success: boolean }>;
    },
    onSuccess: () => {
      toast({
        title: "Project deleted",
        description: "The project and its assets have been removed.",
      });

      setSelectedProjectId(null);
      queryClient.removeQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.removeQueries({ queryKey: ["/api/projects", projectId, "assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setLocation("/workspace/projects");
    },
    onError: (error: any) => {
      toast({
        title: "Deletion failed",
        description: error?.message || "Unable to delete project right now.",
        variant: "destructive",
      });
    },
  });

  // Use auth user data as fallback if API user data is not available
  const baseUser = user || authUser;
  const currentUser = baseUser
    ? {
        name: baseUser.name || "",
        avatar: baseUser.avatar || undefined,
        credits: baseUser.credits || 0,
      }
    : undefined;

  const renderWithChrome = (node: ReactNode) => {
    if (!showChrome) {
      return <div className="min-h-full bg-slate-900/60 text-slate-100">{node}</div>;
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={currentUser} />
        {node}
        <Footer />
      </div>
    );
  };

  // Force refresh project data from server
  const handleRefreshProject = async () => {
    if (!projectId) return;
    
    setIsRefreshing(true);
    try {
      // Clear cached data for this project
      await queryClient.removeQueries({ queryKey: ["/api/projects", projectId] });
      
      // Fetch fresh data with cache bust
      const response = await fetch(`/api/projects/${projectId}?refresh=true`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
      });
      
      if (response.ok) {
        const freshData = await response.json();
        // Update cache with fresh data
        queryClient.setQueryData(["/api/projects", projectId], freshData);
        console.log('🔄 Project data refreshed successfully');
      }
    } catch (error) {
      console.error('❌ Failed to refresh project data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const handleDownloadAll = async () => {
    setIsDownloading(true);
    try {
      if (!project?.zipUrl) {
        // Generate zip file with all assets
        console.log('🎁 Starting zip generation for project:', projectId);
        const response = await fetch(`/api/projects/${projectId}/download`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${project?.title || 'project'}-assets.zip`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          console.log('✅ Zip download completed successfully');
        } else {
          console.error('❌ Download failed with status:', response.status);
        }
      } else {
        // Use existing zip URL
        console.log('🎁 Using existing zip URL for download');
        const a = document.createElement('a');
        a.href = project.zipUrl;
        a.download = `${project.title}-assets.zip`;
        a.click();
        console.log('✅ Direct zip download completed successfully');
      }
    } catch (error) {
      console.error('❌ Download failed:', error);
    } finally {
      // Always reset the loading state
      setIsDownloading(false);
      console.log('🔄 Download state reset');
    }
  };

  const downloadSingleFile = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  if (isLoading) {
    return renderWithChrome(
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-500"></div>
          <p className="mt-4 text-slate-300">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return renderWithChrome(
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white mb-4">Project not found</h1>
          <p className="text-sm text-slate-400 mb-6">
            The project you're looking for doesn't exist or has been deleted.
          </p>
          <Link href="/workspace/projects">
            <Button className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to projects
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Safely get mockup keys with error handling for large objects
  const mockupKeys = (() => {
    try {
      return project.mockupImages && typeof project.mockupImages === 'object' 
        ? Object.keys(project.mockupImages) 
        : [];
    } catch (error) {
      console.warn('Could not enumerate mockup keys:', error);
      return [];
    }
  })();
  
  // Initialize selectedMockup with first mockup key if not set and mockups exist
  const effectiveSelectedMockup = selectedMockup || (mockupKeys.length > 0 ? mockupKeys[0] : null);
  
  const displayMockup = effectiveSelectedMockup && project.mockupImages?.[effectiveSelectedMockup] 
    ? project.mockupImages[effectiveSelectedMockup] 
    : project.mockupImageUrl;

  // Transform resized images to handle both old and new formats  
  const normalizedResizedImages: Array<{ size: string; url: string }> = (() => {
    if (!project.resizedImages || !Array.isArray(project.resizedImages) || project.resizedImages.length === 0) {
      return [];
    }
    
    // Check if first item is an object with size/url or just a URL string
    const firstItem = project.resizedImages[0];
    if (typeof firstItem === 'object' && firstItem !== null && 'size' in firstItem) {
      // Already in new format
      return project.resizedImages as Array<{ size: string; url: string }>;
    } else {
      // Transform old format (array of URLs) to new format
      const formats = ['4x5', '3x4', '2x3', '11x14', 'A4'];
      return (project.resizedImages as unknown as string[]).map((url, index) => ({
        size: formats[index] || `Format ${index + 1}`,
        url: String(url)
      }));
    }
  })();

  return renderWithChrome(
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/projects">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 disabled:border-indigo-100 disabled:bg-indigo-50 disabled:text-indigo-300"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Projects
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
                <div className="flex items-center space-x-4 mt-2">
                  <Badge variant={project.status === 'completed' ? 'default' : 'secondary'}>
                    {project.status === 'completed' ? (
                      <CheckCircle className="w-3 h-3 mr-1" />
                    ) : (
                      <Clock className="w-3 h-3 mr-1" />
                    )}
                    {project.status}
                  </Badge>
                  <span className="text-gray-500 text-sm">
                    Created {formatDate(project.createdAt)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deleteProjectMutation.isPending}
                    className="border-red-400/40 text-red-500 hover:bg-red-500/10 hover:text-red-400 disabled:border-red-200 disabled:text-red-300"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deleteProjectMutation.isPending ? "Deleting..." : "Delete Project"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="border border-slate-700 bg-slate-900 text-slate-100">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove the project, its generated assets, and history. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-slate-800 text-slate-200 hover:bg-slate-700">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteProjectMutation.mutate()}
                      className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
                      disabled={deleteProjectMutation.isPending}
                    >
                      {deleteProjectMutation.isPending ? "Deleting..." : "Delete project"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                onClick={handleRefreshProject}
                variant="outline"
                disabled={isRefreshing}
                data-testid="button-refresh-project"
                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 disabled:border-indigo-100 disabled:bg-indigo-50 disabled:text-indigo-300"
              >
                <RefreshCcw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? "Refreshing..." : "Refresh Data"}
              </Button>
              <Button
                onClick={handleDownloadAll}
                size="lg"
                disabled={isDownloading}
                data-testid="button-download-all"
              >
                {isDownloading ? (
                  <>
                    <RefreshCcw className="w-5 h-5 mr-2 animate-spin" />
                    Preparing Download...
                  </>
                ) : (
                  <>
                    <Package className="w-5 h-5 mr-2" />
                    Download All Files
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Images */}
          <div className="space-y-6">
            {/* Original Image */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Image className="w-5 h-5 mr-2" />
                  Original Image
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
                  <img
                    src={project.originalImageUrl}
                    alt="Original artwork"
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => downloadSingleFile(project.originalImageUrl, `${project.title}-original.jpg`)}
                  data-testid="button-download-original"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Original
                </Button>
              </CardContent>
            </Card>

            {/* Upscaled Image */}
            {project.upscaledImageUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Image className="w-5 h-5 mr-2" />
                    Upscaled Image ({project.upscaleOption})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
                    <img
                      src={project.upscaledImageUrl}
                      alt="Upscaled artwork"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => downloadSingleFile(project.upscaledImageUrl!, `${project.title}-upscaled-${project.upscaleOption}.jpg`)}
                    data-testid="button-download-upscaled"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Upscaled
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Mockup Images */}
            {(displayMockup || (project.mockupImages && mockupKeys.length > 0)) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Image className="w-5 h-5 mr-2" />
                    Mockup Images
                    {mockupKeys.length > 1 && (
                      <Badge variant="secondary" className="ml-2">{mockupKeys.length}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {displayMockup ? (
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
                      <img
                        src={displayMockup}
                        alt="Mockup"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.warn('Mockup image failed to load:', displayMockup);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                      <div className="text-center text-gray-500">
                        <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No mockups generated yet</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Mockup Selection */}
                  {mockupKeys.length > 1 && (
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {mockupKeys.map((key) => (
                        <button
                          key={key}
                          onClick={() => setSelectedMockup(key)}
                          className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                            effectiveSelectedMockup === key ? 'border-indigo-500' : 'border-gray-200'
                          }`}
                        >
                          <img
                            src={project.mockupImages![key]}
                            alt={`Mockup ${key}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.warn('Mockup thumbnail failed to load:', key, project.mockupImages![key]);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    {displayMockup && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => downloadSingleFile(displayMockup, `${project.title}-mockup.jpg`)}
                        data-testid="button-download-mockup"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Current
                      </Button>
                    )}
                    {mockupKeys.length > 1 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          mockupKeys.forEach((key) => {
                            downloadSingleFile(project.mockupImages![key], `${project.title}-mockup-${key}.jpg`);
                          });
                        }}
                        data-testid="button-download-all-mockups"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download All Mockups
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Etsy Listing & Details */}
          <div className="space-y-6">
            {/* Etsy Listing */}
            {project.etsyListing && Object.keys(project.etsyListing).length > 0 && (project.etsyListing.title || project.etsyListing.description || (project.etsyListing.tags && project.etsyListing.tags.length > 0) || project.etsyListing.price) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Etsy Listing Content
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {project.etsyListing.title && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Title</h4>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{project.etsyListing.title}</p>
                    </div>
                  )}
                  
                  {project.etsyListing.description && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                      <div className="text-gray-700 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap max-h-64 overflow-y-auto">
                        {project.etsyListing.description}
                      </div>
                    </div>
                  )}
                  
                  {project.etsyListing?.tags && Array.isArray(project.etsyListing.tags) && project.etsyListing.tags.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {(Array.isArray(project.etsyListing?.tags) ? project.etsyListing.tags : []).map((tag, index) => (
                          <Badge key={index} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {project.etsyListing.price && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Suggested Price</h4>
                      <p className="text-2xl font-bold text-green-600">{project.etsyListing.price}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Print-Ready Sizes */}
            {normalizedResizedImages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Image className="w-5 h-5 mr-2" />
                    Print-Ready Sizes
                    <Badge variant="secondary" className="ml-2">{normalizedResizedImages.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {normalizedResizedImages.map((resized, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex flex-col">
                          <span className="font-medium">{resized.size}</span>
                          <span className="text-sm text-gray-500">Print format</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => downloadSingleFile(resized.url, `${project.title}-${resized.size}.jpg`)}
                          data-testid={`button-download-size-${resized.size}`}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Project Details */}
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant={project.status === 'completed' ? 'default' : 'secondary'}>
                    {project.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Upscale Option:</span>
                  <span className="font-medium">{project.upscaleOption}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium">{formatDate(project.createdAt)}</span>
                </div>
                {project.aiPrompt && (
                  <div>
                    <span className="text-gray-600">AI Prompt:</span>
                    <p className="mt-1 text-sm bg-gray-50 p-2 rounded">{project.aiPrompt}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
}






