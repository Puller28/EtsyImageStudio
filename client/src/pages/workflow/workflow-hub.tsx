import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspace } from "@/contexts/workspace-context";
import { useLocation } from "wouter";
import { useMemo } from "react";
import { UploadCloud, ImageUp, Package, Layers, FileText } from "lucide-react";

const steps = [
  {
    title: "Upload Artwork",
    description: "Bring in your existing designs or AI renders to start a new project.",
    icon: UploadCloud,
  },
  {
    title: "Upscale & Clean",
    description: "Choose 0x, 2x or 4x enhancement to hit print-ready DPI.",
    icon: ImageUp,
  },
  {
    title: "Generate Mockups",
    description: "Place artwork into high-converting room scenes across multiple styles.",
    icon: Package,
  },
  {
    title: "Prepare Print Formats",
    description: "Automatic 4x5, 3x4, 2x3, 11x14 and ISO ratios—ready for customers.",
    icon: Layers,
  },
  {
    title: "Listing Builder",
    description: "SEO-friendly titles, descriptions and tags crafted for Etsy search.",
    icon: FileText,
  },
];

export default function WorkflowPage() {
  const { selectedProjectId } = useWorkspace();
  const [, setLocation] = useLocation();

  const stepCards = useMemo(
    () =>
      steps.map((step) => (
        <Card key={step.title} className="border-slate-800 bg-slate-900/60 text-slate-100 transition hover:border-indigo-500/40 hover:bg-slate-900/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              <step.icon className="h-5 w-5 text-indigo-300" />
              {step.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">{step.description}</p>
          </CardContent>
        </Card>
      )),
    []
  );

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-10 text-slate-100">
      <header className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-200">
          Guided Workflow
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-white">Complete Art-to-Etsy Pipeline</h1>
        <p className="mt-2 text-sm text-slate-400">
          Follow the curated path from artwork ingestion to ready-to-sell listing. You can resume a project mid-stream or start fresh—every step shares data seamlessly.
        </p>
      </header>

      <section className="mb-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stepCards}
      </section>

      <Card className="border-slate-800 bg-slate-900/60 text-slate-100">
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Launch the guided experience</h2>
            <p className="mt-1 text-sm text-slate-400">
              We’ll walk you through each stage and collect all assets into your selected project.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="bg-indigo-500 hover:bg-indigo-600"
              onClick={() => setLocation(selectedProjectId ? `/workflow/run?project=${selectedProjectId}` : "/workflow/run")}
            >
              Start Workflow
            </Button>
            <Button
              variant="secondary"
              className="bg-slate-800 text-slate-200 hover:bg-slate-700"
              onClick={() => setLocation("/tools/upscale")}
            >
              Jump to tools
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
