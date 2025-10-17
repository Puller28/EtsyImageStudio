import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import AIArtGenerator from "@/components/ai-art-generator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, RefreshCw, ArrowRight, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function GenerateToolPage({ showIntro = true }: { showIntro?: boolean }) {
  const [, navigate] = useLocation();
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");
  const [tempProjectId, setTempProjectId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleArtworkGenerated = (imageData: string, prompt: string, projectId?: string) => {
    setGeneratedImage(imageData);
    setGeneratedPrompt(prompt);
    if (projectId) {
      setTempProjectId(projectId);
    }
  };

  const handleRegenerate = () => {
    // Reset to show the generator again
    setGeneratedImage(null);
    setGeneratedPrompt("");
    setTempProjectId(null);
  };

  const handleUseArtwork = () => {
    if (tempProjectId) {
      // Navigate directly to workflow with the AI-generated project pre-selected
      // This provides a clear next step: upscale, create mockups, etc.
      navigate(`/workflow/run?project=${tempProjectId}`);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `ai-artwork-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Download Started",
      description: "Your AI artwork is being downloaded.",
    });
  };

  const handleBackToChoice = () => {
    navigate("/workspace");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {showIntro && !generatedImage && (
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI Art Generator
          </h1>
          <p className="text-gray-600">
            Create stunning digital artwork using Google's Imagen 3 AI model
          </p>
        </div>
      )}

      {generatedImage ? (
        <div className="space-y-6">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="flex items-center gap-3 p-4">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Artwork Generated Successfully!</p>
                <p className="text-sm text-green-700">
                  Review your artwork below and decide what to do next.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Your AI Artwork</CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={generatedImage}
                  alt="Generated artwork"
                  className="w-full rounded-lg shadow-lg"
                />
                {generatedPrompt && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-500 mb-1">Prompt Used:</p>
                    <p className="text-sm text-gray-700">{generatedPrompt}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>What would you like to do?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button
                    onClick={handleUseArtwork}
                    className="w-full bg-primary hover:bg-primary/90 text-white"
                    size="lg"
                  >
                    <ArrowRight className="mr-2 h-5 w-5" />
                    Start Workflow with This Artwork
                  </Button>
                  <p className="text-xs text-gray-500 text-center">
                    Upscale, create mockups, print formats, and Etsy listings
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <Button
                  onClick={handleRegenerate}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Generate New Artwork
                </Button>

                <Button
                  onClick={handleDownload}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Image
                </Button>

                <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">Next Steps:</h4>
                  <ul className="text-sm text-purple-700 space-y-1">
                    <li>• Upscale to 4x resolution for print quality</li>
                    <li>• Generate mockups in various room settings</li>
                    <li>• Create print-ready formats (8x10, 16x20, etc.)</li>
                    <li>• Generate Etsy listing copy</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <AIArtGenerator
          onArtworkGenerated={handleArtworkGenerated}
          onBackToChoice={handleBackToChoice}
        />
      )}
    </div>
  );
}
