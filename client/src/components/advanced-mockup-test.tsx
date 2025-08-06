import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, Image as ImageIcon, Wand2, Download, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PlacementResult {
  success: boolean;
  mockup: string;
  detection: {
    method: string;
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

export default function AdvancedMockupTest() {
  const [mockupFile, setMockupFile] = useState<File | null>(null);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [mockupPreview, setMockupPreview] = useState<string>("");
  const [artworkPreview, setArtworkPreview] = useState<string>("");
  const [results, setResults] = useState<{[key: string]: PlacementResult}>({});
  const [activeTab, setActiveTab] = useState("improved");
  const { toast } = useToast();

  // Different placement methods
  const methods = [
    { 
      key: "improved", 
      name: "Coordinate-Based Placement", 
      endpoint: "/api/improved-pink-placement",
      description: "Precise pixel-perfect placement using exact coordinates"
    },
    { 
      key: "original", 
      name: "Original Pink Detection", 
      endpoint: "/api/test-pink-mockup",
      description: "Legacy color detection method (slower, less reliable)"
    }
  ];

  const testMethod = useMutation({
    mutationFn: async ({ method, endpoint }: { method: string, endpoint: string }) => {
      if (!mockupFile || !artworkFile) {
        throw new Error("Both mockup template and artwork are required");
      }

      const formData = new FormData();
      formData.append("mockup", mockupFile);
      formData.append("artwork", artworkFile);

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `${method} failed`);
      }

      return { method, result: await response.json() as PlacementResult };
    },
    onSuccess: ({ method, result }) => {
      setResults(prev => ({ ...prev, [method]: result }));
      toast({
        title: "Method Completed",
        description: `${method} generated mockup successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Method Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testCoordinateMethod = async () => {
    const coordinateMethod = methods.find(m => m.key === "improved");
    if (coordinateMethod) {
      try {
        await testMethod.mutateAsync({ 
          method: coordinateMethod.key, 
          endpoint: coordinateMethod.endpoint 
        });
        setActiveTab("improved"); // Switch to coordinate result
      } catch (error) {
        console.log(`${coordinateMethod.name} failed:`, error);
      }
    }
  };

  const testAllMethods = async () => {
    for (const method of methods) {
      try {
        await testMethod.mutateAsync({ method: method.key, endpoint: method.endpoint });
        // Add delay between methods to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.log(`${method.name} failed:`, error);
      }
    }
  };

  const handleMockupUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setMockupFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setMockupPreview(e.target?.result as string);
      reader.readAsDataURL(file);
      setResults({}); // Clear previous results
    }
  };

  const handleArtworkUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setArtworkFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setArtworkPreview(e.target?.result as string);
      reader.readAsDataURL(file);
      setResults({}); // Clear previous results
    }
  };

  const downloadResult = (method: string) => {
    const result = results[method];
    if (!result?.mockup) return;
    
    const link = document.createElement('a');
    link.href = result.mockup;
    link.download = `${method}-mockup-result.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" data-testid="advanced-mockup-test">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-blue-500" />
            Coordinate-Based Mockup Generator
          </CardTitle>
          <CardDescription>
            Generate mockups using precise coordinate-based placement for perfect positioning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Section */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Mockup Template Upload */}
            <div className="space-y-3">
              <Label htmlFor="mockup-upload" className="text-sm font-medium">
                Mockup Template
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

          {/* Test Controls */}
          <div className="flex justify-center gap-4">
            <Button
              onClick={testCoordinateMethod}
              disabled={!mockupFile || !artworkFile || testMethod.isPending}
              size="lg"
              className="px-8 bg-blue-600 hover:bg-blue-700"
              data-testid="button-test-coordinate"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              {testMethod.isPending ? "Testing..." : "Test Coordinate Placement"}
            </Button>
            <Button
              onClick={testAllMethods}
              disabled={!mockupFile || !artworkFile || testMethod.isPending}
              size="lg"
              variant="outline"
              className="px-8"
              data-testid="button-test-all"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Compare All Methods
            </Button>
          </div>

          {/* Results Tabs */}
          {Object.keys(results).length > 0 && (
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold">Comparison Results</h3>
              
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-5">
                  {methods.map(method => (
                    <TabsTrigger 
                      key={method.key} 
                      value={method.key}
                      disabled={!results[method.key]}
                      className="text-xs"
                    >
                      {method.name.split(' ')[0]}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {methods.map(method => {
                  const result = results[method.key];
                  if (!result) return null;
                  
                  return (
                    <TabsContent key={method.key} value={method.key} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{method.name}</h4>
                          <p className="text-sm text-gray-600">{method.description}</p>
                        </div>
                        <Button
                          onClick={() => downloadResult(method.key)}
                          variant="outline"
                          size="sm"
                          data-testid={`button-download-${method.key}`}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>

                      {/* Detection Information */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-medium mb-2">Detection Results</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Method:</span>
                            <div className="font-medium" data-testid={`text-method-${method.key}`}>
                              {result.detection.method}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Areas Found:</span>
                            <div className="font-medium" data-testid={`text-areas-${method.key}`}>
                              {result.detection.areas}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Total Pixels:</span>
                            <div className="font-medium" data-testid={`text-pixels-${method.key}`}>
                              {result.detection.totalPixels.toLocaleString()}
                            </div>
                          </div>
                          {result.detection.largestArea && (
                            <div>
                              <span className="text-gray-600">Largest Area:</span>
                              <div className="font-medium" data-testid={`text-area-${method.key}`}>
                                {result.detection.largestArea.width} × {result.detection.largestArea.height}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Result Image */}
                      <div className="flex justify-center">
                        <img
                          src={result.mockup}
                          alt={`${method.name} result`}
                          className="max-w-full h-auto border rounded-lg shadow-lg"
                          data-testid={`img-result-${method.key}`}
                        />
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}