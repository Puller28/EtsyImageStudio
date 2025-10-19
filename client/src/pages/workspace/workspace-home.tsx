import { ProjectsOverview } from "@/components/projects/projects-overview";
import { useWorkspace } from "@/contexts/workspace-context";
import { useLocation } from "wouter";

export default function WorkspaceHomePage() {
  const { setSelectedProjectId } = useWorkspace();
  const [, setLocation] = useLocation();

  return (
    <ProjectsOverview
      onCreateProject={() => {
        // Clear any selected project before creating a new one
        setSelectedProjectId(null);
        setLocation("/tools/upscale");
      }}
      onSelectProject={(projectId) => {
        setSelectedProjectId(projectId);
        setLocation(`/workspace/projects/${projectId}`);
      }}
    />
  );
}
