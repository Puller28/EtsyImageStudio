import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Upload, ImageIcon } from "lucide-react";

type SideState = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type OutpaintResponse = {
  success: boolean;
  prompt: string;
  variations: number;
  best: string;
  images: string[];
  error?: string;
};

export default function MockupOutpaintPage() {
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState(
    "modern living room, soft window light, eye level camera",
  );
  const [sides, setSides] = useState<SideState>({
    top: 128,
    right: 256,
    bottom: 0,
    left: 128,
  });
  const [variations, setVariations] = useState(4);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<OutpaintResponse | null>(null);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file",
          description: "Please upload an image file (PNG or JPG).",
          variant: "destructive",
        });
        return;
      }
      setImageFile(file);
    }
  };

  const updateSide = (key: keyof SideState, value: number) => {
    setSides((prev) => ({
      ...prev,
      [key]: value >= 0 ? value : 0,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!imageFile) {
      toast({
        title: "Image required",
        description: "Select an image to outpaint before submitting.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("prompt", prompt);
    formData.append("variations", String(variations));
    formData.append("sides", JSON.stringify(sides));

    setIsSubmitting(true);
    setResults(null);

    try {
      const response = await fetch("/api/mockups/outpaint", {
        method: "POST",
        body: formData,
      });

      const json = (await response.json()) as OutpaintResponse;

      if (!response.ok || !json.success) {
        throw new Error(json.error || "Mockup generation failed");
      }

      setResults(json);
      toast({
        title: "Mockups ready",
        description: `Generated ${json.variations} variation${json.variations === 1 ? "" : "s"}.`,
      });
    } catch (error) {
      console.error("Outpaint request failed:", error);
      toast({
        title: "Generation failed",
        description:
          error instanceof Error ? error.message : "Unable to generate mockup. Try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 space-y-2">
        <h1 className="text-3xl font-bold">Mockup Outpainting Playground</h1>
        <p className="text-muted-foreground">
          Upload an image and describe the scene you want to extend. The outpainting service
          will generate wider compositions and return multiple variations for you to review.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[360px,1fr]">
        <Card className="self-start">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Source Image</CardTitle>
              <CardDescription>PNG or JPG up to 25MB. Transparent backgrounds work best.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="mockup-image" className="mb-2 block">
                  Upload image
                </Label>
                <div className="flex items-center gap-3">
                  <Button type="button" onClick={() => document.getElementById("mockup-image")?.click()} variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Choose file
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {imageFile ? imageFile.name : "No file selected"}
                  </span>
                </div>
                <Input
                  id="mockup-image"
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt">Creative brief</Label>
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Describe the environment you want to extend (e.g. modern living room...)"
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-3">
                <Label>Canvas expansion (pixels)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="expand-top" className="text-xs uppercase text-muted-foreground">
                      Top
                    </Label>
                    <Input
                      id="expand-top"
                      type="number"
                      min={0}
                      value={sides.top}
                      onChange={(event) => updateSide("top", Number(event.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expand-bottom" className="text-xs uppercase text-muted-foreground">
                      Bottom
                    </Label>
                    <Input
                      id="expand-bottom"
                      type="number"
                      min={0}
                      value={sides.bottom}
                      onChange={(event) => updateSide("bottom", Number(event.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expand-left" className="text-xs uppercase text-muted-foreground">
                      Left
                    </Label>
                    <Input
                      id="expand-left"
                      type="number"
                      min={0}
                      value={sides.left}
                      onChange={(event) => updateSide("left", Number(event.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expand-right" className="text-xs uppercase text-muted-foreground">
                      Right
                    </Label>
                    <Input
                      id="expand-right"
                      type="number"
                      min={0}
                      value={sides.right}
                      onChange={(event) => updateSide("right", Number(event.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="variations">Variations</Label>
                <Input
                  id="variations"
                  type="number"
                  min={1}
                  max={8}
                  value={variations}
                  onChange={(event) => setVariations(Number(event.target.value))}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  "Generate mockups"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>
              Preview the generated variations. The top result is highlighted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSubmitting && (
              <div className="flex h-48 flex-col items-center justify-center rounded border border-dashed border-border text-muted-foreground">
                <Loader2 className="mb-2 h-6 w-6 animate-spin" />
                Generating mockups…
              </div>
            )}

            {!isSubmitting && !results && (
              <div className="flex h-48 flex-col items-center justify-center rounded border border-dashed border-border text-muted-foreground">
                <ImageIcon className="mb-2 h-6 w-6" />
                Upload an image and run outpainting to view results.
              </div>
            )}

            {!isSubmitting && results && (
              <ScrollArea className="max-h-[560px] pr-2">
                <div className="grid gap-4">
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Top result</h3>
                    <img
                      src={results.best}
                      alt="Best outpainted result"
                      className="w-full rounded border bg-muted object-cover"
                    />
                  </div>
                  {results.images.length > 1 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                        Other variations
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {results.images
                          .filter((image) => image !== results.best)
                          .map((image, index) => (
                            <img
                              key={index}
                              src={image}
                              alt={`Outpaint variation ${index + 1}`}
                              className="w-full rounded border bg-muted object-cover"
                            />
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
