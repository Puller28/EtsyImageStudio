import { useEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { useQuery } from "@tanstack/react-query";
import type { Project } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { WorkflowStepper } from "@/components/workflow/workflow-stepper";
import { WorkflowSummary } from "@/components/workflow/workflow-summary";
import UpscaleToolPage from "@/pages/tools/upscale-tool";
import { MockupPage } from "@/pages/mockup-page";
import PrintFormatsToolPage from "@/pages/tools/print-formats-tool";
import ListingToolPage from "@/pages/tools/listing-tool";
import { useLocation } from "wouter";

interface StepDefinition {
  key: string;
  title: string;
  description: string;
  render: () => JSX.Element;
  canProceed?: () => boolean;
  ctaLabel?: string;
}

function SelectProjectStep({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateNew,
  onOpenWorkspace,
}: {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
  onCreateNew: () => void;
  onOpenWorkspace: () => void;
}) {
  return (
    <Card className="border-slate-800 bg-slate-900/60 text-slate-100">
      <CardHeader>
        <CardTitle className="text-white">Choose your workspace project</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-400">
          Select an existing project to resume the workflow, or create a new one. Projects collect every asset we generate along the way.
        </p>
        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
            You have no projects yet.{" "}
            <button onClick={onCreateNew} className="text-indigo-300 underline">
              Create your first project
            </button>
          </div>
        ) : (
          <RadioGroup
            value={selectedProjectId ?? ""}
            onValueChange={(value) => onSelectProject(value || null)}
            className="space-y-3"
          >
            {projects.map((project) => (
              <Label
                key={project.id}
                className="flex cursor-pointer items-start justify-between rounded-xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-sm transition hover:border-indigo-500/40"
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value={project.id} className="mt-1" />
                  <div>
                    <p className="font-medium text-white">{project.title}</p>
                    <p className="text-xs text-slate-400">Status: {project.status}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-500">
                  {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "Unknown"}
                </span>
              </Label>
            ))}
          </RadioGroup>
        )}
        <div className="flex gap-2">
          <Button className="bg-indigo-500 hover:bg-indigo-600" onClick={onCreateNew}>
            Create new project
          </Button>
          <Button
            variant="secondary"
            className="bg-slate-800 text-slate-200 hover:bg-slate-700"
            onClick={onOpenWorkspace}
          >
            Go to workspace
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function WorkflowRunnerPage() {
  const { mode, setMode, selectedProjectId, setSelectedProjectId } = useWorkspace();
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/projects");
      return res.json() as Promise<Project[]>;
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (mode !== "workflow") {
      setMode("workflow");
    }
  }, [mode, setMode]);

  const stepDefinitions: StepDefinition[] = useMemo(() => [
    {
      key: "select",
      title: "Select project",
      description: "Pick an existing workspace project or create a new one",
      render: () => (
        <SelectProjectStep
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={(projectId) => setSelectedProjectId(projectId)}
          onCreateNew={() => navigate("/workflow/run?create=new")}
          onOpenWorkspace={() => navigate("/workspace/projects")}
        />
      ),
      canProceed: () => Boolean(selectedProjectId),
      ctaLabel: selectedProjectId ? "Continue" : "Select a project to continue",
    },
    {
      key: "upscale",
      title: "Upscale & assets",
      description: "Prepare your artwork and upload supporting files",
      render: () => <UpscaleToolPage showIntro={false} />,
    },
    {
      key: "mockups",
      title: "Template mockups",
      description: "Generate scene previews with your art",
      render: () => <MockupPage showChrome={false} />,
    },
    {
      key: "formats",
      title: "Print formats",
      description: "Confirm and download ready-to-print files",
      render: () => <PrintFormatsToolPage showIntro={false} />,
    },
    {
      key: "listing",
      title: "Listing",
      description: "Craft the final Etsy product copy",
      render: () => <ListingToolPage showIntro={false} />,
      ctaLabel: "Finish workflow",
    },
  ], [navigate, projects, selectedProjectId, setSelectedProjectId]);

  const stepCount = stepDefinitions.length;
  const isLastStep = currentStep === stepCount - 1;
  const activeStep = stepDefinitions[currentStep];
  const nextDisabled = activeStep.canProceed ? !activeStep.canProceed() : false;

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-10 text-slate-100">
      <header className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-white">Guided workflow</h1>
        <p className="text-sm text-slate-400">
          Follow the curated steps to go from artwork to a publish-ready Etsy listing. You can jump to tools at any time, but the structured route keeps everything organised.
        </p>
      </header>

      <WorkflowStepper
        steps={stepDefinitions.map(({ title, description }) => ({ title, description }))}
        currentStep={currentStep}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {activeStep.render()}
          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              className="bg-slate-800 text-slate-200 hover:bg-slate-700"
              disabled={currentStep === 0}
              onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}
            >
              Previous step
            </Button>
            <Button
              className="bg-indigo-500 hover:bg-indigo-600"
              disabled={nextDisabled}
              onClick={() => {
                if (isLastStep) {
                  navigate("/workspace/projects" + (selectedProjectId ? `/${selectedProjectId}` : ""));
                } else {
                  setCurrentStep((step) => Math.min(step + 1, stepCount - 1));
                }
              }}
            >
              {isLastStep ? "Finish" : activeStep.ctaLabel ?? "Next step"}
            </Button>
          </div>
        </div>
        <WorkflowSummary projectId={selectedProjectId} />
      </div>
    </div>
  );
}

