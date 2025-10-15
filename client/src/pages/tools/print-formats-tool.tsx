import { useWorkspace } from "@/contexts/workspace-context";
import { useQuery } from "@tanstack/react-query";
import type { Project } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Layers, Download } from "lucide-react";

interface PrintFormatsToolPageProps {
  showIntro?: boolean;
}

export default function PrintFormatsToolPage({ showIntro = true }: PrintFormatsToolPageProps = {}) {
  const { selectedProjectId } = useWorkspace();

  const { data: project, isLoading } = useQuery<Project | null>({
    queryKey: ["/api/projects", selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return null;
      const res = await apiRequest("GET", `/api/projects/${selectedProjectId}`);
      return res.json() as Promise<Project>;
    },
    enabled: !!selectedProjectId,
  });

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-10 text-slate-100">
      {showIntro && (
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-200">
            <Layers className="h-3.5 w-3.5" />
            Print Format Studio
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-white">Print-ready Formats</h1>
          <p className="mt-2 text-sm text-slate-400">
            Generate or download industry standard ratios for your artwork. Select a project to view its formats.
          </p>
        </header>
      )}

      {!selectedProjectId ? (
        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center">
          <p className="text-sm text-slate-300">Select a project from the top bar to see available formats.</p>
          <p className="mt-2 text-xs text-slate-500">
            Once a project is selected, you can preview and download print-ready assets, or jump into the workflow to create them.
          </p>
        </div>
      ) : isLoading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-10 text-center text-sm text-slate-400">
          Loading project formats…
        </div>
      ) : !project ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-10 text-center text-sm text-slate-400">
          Unable to load project details. Try refreshing or running the workflow again.
        </div>
      ) : (
        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Available formats</h2>
                <p className="text-xs text-slate-400">Download high-resolution JPEGs ready for print.</p>
              </div>
              <Button
                variant="secondary"
                className="bg-indigo-500/20 text-indigo-100 hover:bg-indigo-500/30"
                onClick={() => window.open(`/workflow?project=${project.id}`, "_blank")}
              >
                Generate more
              </Button>
            </div>

            {project.resizedImages && project.resizedImages.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {project.resizedImages.map((asset, index) => (
                  <div
                    key={`${asset.size}-${index}`}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{asset.size}</p>
                      <p className="text-xs text-slate-400">Ready to download</p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-slate-800 text-slate-200 hover:bg-slate-700"
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = asset.url;
                        link.download = `${project.title}-${asset.size}.jpg`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/70 p-8 text-center text-sm text-slate-400">
                No print formats yet. Run the workflow or use the Upscale tool to generate them.
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <h3 className="text-base font-semibold text-white">Format primer</h3>
            <p className="text-sm text-slate-400">
              We automatically prepare the five most popular ratios for Etsy and on-demand printing. These cover North American standards (4x5, 3x4, 2x3, 11x14) and international A-series sizes.
            </p>
            <p className="text-sm text-slate-400">
              Need additional or bespoke sizes? Duplicate this project and run the workflow again to generate alternate ratios, or export the upscaled master and crop manually.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
