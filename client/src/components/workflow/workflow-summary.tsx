import { useQuery } from "@tanstack/react-query";
import type { Project } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

interface WorkflowSummaryProps {
  projectId: string | null;
}

function formatDate(date?: string | Date | null) {
  if (!date) return "Unknown";
  const dt = typeof date === "string" ? new Date(date) : date;
  return dt.toLocaleString();
}

export function WorkflowSummary({ projectId }: WorkflowSummaryProps) {
  const { data: project, refetch, isFetching } = useQuery<Project | null>({
    queryKey: ["/api/projects", projectId, "summary"],
    enabled: !!projectId,
    queryFn: async () => {
      if (!projectId) return null;
      const res = await apiRequest("GET", `/api/projects/${projectId}`);
      return res.json() as Promise<Project>;
    },
  });

  if (!projectId) {
    return (
      <Card className="border-slate-800 bg-slate-900/50 text-slate-200">
        <CardHeader>
          <CardTitle>Select a project to see progress</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-400">
          Choose or create a workspace project to populate the workflow summary.
        </CardContent>
      </Card>
    );
  }

  if (!project) {
    return (
      <Card className="border-slate-800 bg-slate-900/50 text-slate-200">
        <CardHeader>
          <CardTitle>Project unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-400">
          Unable to load project details. Try refreshing the summary.
        </CardContent>
      </Card>
    );
  }

  const mockupCount =
    typeof project.mockupCount === "number"
      ? project.mockupCount
      : Array.isArray(project.mockupImages)
        ? project.mockupImages.length
        : Object.keys(project.mockupImages || {}).length;
  const formatCount =
    typeof project.resizedCount === "number"
      ? project.resizedCount
      : project.resizedImages?.length || 0;

  return (
    <Card className="border-slate-800 bg-slate-900/60 text-slate-100">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-white">{project.title}</CardTitle>
          <Badge className="mt-2 bg-indigo-500/20 text-indigo-100">
            {project.status || "pending"}
          </Badge>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 text-slate-300 hover:text-white"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCcw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Mockups</span>
          <span className="text-white">{mockupCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Print formats</span>
          <span className="text-white">{formatCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Upcale option</span>
          <span className="text-white">{project.upscaleOption || "n/a"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Created</span>
          <span className="text-white">{formatDate(project.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
