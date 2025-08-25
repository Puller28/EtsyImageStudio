import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Download, ArrowLeft, Clock, CheckCircle, Image, FileText, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import Navigation from "@/components/navigation";
import { Footer } from "@/components/footer";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";

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
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params?.id;
  const [selectedMockup, setSelectedMockup] = useState<string | null>(null);
  const { user: authUser } = useAuth();

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

  // Use auth user data as fallback if API user data is not available
  const currentUser = user || authUser ? {
    name: (user || authUser)?.name || '',
    avatar: (user || authUser)?.avatar || undefined,
    credits: (user || authUser)?.credits || 0
  } : undefined;

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
    if (!project?.zipUrl) {
      // Generate zip file with all assets
      try {
        const response = await fetch(`/api/projects/${projectId}/download`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
        }
      } catch (error) {
        console.error('Download failed:', error);
      }
    } else {
      // Use existing zip URL
      const a = document.createElement('a');
      a.href = project.zipUrl;
      a.download = `${project.title}-assets.zip`;
      a.click();
    }
  };

  const downloadSingleFile = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={currentUser} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading project details...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={currentUser} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h1>
            <p className="text-gray-600 mb-6">The project you're looking for doesn't exist or has been deleted.</p>
            <Link href="/projects">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Projects
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={currentUser} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/projects">
                <Button variant="outline" size="sm">
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
            <Button onClick={handleDownloadAll} size="lg" data-testid="button-download-all">
              <Package className="w-5 h-5 mr-2" />
              Download All Files
            </Button>
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
      <Footer />
    </div>
  );
}