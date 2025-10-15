import ProjectsPage from "@/pages/projects";
import { useWorkspace } from "@/contexts/workspace-context";
import { useLocation } from "wouter";

export default function WorkspaceProjectsPage() {
  const { setSelectedProjectId } = useWorkspace();
  const [, setLocation] = useLocation();

  return (
    <div className="bg-slate-900/60">
      <ProjectsPage
        showChrome={false}
        onCreateProject={() => setLocation("/tools/upscale")}
        onSelectProject={(projectId) => {
          setSelectedProjectId(projectId);
          setLocation(`/workspace/projects/${projectId}`);
        }}
      />
    </div>
  );
}
