import { useEffect, useMemo, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { History, Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link, useLocation } from "wouter";
import Navigation from "@/components/navigation";
import { Footer } from "@/components/footer";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import type { Project, User } from "@shared/schema";
import { SEOHead } from "@/components/seo-head";
import { useToast } from "@/hooks/use-toast";

interface ProjectsPageProps {
  showChrome?: boolean;
  onCreateProject?: () => void;
  onSelectProject?: (projectId: string) => void;
}

type ProjectSummary = {
  hasOriginalImage?: boolean;
  hasMockupImages?: boolean;
  hasResizedImages?: boolean;
  hasEtsyListing?: boolean;
  hasUpscaledImage?: boolean;
  mockupCount?: number;
  resizedCount?: number;
};

const getProjectSummary = (project: Project): ProjectSummary => {
  const rawSummary = (project.metadata as Record<string, unknown> | undefined)?.summary;
  const summaryFromMetadata =
    rawSummary && typeof rawSummary === "object" ? (rawSummary as ProjectSummary) : {};

  return {
    hasOriginalImage: project.hasOriginalImage ?? summaryFromMetadata.hasOriginalImage,
    hasMockupImages: project.hasMockupImages ?? summaryFromMetadata.hasMockupImages,
    hasResizedImages: project.hasResizedImages ?? summaryFromMetadata.hasResizedImages,
    hasEtsyListing: project.hasEtsyListing ?? summaryFromMetadata.hasEtsyListing,
    hasUpscaledImage: project.hasUpscaledImage ?? summaryFromMetadata.hasUpscaledImage,
    mockupCount: project.mockupCount ?? summaryFromMetadata.mockupCount,
    resizedCount: project.resizedCount ?? summaryFromMetadata.resizedCount,
  };
};

const formatDate = (value: Date | string | null | undefined) => {
  if (!value) {
    return "Unknown date";
  }

  try {
    const input = typeof value === "string" ? new Date(value) : value;
    const now = new Date();
    const diff = now.getTime() - input.getTime();
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
      return "Today";
    }
    if (diffDays === 1) {
      return "1 day ago";
    }
    if (diffDays < 7) {
      return `${diffDays} days ago`;
    }
    const diffWeeks = Math.ceil(diffDays / 7);
    return diffWeeks === 1 ? "1 week ago" : `${diffWeeks} weeks ago`;
  } catch {
    return "Unknown date";
  }
};

