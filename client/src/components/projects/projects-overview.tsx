import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Plus, Search, Filter, Clock, Sparkles, ImageDown } from "lucide-react";
import type { Project } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

interface ProjectsOverviewProps {
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

const statusColours: Record<string, string> = {
  completed: "bg-emerald-500/15 text-emerald-300",
  processing: "bg-amber-500/15 text-amber-300",
  uploading: "bg-slate-500/15 text-slate-200",
  failed: "bg-rose-500/15 text-rose-300",
  draft: "bg-slate-500/15 text-slate-300",
};

export function ProjectsOverview({ onCreateProject, onSelectProject }: ProjectsOverviewProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/projects");
      return res.json() as Promise<Project[]>;
    },
    staleTime: 30_000,
  });

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        !searchTerm ||
        project.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.metadata?.styleKeywords?.toLowerCase?.().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        project.status?.toLowerCase() === statusFilter.toLowerCase();
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

  const handleCreateProject = () => {
    if (onCreateProject) {
      onCreateProject();
    }
  };

  return (
    <div className="space-y-8 px-4 py-8 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-100">
            <Sparkles className="h-3 w-3" />
            Welcome back, {user?.name?.split(" ")[0] || "creator"}!
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-white">
            Workspace Overview
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage your projects, assets, and creative outputs from one place.
          </p>
        </div>
        <Button
          size="lg"
          className="bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/20"
          onClick={handleCreateProject}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Active Projects</p>
          <p className="mt-2 text-3xl font-semibold text-white">{projects.length}</p>
          <p className="mt-2 text-xs text-slate-400">
            {projects.filter((p) => p.status === "processing").length} currently processing
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Mockups Generated</p>
          <p className="mt-2 text-3xl font-semibold text-white">
            {totalMockups}
          </p>
          <p className="mt-2 text-xs text-slate-400">Across all projects</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Print Formats Ready</p>
          <p className="mt-2 text-3xl font-semibold text-white">
            {totalPrintFormats}
          </p>
          <p className="mt-2 text-xs text-slate-400">Downloadable formats prepared</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Projects</h2>
            <p className="text-sm text-slate-400">Quick access to your recent creative work.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search projects"
                className="pl-9 bg-slate-950/60 border-slate-800 text-slate-100"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36 border-slate-800 bg-slate-950/60 text-slate-100">
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
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-slate-400">
            <Clock className="mr-2 h-4 w-4 animate-spin" />
            Loading projects…
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-950/40 py-16 text-center">
            <ImageDown className="h-10 w-10 text-slate-600" />
            <p className="mt-3 text-sm font-medium text-slate-200">No projects yet</p>
            <p className="mt-1 text-xs text-slate-500">Start by uploading artwork or generating mockups.</p>
            <Button className="mt-4 bg-indigo-500 hover:bg-indigo-600" onClick={handleCreateProject}>
              Create your first project
            </Button>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map((project) => {
              const statusColour =
                statusColours[project.status || ""] || "bg-slate-500/15 text-slate-300";
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

              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => onSelectProject?.(project.id)}
                  className="group flex flex-col rounded-2xl border border-transparent bg-slate-950/40 p-5 text-left transition hover:border-indigo-500/40 hover:bg-slate-900/60"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">{project.title}</p>
                    <Badge className={statusColour}>{project.status || "pending"}</Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-slate-400">
                    {project.metadata?.styleKeywords || "No description provided."}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-3">
                      <p className="text-xs text-slate-500">Mockups</p>
                      <p className="text-base font-semibold text-white">{mockupCount}</p>
                    </div>
                    <div className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-3">
                      <p className="text-xs text-slate-500">Print formats</p>
                      <p className="text-base font-semibold text-white">{resizedCount}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
