import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, Image as ImageIcon, Download, ArrowRight } from "lucide-react";

interface MockupResult {
  success: boolean;
  mockup: string;
  detection: {
    method?: string;
    areas: number;
    totalPixels: number;
    largestArea: any;
  };
}

export default function SimpleMockupComparison() {
  const [mockupFile, setMockupFile] = useState<File | null>(null);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [mockupPreview, setMockupPreview] = useState<string>("");
  const [artworkPreview, setArtworkPreview] = useState<string>("");
  const [originalResult, setOriginalResult] = useState<MockupResult | null>(null);
  const [improvedResult, setImprovedResult] = useState<MockupResult | null>(null);
  const { toast } = useToast();

  const testOriginal = useMutation({
    mutationFn: async () => {
      if (!mockupFile || !artworkFile) {
        throw new Error("Both files are required");
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
        throw new Error(errorData.error || "Original method failed");
      }

      return await response.json() as MockupResult;
    },
    onSuccess: (result) => {
      setOriginalResult(result);
      toast({
        title: "Original Method Complete",
        description: "Basic pink area detection finished",
      });
    },
  });

  const testImproved = useMutation({
    mutationFn: async () => {
      if (!mockupFile || !artworkFile) {
        throw new Error("Both files are required");
      }

      const formData = new FormData();
      formData.append("mockup", mockupFile);
      formData.append("artwork", artworkFile);

      const response = await fetch("/api/improved-pink-placement", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Improved method failed");
      }

      return await response.json() as MockupResult;
    },
    onSuccess: (result) => {
      setImprovedResult(result);
      toast({
        title: "Improved Method Complete",
        description: "Enhanced pink area placement finished",
      });
    },
  });

  const testBoth = async () => {
    try {
      await testOriginal.mutateAsync();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay
      await testImproved.mutateAsync();
    } catch (error) {
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleMockupUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setMockupFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setMockupPreview(e.target?.result as string);
      reader.readAsDataURL(file);
      setOriginalResult(null);
      setImprovedResult(null);
    }
  };

  const handleArtworkUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setArtworkFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setArtworkPreview(e.target?.result as string);
      reader.readAsDataURL(file);
      setOriginalResult(null);
      setImprovedResult(null);
    }
  };

  const downloadResult = (result: MockupResult, filename: string) => {
    if (!result?.mockup) return;
    
    const link = document.createElement('a');
    link.href = result.mockup;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isPending = testOriginal.isPending || testImproved.isPending;

  return (
    <div className="space-y-6" data-testid="simple-mockup-comparison">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-blue-500" />
            Improved Image Placement Test
          </CardTitle>
          <CardDescription>
            Compare the original pink area detection with improved algorithms for better image placement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Section */}
          <div className="grid md:grid-cols-2 gap-6">
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
                    <span className="text-sm text-gray-600">Upload mockup</span>
                  </div>
                </Label>
              </div>
              {mockupPreview && (
                <img
                  src={mockupPreview}
                  alt="Mockup preview"
                  className="w-full h-40 object-contain border rounded-lg"
                  data-testid="img-mockup-preview"
                />
              )}
            </div>

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
                    <span className="text-sm text-gray-600">Upload artwork</span>
                  </div>
                </Label>
              </div>
              {artworkPreview && (
                <img
                  src={artworkPreview}
                  alt="Artwork preview"
                  className="w-full h-40 object-contain border rounded-lg"
                  data-testid="img-artwork-preview"
                />
              )}
            </div>
          </div>

          {/* Test Button */}
          <div className="text-center">
            <Button
              onClick={testBoth}
              disabled={!mockupFile || !artworkFile || isPending}
              size="lg"
              className="px-8"
              data-testid="button-test-both"
            >
              {isPending ? "Processing..." : "Compare Both Methods"}
            </Button>
          </div>

          {/* Results Comparison */}
          {(originalResult || improvedResult) && (
            <div className="grid md:grid-cols-2 gap-6 border-t pt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Original Method</CardTitle>
                  <CardDescription>Basic pink area detection</CardDescription>
                </CardHeader>
                <CardContent>
                  {originalResult ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Areas:</span>
                          <div className="font-medium">{originalResult.detection.areas}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Pixels:</span>
                          <div className="font-medium">{originalResult.detection.totalPixels.toLocaleString()}</div>
                        </div>
                      </div>
                      <img
                        src={originalResult.mockup}
                        alt="Original result"
                        className="w-full border rounded-lg"
                        data-testid="img-original-result"
                      />
                      <Button
                        onClick={() => downloadResult(originalResult, "original-result.jpg")}
                        variant="outline"
                        size="sm"
                        className="w-full"
                        data-testid="button-download-original"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Original
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      {testOriginal.isPending ? "Processing..." : "Waiting for test..."}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Improved Method
                    <ArrowRight className="w-4 h-4 text-green-500" />
                  </CardTitle>
                  <CardDescription>Enhanced placement algorithms</CardDescription>
                </CardHeader>
                <CardContent>
                  {improvedResult ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Areas:</span>
                          <div className="font-medium">{improvedResult.detection.areas}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Pixels:</span>
                          <div className="font-medium">{improvedResult.detection.totalPixels.toLocaleString()}</div>
                        </div>
                      </div>
                      <img
                        src={improvedResult.mockup}
                        alt="Improved result"
                        className="w-full border rounded-lg"
                        data-testid="img-improved-result"
                      />
                      <Button
                        onClick={() => downloadResult(improvedResult, "improved-result.jpg")}
                        variant="outline"
                        size="sm"
                        className="w-full"
                        data-testid="button-download-improved"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Improved
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      {testImproved.isPending ? "Processing..." : "Waiting for test..."}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}