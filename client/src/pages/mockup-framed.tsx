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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Palette } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function MockupFramedPage() {
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [backgroundColor, setBackgroundColor] = useState("#f5f1e9");
  const [frameColor, setFrameColor] = useState("#c7b299");
  const [matColor, setMatColor] = useState("#ffffff");
  const [artBackgroundColor, setArtBackgroundColor] = useState("#ffffff");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file",
          description: "Please upload an image file (PNG, JPG or WEBP).",
          variant: "destructive",
        });
        return;
      }
      setImageFile(file);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!imageFile) {
      toast({
        title: "Image required",
        description: "Select an artwork image before generating a mockup.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("backgroundColor", backgroundColor);
    formData.append("frameColor", frameColor);
    formData.append("matColor", matColor);
    formData.append("artBackgroundColor", artBackgroundColor);

    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch("/api/mockups/frame", {
        method: "POST",
        body: formData,
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || "Mockup generation failed");
      }

      setResult(json.image);
      toast({
        title: "Mockup ready",
        description: "Your artwork has been placed in a framed room scene.",
      });
    } catch (error) {
      console.error("Framed mockup request failed:", error);
      toast({
        title: "Generation failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to generate mockup. Try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 space-y-2">
        <h1 className="text-3xl font-bold">Framed Mockup Playground</h1>
        <p className="text-muted-foreground">
          Upload your artwork and generate a styled wall mockup with a framed
          presentation. Customize the background, frame, and mat colours to
          match your brand.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[360px,1fr]">
        <Card className="self-start">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Artwork</CardTitle>
              <CardDescription>
                Upload a PNG, JPG, or WEBP file up to 25MB.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="mockup-artwork" className="mb-2 block">
                  Upload artwork
                </Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("mockup-artwork")?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Choose file
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {imageFile ? imageFile.name : "No file selected"}
                  </span>
                </div>
                <Input
                  id="mockup-artwork"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-semibold">
                  <Palette className="h-4 w-4" />
                  Colours
                </Label>
                <div className="grid gap-3">
                  <div className="grid grid-cols-[auto,1fr] items-center gap-2">
                    <Label htmlFor="backgroundColor" className="text-xs uppercase text-muted-foreground">
                      Wall
                    </Label>
                    <Input
                      id="backgroundColor"
                      type="text"
                      value={backgroundColor}
                      onChange={(event) => setBackgroundColor(event.target.value)}
                      placeholder="#f5f1e9"
                    />
                  </div>
                  <div className="grid grid-cols-[auto,1fr] items-center gap-2">
                    <Label htmlFor="frameColor" className="text-xs uppercase text-muted-foreground">
                      Frame
                    </Label>
                    <Input
                      id="frameColor"
                      type="text"
                      value={frameColor}
                      onChange={(event) => setFrameColor(event.target.value)}
                      placeholder="#c7b299"
                    />
                  </div>
                  <div className="grid grid-cols-[auto,1fr] items-center gap-2">
                    <Label htmlFor="matColor" className="text-xs uppercase text-muted-foreground">
                      Mat
                    </Label>
                    <Input
                      id="matColor"
                      type="text"
                      value={matColor}
                      onChange={(event) => setMatColor(event.target.value)}
                      placeholder="#ffffff"
                    />
                  </div>
                  <div className="grid grid-cols-[auto,1fr] items-center gap-2">
                    <Label htmlFor="artBackgroundColor" className="text-xs uppercase text-muted-foreground">
                      Artwork BG
                    </Label>
                    <Input
                      id="artBackgroundColor"
                      type="text"
                      value={artBackgroundColor}
                      onChange={(event) => setArtBackgroundColor(event.target.value)}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
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
                  "Generate framed mockup"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Your artwork will appear here once the framed mockup is generated.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[640px] pr-2">
              {isSubmitting && (
                <div className="flex h-48 flex-col items-center justify-center rounded border border-dashed border-border text-muted-foreground">
                  <Loader2 className="mb-2 h-6 w-6 animate-spin" />
                  Generating mockup…
                </div>
              )}

              {!isSubmitting && !result && (
                <div className="flex h-48 flex-col items-center justify-center rounded border border-dashed border-border text-muted-foreground">
                  Upload an artwork and run the mockup to see the result here.
                </div>
              )}

              {!isSubmitting && result && (
                <img
                  src={result}
                  alt="Framed mockup result"
                  className="w-full rounded border bg-muted object-cover"
                />
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
