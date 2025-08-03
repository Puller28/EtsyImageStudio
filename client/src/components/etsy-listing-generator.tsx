import { useState } from "react";
import { Wand2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface EtsyListing {
  title: string;
  tags: string[];
  description: string;
}

interface EtsyListingGeneratorProps {
  onGenerate: (data: { artworkTitle: string; styleKeywords: string }) => void;
  generatedListing?: EtsyListing;
  isGenerating?: boolean;
}

export default function EtsyListingGenerator({ onGenerate, generatedListing, isGenerating }: EtsyListingGeneratorProps) {
  const [artworkTitle, setArtworkTitle] = useState("");
  const [styleKeywords, setStyleKeywords] = useState("");
  const { toast } = useToast();

  const handleGenerate = () => {
    if (!artworkTitle.trim() || !styleKeywords.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in both artwork title and style keywords.",
        variant: "destructive",
      });
      return;
    }
    onGenerate({ artworkTitle, styleKeywords });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Content copied to clipboard.",
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          <svg className="inline w-5 h-5 text-primary mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C13.1 2 14 2.9 14 4V8C14 9.1 13.1 10 12 10S10 9.1 10 8V4C10 2.9 10.9 2 12 2M21 9V7L19 5V3H16V1H8V3H5V5L3 7V9H1V11H3V13L5 15V17H8V19H16V17H19V15L21 13V11H23V9H21Z" />
          </svg>
          Etsy Listing Generator
        </h3>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="artwork-title" className="block text-sm font-medium text-gray-700 mb-2">
              Artwork Title/Idea
            </Label>
            <Input
              id="artwork-title"
              placeholder="e.g. Mountain Landscape Sunset"
              value={artworkTitle}
              onChange={(e) => setArtworkTitle(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="style-keywords" className="block text-sm font-medium text-gray-700 mb-2">
              Style Keywords
            </Label>
            <Input
              id="style-keywords"
              placeholder="e.g. watercolor, boho, minimalist"
              value={styleKeywords}
              onChange={(e) => setStyleKeywords(e.target.value)}
            />
          </div>
          
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            {isGenerating ? "Generating..." : "Generate SEO Content"}
          </Button>
        </div>

        {/* Generated Content Preview */}
        {generatedListing && (
          <div className="mt-6 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">Generated Title</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(generatedListing.title)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <p>{generatedListing.title}</p>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">Tags ({generatedListing.tags.length})</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(generatedListing.tags.join(", "))}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex flex-wrap gap-1 text-xs">
                  {generatedListing.tags.map((tag, index) => (
                    <span key={index} className="bg-primary text-white px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">Description</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(generatedListing.description)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-2">
                {generatedListing.description.split('\n\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
