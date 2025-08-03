import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Wand2, Sparkles, Palette } from "lucide-react";

interface AIArtGeneratorProps {
  onArtworkGenerated: (imageData: string, prompt: string) => void;
}

export default function AIArtGenerator({ onArtworkGenerated }: AIArtGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("enhance");
  const [artCategory, setArtCategory] = useState("digital art");
  const { toast } = useToast();

  const generateArtMutation = useMutation({
    mutationFn: async (data: {
      prompt: string;
      negativePrompt?: string;
      style?: string;
      category?: string;
    }) => {
      return apiRequest("/api/generate-art", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (result) => {
      if (result.image) {
        onArtworkGenerated(result.image, prompt);
        toast({
          title: "Artwork Generated!",
          description: "Your AI artwork has been created successfully.",
        });
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
      return;
    }

    generateArtMutation.mutate({
      prompt,
      negativePrompt: negativePrompt || undefined,
      style: selectedStyle,
      category: artCategory,
    });
  };

  const artStyles = [
    { value: "enhance", label: "Enhanced (Default)" },
    { value: "photographic", label: "Photographic" },
    { value: "digital-art", label: "Digital Art" },
    { value: "fantasy-art", label: "Fantasy Art" },
    { value: "comic-book", label: "Comic Book" },
    { value: "line-art", label: "Line Art" },
    { value: "watercolor", label: "Watercolor" },
    { value: "neon-punk", label: "Cyberpunk" },
    { value: "isometric", label: "Isometric" },
    { value: "pixel-art", label: "Pixel Art" },
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
        <div className="flex items-center justify-center gap-2 mb-2">
          <Wand2 className="h-6 w-6 text-purple-600" />
          <CardTitle className="text-2xl">AI Art Generator</CardTitle>
          <Sparkles className="h-6 w-6 text-purple-600" />
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Create unique digital artwork perfect for Etsy using AI
        </p>
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
          
          {/* Art Style */}
          <div className="space-y-2">
            <Label htmlFor="style">Art Style</Label>
            <Select value={selectedStyle} onValueChange={setSelectedStyle}>
              <SelectTrigger>
                <SelectValue placeholder="Choose art style" />
              </SelectTrigger>
              <SelectContent>
                {artStyles.map((style) => (
                  <SelectItem key={style.value} value={style.value}>
                    {style.label}
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