export default function ProjectsPage({
  showChrome = true,
  onCreateProject,
  onSelectProject,
}: ProjectsPageProps = {}) {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const previousProjectsRef = useRef<Project[]>([]);

  useEffect(() => {
    const metaRobots = document.querySelector('meta[name="robots"]');
    if (metaRobots) {
      metaRobots.setAttribute("content", "noindex,nofollow");
    } else {
      const newMeta = document.createElement("meta");
      newMeta.setAttribute("name", "robots");
      newMeta.setAttribute("content", "noindex,nofollow");
      document.head.appendChild(newMeta);
    }
    return () => {
      const existing = document.querySelector('meta[name="robots"]');
      if (existing) {
        existing.remove();
      }
    };
  }, []);

  const { data: user } = useQuery<User>({ queryKey: ["/api/user"] });

  const { data: projects = [], isLoading, error, dataUpdatedAt } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/projects");
      return res.json() as Promise<Project[]>;
    },
    staleTime: 30_000,
    refetchInterval: (query) => {
      const data = query.state.data as Project[] | undefined;
      const hasProcessing = data?.some(
        (project) => 
          project.status === "processing" || 
          project.status === "ai-generated" ||
          project.status === "uploading"
      );
      // Poll every 3 seconds if there are active projects, otherwise don't poll
      return hasProcessing ? 3000 : false;
    },
    refetchIntervalInBackground: true, // Continue polling even when tab is not focused
  });

  const generateThumbnailMutation = useMutation({
    mutationFn: async (projectId: string) => {
      return apiRequest("POST", `/api/projects/${projectId}/generate-thumbnail`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  useEffect(() => {
    if (!projects.length || generateThumbnailMutation.isPending) {
      return;
    }
    const needsThumbnail = projects.find(
      (project) =>
        project.status === "completed" &&
        project.originalImageUrl?.startsWith("data:image/") &&
        !project.thumbnailUrl
    );
    if (needsThumbnail) {
      generateThumbnailMutation.mutate(needsThumbnail.id);
    }
  }, [projects, generateThumbnailMutation.isPending]);

  // Detect when projects complete processing and show notification
  useEffect(() => {
    if (previousProjectsRef.current.length === 0) {
      previousProjectsRef.current = projects;
      return;
    }

    // Check if any project just completed
    projects.forEach((currentProject) => {
      const previousProject = previousProjectsRef.current.find(p => p.id === currentProject.id);
      
      if (previousProject && 
          (previousProject.status === "processing" || previousProject.status === "uploading") &&
          currentProject.status === "completed") {
        toast({
          title: "✅ Project Ready!",
          description: `"${currentProject.title}" has finished processing and is ready to download.`,
          duration: 5000,
        });
      }
    });

    previousProjectsRef.current = projects;
  }, [projects, toast]);

  const currentUser = user || authUser
    ? {
        ...(user || authUser)!,
        avatar: (user || authUser)?.avatar || undefined,
      }
    : undefined;

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const title = project.title?.toLowerCase() || "";
      const status = project.status?.toLowerCase() || "";
      const term = searchTerm.trim().toLowerCase();

      const matchesSearch = term === "" || title.includes(term);
      const matchesStatus = statusFilter === "all" || status === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchTerm, statusFilter]);

  const totalMockups = useMemo(() => {
    return projects.reduce((count, project) => {
      const summary = getProjectSummary(project);
      const fromSummary = project.mockupCount ?? summary.mockupCount;
      if (typeof fromSummary === "number") {
        return count + fromSummary;
      }
      if (Array.isArray(project.mockupImages)) {
        return count + project.mockupImages.length;
      }
      return count + Object.keys(project.mockupImages || {}).length;
    }, 0);
  }, [projects]);

  const totalPrintFormats = useMemo(() => {
    return projects.reduce((count, project) => {
      const summary = getProjectSummary(project);
      const fromSummary = project.resizedCount ?? summary.resizedCount;
      if (typeof fromSummary === "number") {
        return count + fromSummary;
      }
      return count + (project.resizedImages?.length || 0);
    }, 0);
  }, [projects]);

  const handleViewProject = (projectId: string) => {
    if (onSelectProject) {
      onSelectProject(projectId);
      return;
    }
    setLocation(`/projects/${projectId}`);
  };

  const handleCreateProject = () => {
    onCreateProject ? onCreateProject() : setLocation("/tools/upscale");
  };

  const renderProjectCard = (project: Project) => {
    const summary = getProjectSummary(project);
    const mockupCountCandidate = summary.mockupCount ?? project.mockupCount;
    const mockupCount =
      typeof mockupCountCandidate === "number"
        ? mockupCountCandidate
        : Array.isArray(project.mockupImages)
          ? project.mockupImages.length
          : Object.keys(project.mockupImages || {}).length;
    const resizedCountCandidate = summary.resizedCount ?? project.resizedCount;
    const resizedCount =
      typeof resizedCountCandidate === "number"
        ? resizedCountCandidate
        : project.resizedImages?.length || 0;

    const isMockupProject = project.title?.toLowerCase().includes("mockup");
    const assets = {
      original:
        summary.hasOriginalImage ??
        Boolean(project.thumbnailUrl || project.originalImageUrl),
      upscaled: summary.hasUpscaledImage ?? Boolean(project.upscaledImageUrl),
      mockup: summary.hasMockupImages ?? Boolean(mockupCount),
      resized: summary.hasResizedImages ?? Boolean(resizedCount),
      etsy:
        !isMockupProject &&
        (summary.hasEtsyListing ?? Boolean(project.etsyListing)),
    };
    const assetCount = Object.values(assets).filter(Boolean).length;
    const isCompleteProject = assetCount >= 3;

    return (
      <div
        key={project.id}
        className="group cursor-pointer overflow-hidden rounded-lg border border-gray-200 transition duration-200 hover:shadow-md"
        onClick={() => handleViewProject(project.id)}
      >
        <div className="aspect-w-16 aspect-h-10 bg-gray-100">
          {project.thumbnailUrl ? (
            <img
              src={project.thumbnailUrl}
              alt={project.title}
              className="h-40 w-full object-cover transition duration-200 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-40 w-full flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
              <div className="mb-2 text-indigo-500">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <span className="text-xs font-medium text-indigo-600">Artwork Project</span>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="truncate text-sm font-medium text-gray-900">{project.title}</h4>
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                project.status === "completed"
                  ? "bg-green-100 text-green-800"
                  : project.status === "ai-generated"
                  ? "bg-purple-100 text-purple-800"
                  : project.status === "processing"
                  ? "bg-yellow-100 text-yellow-800"
                  : project.status === "failed"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {project.status || "pending"}
            </span>
          </div>

          <p className="line-clamp-2 text-xs text-gray-500">
            {project.metadata?.styleKeywords || "No description provided."}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Mockups</p>
              <p className="text-base font-semibold text-slate-900">{mockupCount}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Print formats</p>
              <p className="text-base font-semibold text-slate-900">{resizedCount}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {isCompleteProject && (
              <div className="flex justify-center">
                <span className="inline-flex items-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  Complete ({assetCount} assets)
                </span>
              </div>
            )}

            <div className={`flex flex-wrap gap-1 ${isCompleteProject ? "justify-center" : ""}`}>
              {assets.original && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                  Original
                </span>
              )}
              {assets.upscaled && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                  Upscaled
                </span>
              )}
              {assets.mockup && (
                <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-xs text-purple-700">
                  Mockups
                </span>
              )}
              {assets.resized && (
                <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-700">
                  Print sizes
                </span>
              )}
              {assets.etsy && (
                <span className="inline-flex items-center rounded-full bg-pink-100 px-2 py-1 text-xs text-pink-700">
                  Etsy SEO
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <span>{formatDate(project.createdAt)}</span>
            {project.status === "ai-generated" && (
              <span className="rounded-full bg-purple-100 px-2 py-1 font-medium text-purple-700">
                AI Generated
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const content = (
    <>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center text-2xl font-bold text-gray-900">
              <History className="mr-2 h-6 w-6 text-indigo-500" />
              All Projects
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage and view all your artwork projects.
            </p>
          </div>
          <Button className="bg-indigo-500 hover:bg-indigo-600" onClick={handleCreateProject}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-slate-500">Active Projects</p>
            {projects.some((p) => p.status === "processing" || p.status === "ai-generated" || p.status === "uploading") && (
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
                <span className="text-xs text-green-600">Auto-refreshing</span>
              </div>
            )}
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{projects.length}</p>
          <p className="mt-2 text-xs text-slate-500">
            {projects.filter((p) => p.status === "processing" || p.status === "uploading").length} currently processing
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Mockups Generated</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{totalMockups}</p>
          <p className="mt-2 text-xs text-slate-500">Across all projects</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Print Formats Ready</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{totalPrintFormats}</p>
          <p className="mt-2 text-xs text-slate-500">Downloadable formats prepared</p>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
            <p className="text-sm text-slate-500">
              Quick access to your recent creative work.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search projects"
                className="border-slate-200 bg-slate-50 pl-9 text-slate-900"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full border-slate-200 bg-slate-50 text-slate-900 sm:w-40">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center">
                    <Filter className="mr-2 h-3.5 w-3.5" />
                    All statuses
                  </div>
                </SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="uploading">Uploading</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-6">
          <p className="mb-4 text-sm text-slate-500">
            Showing {filteredProjects.length} of {projects.length} projects
          </p>

          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 py-16 text-center">
              <Search className="h-10 w-10 text-slate-400" />
              <p className="mt-3 text-sm font-medium text-slate-700">No projects found</p>
              <p className="mt-1 text-xs text-slate-500">
                Try adjusting your search or clear filters to see all projects.
              </p>
              <Button className="mt-4 bg-indigo-500 hover:bg-indigo-600" onClick={handleCreateProject}>
                Create your first project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProjects.map(renderProjectCard)}
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={currentUser} />
        <div className="flex min-h-[50vh] items-center justify-center px-6">
          <div className="text-center text-sm text-slate-500">Loading your projects…</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={currentUser} />
        <div className="flex min-h-[50vh] items-center justify-center px-6">
          <div className="text-center text-sm text-rose-500">
            Failed to load projects. Please refresh the page.
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!showChrome) {
    return <div className="space-y-8 px-4 py-8 sm:px-6 lg:px-10 bg-slate-900/60 text-slate-100">{content}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead
        title="My Projects - Image Upscaler Pro"
        description="Manage your AI-generated artwork projects"
        path="/projects"
      />
      <Navigation
        user={
          currentUser
            ? {
                ...currentUser,
                credits: currentUser.credits ?? 0,
              }
            : undefined
        }
      />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        {content}
      </div>
      <Footer />
    </div>
  );
}

