import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Wand2, Sparkles, Palette, ArrowLeft } from "lucide-react";
import { analytics } from "@/lib/analytics";

interface AIArtGeneratorProps {
  onArtworkGenerated: (imageData: string, prompt: string) => void;
  onBackToChoice?: () => void; // To go back to initial choice
}

export default function AIArtGenerator({ onArtworkGenerated, onBackToChoice }: AIArtGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [selectedAspectRatio, setSelectedAspectRatio] = useState("1:1");
  const [artCategory, setArtCategory] = useState("digital art");
  const { toast } = useToast();

  const generateArtMutation = useMutation({
    mutationFn: async (data: {
      prompt: string;
      negativePrompt?: string;
      aspectRatio?: string;
      category?: string;
    }) => {
      const response = await apiRequest("POST", "/api/generate-art", data);
      return response.json();
    },
    onSuccess: (result) => {
      if (result.image) {
        onArtworkGenerated(result.image, prompt);
        toast({
          title: "Artwork Generated!",
          description: "Your AI artwork has been created successfully. 2 credits were used.",
        });
        // Refresh user data to show updated credits
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      }
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate artwork. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter a description for your artwork.",
        variant: "destructive",
      });
      analytics.errorEncounter('empty_prompt', 'ai_art_generation', 'User attempted to generate art without prompt');
      return;
    }

    // Track AI art generation
    analytics.aiArtGenerate(prompt, 2); // 2 credits used
    analytics.funnelStep('ai_art_generation', 1);

    generateArtMutation.mutate({
      prompt,
      negativePrompt: negativePrompt || undefined,
      aspectRatio: selectedAspectRatio,
      category: artCategory,
    });
  };

  const aspectRatios = [
    { value: "1:1", label: "Square (1:1)" },
    { value: "3:4", label: "Portrait (3:4)" },
    { value: "4:3", label: "Landscape (4:3)" },
  ];

  const artCategories = [
    { value: "digital art", label: "Digital Art" },
    { value: "abstract art", label: "Abstract" },
    { value: "landscape", label: "Landscape" },
    { value: "portrait", label: "Portrait" },
    { value: "nature", label: "Nature" },
    { value: "geometric", label: "Geometric" },
    { value: "minimalist", label: "Minimalist" },
    { value: "vintage", label: "Vintage" },
    { value: "modern", label: "Modern" },
    { value: "botanical", label: "Botanical" },
  ];

  const promptSuggestions = [
    "A serene mountain landscape with vibrant sunset colors",
    "Abstract geometric patterns in gold and navy blue",
    "Minimalist botanical illustration of eucalyptus leaves",
    "Vintage-style coffee shop with warm lighting",
    "Modern cityscape silhouette at golden hour",
    "Watercolor flowers in soft pastel colors",
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-between mb-4">
          {onBackToChoice && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToChoice}
              className="text-gray-500 hover:text-gray-700"
              data-testid="button-back-to-choice"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Options
            </Button>
          )}
          <div className="flex items-center justify-center gap-2 mx-auto">
            <Wand2 className="h-6 w-6 text-purple-600" />
            <CardTitle className="text-2xl">AI Art Generator</CardTitle>
            <Sparkles className="h-6 w-6 text-purple-600" />
          </div>
          <div className="w-[100px]"></div> {/* Spacer for alignment */}
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Generate high-quality artwork using Google's Imagen 3 AI model
        </p>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
          <p className="text-sm text-purple-700 font-medium">
            💎 AI Art Generation: 2 Credits per Image
          </p>
          <p className="text-xs text-purple-600 mt-1">
            Each generated artwork costs 2 credits
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Art Category */}
        <div className="space-y-2">
          <Label htmlFor="category" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Art Category
          </Label>
          <Select value={artCategory} onValueChange={setArtCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Choose art category" />
            </SelectTrigger>
            <SelectContent>
              {artCategories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Main Prompt */}
        <div className="space-y-2">
          <Label htmlFor="prompt">
            Artwork Description <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="prompt"
            placeholder="Describe the artwork you want to create..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Prompt Suggestions */}
        <div className="space-y-2">
          <Label className="text-sm text-gray-600 dark:text-gray-400">
            Quick Ideas (click to use):
          </Label>
          <div className="flex flex-wrap gap-2">
            {promptSuggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setPrompt(suggestion)}
                className="text-xs h-auto py-1 px-2 whitespace-normal text-left"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Advanced Options */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Advanced Options</h4>
          
          {/* Aspect Ratio */}
          <div className="space-y-2">
            <Label htmlFor="aspectRatio">Image Format</Label>
            <Select value={selectedAspectRatio} onValueChange={setSelectedAspectRatio}>
              <SelectTrigger>
                <SelectValue placeholder="Choose image format" />
              </SelectTrigger>
              <SelectContent>
                {aspectRatios.map((ratio) => (
                  <SelectItem key={ratio.value} value={ratio.value}>
                    {ratio.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Negative Prompt */}
          <div className="space-y-2">
            <Label htmlFor="negativePrompt">
              Avoid in Image (Optional)
            </Label>
            <Input
              id="negativePrompt"
              placeholder="e.g., blurry, dark, text, watermark"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Specify what you don't want in the image
            </p>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={generateArtMutation.isPending || !prompt.trim()}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          size="lg"
        >
          {generateArtMutation.isPending ? (
            <>
              <Wand2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Artwork...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate AI Artwork
            </>
          )}
        </Button>

        {generateArtMutation.isPending && (
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            This may take 30-60 seconds. Creating high-quality art takes time!
          </div>
        )}
      </CardContent>
    </Card>
  );
}