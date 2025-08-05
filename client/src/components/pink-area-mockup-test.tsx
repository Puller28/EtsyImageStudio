import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, Image as ImageIcon, Wand2, Download } from "lucide-react";

interface PinkAreaResult {
  success: boolean;
  mockup: string;
  detection: {
    areas: number;
    totalPixels: number;
    largestArea: {
      x: number;
      y: number;
      width: number;
      height: number;
      pixels: number;
    } | null;
  };
}

export default function PinkAreaMockupTest() {
  const [mockupFile, setMockupFile] = useState<File | null>(null);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [mockupPreview, setMockupPreview] = useState<string>("");
  const [artworkPreview, setArtworkPreview] = useState<string>("");
  const [result, setResult] = useState<PinkAreaResult | null>(null);
  const { toast } = useToast();

  const generateMockupMutation = useMutation({
    mutationFn: async () => {
      if (!mockupFile || !artworkFile) {
        throw new Error("Both mockup template and artwork are required");
      }

      const formData = new FormData();
      formData.append("mockup", mockupFile);
      formData.append("artwork", artworkFile);

      const response = await fetch("/api/test-pink-mockup", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate mockup");
      }

      return response.json() as Promise<PinkAreaResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "Mockup Generated Successfully",
        description: `Detected ${data.detection.areas} pink areas, placed artwork in ${data.detection.largestArea?.width}x${data.detection.largestArea?.height} area`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleMockupUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setMockupFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setMockupPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleArtworkUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setArtworkFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setArtworkPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const downloadResult = () => {
    if (!result?.mockup) return;
    
    const link = document.createElement('a');
    link.href = result.mockup;
    link.download = 'pink-area-mockup-result.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" data-testid="pink-area-mockup-test">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-pink-500" />
            Pink Area Mockup Test
          </CardTitle>
          <CardDescription>
            Upload a mockup template with pink areas and artwork to test precise image placement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Section */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Mockup Template Upload */}
            <div className="space-y-3">
              <Label htmlFor="mockup-upload" className="text-sm font-medium">
                Mockup Template (with pink areas)
              </Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                <Input
                  id="mockup-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleMockupUpload}
                  className="hidden"
                  data-testid="input-mockup-upload"
                />
                <Label htmlFor="mockup-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center space-y-2">
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Click to upload mockup template
                    </span>
                  </div>
                </Label>
              </div>
              {mockupPreview && (
                <div className="mt-3">
                  <img
                    src={mockupPreview}
                    alt="Mockup preview"
                    className="w-full h-40 object-contain border rounded-lg"
                    data-testid="img-mockup-preview"
                  />
                </div>
              )}
            </div>

            {/* Artwork Upload */}
            <div className="space-y-3">
              <Label htmlFor="artwork-upload" className="text-sm font-medium">
                Artwork Image
              </Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                <Input
                  id="artwork-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleArtworkUpload}
                  className="hidden"
                  data-testid="input-artwork-upload"
                />
                <Label htmlFor="artwork-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center space-y-2">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Click to upload artwork
                    </span>
                  </div>
                </Label>
              </div>
              {artworkPreview && (
                <div className="mt-3">
                  <img
                    src={artworkPreview}
                    alt="Artwork preview"
                    className="w-full h-40 object-contain border rounded-lg"
                    data-testid="img-artwork-preview"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-center">
            <Button
              onClick={() => generateMockupMutation.mutate()}
              disabled={!mockupFile || !artworkFile || generateMockupMutation.isPending}
              size="lg"
              className="px-8"
              data-testid="button-generate-mockup"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              {generateMockupMutation.isPending ? "Generating..." : "Generate Pink Area Mockup"}
            </Button>
          </div>

          {/* Results Section */}
          {result && (
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Generated Mockup</h3>
                <Button
                  onClick={downloadResult}
                  variant="outline"
                  size="sm"
                  data-testid="button-download-result"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>

              {/* Detection Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Detection Results</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Pink Areas Found:</span>
                    <div className="font-medium" data-testid="text-areas-found">
                      {result.detection.areas}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Pink Pixels:</span>
                    <div className="font-medium" data-testid="text-total-pixels">
                      {result.detection.totalPixels.toLocaleString()}
                    </div>
                  </div>
                  {result.detection.largestArea && (
                    <>
                      <div>
                        <span className="text-gray-600">Largest Area Size:</span>
                        <div className="font-medium" data-testid="text-largest-area-size">
                          {result.detection.largestArea.width} × {result.detection.largestArea.height}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Position:</span>
                        <div className="font-medium" data-testid="text-position">
                          ({result.detection.largestArea.x}, {result.detection.largestArea.y})
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Result Image */}
              <div className="flex justify-center">
                <img
                  src={result.mockup}
                  alt="Generated mockup"
                  className="max-w-full h-auto border rounded-lg shadow-lg"
                  data-testid="img-generated-mockup"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}