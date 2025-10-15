import { ProjectsOverview } from "@/components/projects/projects-overview";
import { useWorkspace } from "@/contexts/workspace-context";
import { useLocation } from "wouter";

export default function WorkspaceHomePage() {
  const { setSelectedProjectId } = useWorkspace();
  const [, setLocation] = useLocation();

  return (
    <ProjectsOverview
      onCreateProject={() => setLocation("/tools/upscale")}
      onSelectProject={(projectId) => {
        setSelectedProjectId(projectId);
        setLocation(`/workspace/projects/${projectId}`);
      }}
    />
  );
}
