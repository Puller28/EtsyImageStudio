import { useWorkspace } from "@/contexts/workspace-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Project } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Wand2, FileText, Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ListingToolPageProps {
  showIntro?: boolean;
}

export default function ListingToolPage({ showIntro = true }: ListingToolPageProps = {}) {
  const { selectedProjectId } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string>(""); // comma separated

  const { data: project } = useQuery<Project | null>({
    queryKey: ["/api/projects", selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return null;
      const res = await apiRequest("GET", `/api/projects/${selectedProjectId}`);
      return res.json() as Promise<Project>;
    },
    enabled: !!selectedProjectId,
  });

  const generateListing = useMutation({
    mutationFn: async () => {
      if (!selectedProjectId) throw new Error("Select a project first");
      const res = await apiRequest(
        "POST",
        `/api/projects/${selectedProjectId}/generate-listing`,
        {
          artworkTitle: title || project?.title || "Untitled Artwork",
          styleKeywords: (tags || project?.metadata?.styleKeywords || "digital art") as string,
        }
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Listing generated",
        description: "Fresh Etsy copy is ready. Scroll down to review.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId] });
    },
    onError: (error: any) => {
      toast({
        title: "Generation failed",
        description: error?.message || "Unable to create listing right now.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-10 text-slate-100">
      {showIntro && (
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/20 px-3 py-1 text-xs font-medium text-violet-200">
            <FileText className="h-3.5 w-3.5" />
            Listing Builder
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-white">Etsy-Ready Listing Copy</h1>
          <p className="mt-2 text-sm text-slate-400">
            Generate or refine titles, descriptions, and tags for your selected project. AI-assisted outputs land here for quick review.
          </p>
        </header>
      )}

      {!selectedProjectId ? (
        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center text-sm text-slate-400">
          Select a project to view or create listing content.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-slate-800 bg-slate-900/60 text-slate-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Wand2 className="h-4 w-4" />
                Prompt the copy assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">Artwork title</label>
                <Input
                  className="mt-2 border-slate-800 bg-slate-950/60 text-slate-100"
                  placeholder={project?.title || "e.g. Abstract Desert Sunrise"}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">Keywords / style cues</label>
                <Textarea
                  className="mt-2 border-slate-800 bg-slate-950/60 text-slate-100"
                  placeholder="e.g. boho, neutral palette, living room wall art"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">Tags (comma separated)</label>
                <Input
                  className="mt-2 border-slate-800 bg-slate-950/60 text-slate-100"
                  placeholder="minimalist art, printable wall decor, neutral tones"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                />
              </div>
              <Button
                className="w-full bg-violet-500 hover:bg-violet-600"
                disabled={generateListing.isPending}
                onClick={() => generateListing.mutate()}
              >
                {generateListing.isPending ? "Generating…" : "Generate listing copy"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/60 text-slate-100">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Current listing draft</CardTitle>
                {project?.etsyListing && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                      onClick={() => {
                        const listingText = `Title: ${project.etsyListing.title}\n\nTags: ${project.etsyListing.tags?.join(', ')}\n\nDescription:\n${project.etsyListing.description}`;
                        navigator.clipboard.writeText(listingText);
                        toast({
                          title: "Copied!",
                          description: "Listing copied to clipboard",
                        });
                      }}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={() => {
                        const listingText = `Title: ${project.etsyListing.title}\n\nTags: ${project.etsyListing.tags?.join(', ')}\n\nDescription:\n${project.etsyListing.description}`;
                        const blob = new Blob([listingText], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${project.title}-etsy-listing.txt`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        toast({
                          title: "Downloaded!",
                          description: "Listing saved as text file",
                        });
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {project?.etsyListing ? (
                <>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Title</p>
                    <p className="mt-2 text-sm font-medium text-white">{project.etsyListing.title}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Tags</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {project.etsyListing.tags?.map((tag) => (
                        <Badge key={tag} className="bg-slate-800 text-slate-100">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Description</p>
                    <Textarea
                      className="mt-2 min-h-[160px] border-slate-800 bg-slate-950/60 text-slate-100"
                      value={project.etsyListing.description}
                      readOnly
                    />
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/70 p-8 text-center text-sm text-slate-400">
                  No listing content yet. Generate copy or run the workflow to populate this section.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
