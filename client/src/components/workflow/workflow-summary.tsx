import { useQuery } from "@tanstack/react-query";
import type { Project } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RefreshCcw, Loader2 } from "lucide-react";

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
    refetchInterval: (query) => {
      // Auto-refresh every 2 seconds if processing
      const data = query.state.data;
      return data?.status === 'processing' ? 2000 : false;
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

  const isProcessing = project.status === 'processing';

  return (
    <Card className="border-slate-800 bg-slate-900/60 text-slate-100">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Project Title and Status */}
          <div className="flex items-center gap-3">
            <div>
              <h3 className="font-semibold text-white">{project.title}</h3>
              <Badge className={isProcessing ? "bg-amber-500/20 text-amber-100 mt-1" : "bg-indigo-500/20 text-indigo-100 mt-1"}>
                {isProcessing && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                {project.status || "pending"}
              </Badge>
            </div>
          </div>

          {/* Stats - Horizontal Layout */}
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Mockups:</span>
              <span className="font-medium text-white">{mockupCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Print formats:</span>
              <span className="font-medium text-white">{formatCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Upscale:</span>
              <span className="font-medium text-white">{project.upscaleOption || "n/a"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Created:</span>
              <span className="font-medium text-white">{formatDate(project.createdAt)}</span>
            </div>
          </div>

          {/* Refresh Button */}
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-slate-300 hover:text-white shrink-0"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCcw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
        </div>

        {/* Processing Progress Bar */}
        {isProcessing && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-slate-400">Processing your artwork...</p>
            <Progress value={undefined} className="h-1" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
