import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Download, Loader2, Image as ImageIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";

// Helper function to get auth token
function getAuthToken(): string | null {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      return parsed.token || parsed.state?.token;
    }
    return null;
  } catch {
    return null;
  }
}

type GenerationMode = "single_template" | "all_templates";
type Template = "living_room" | "bedroom" | "study" | "gallery" | "kitchen";

interface MockupResult {
  template: string;
  variation: number;
  image: string;
  metadata: { style: string };
}

interface ApiResponse {
  success: boolean;
  mode: GenerationMode;
  template?: string;
  mockups: MockupResult[];
  count: number;
}

export function TemplateMockupTest() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<GenerationMode>("single_template");
  const [template, setTemplate] = useState<Template>("bedroom");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MockupResult[]>([]);
  const [error, setError] = useState<string>("");
  const [progress, setProgress] = useState(0);

  const availableTemplates: Template[] = ["living_room", "bedroom", "study", "gallery", "kitchen"];
  const MAX_VARIATIONS = 10;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (selectedFile.size > maxSize) {
        setError(`File is too large. Maximum size allowed is 5MB. Your file is ${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB.`);
        return;
      }
      
      setFile(selectedFile);
      setError("");
    }
  };



  const handleGenerateSequential = async () => {
    if (!file) {
      setError("Please select an image file");
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);
    setProgress(0);

    const token = getAuthToken();
    console.log('🔍 Starting sequential mockup generation:', { hasToken: !!token, mode, template });

    try {
      let stylesToProcess: Template[] = [];
      
      if (mode === 'single_template') {
        // Generate multiple variations of the single template (up to MAX_VARIATIONS)
        stylesToProcess = Array(MAX_VARIATIONS).fill(template) as Template[];
      } else {
        // Generate one mockup for each available template (up to MAX_VARIATIONS)
        stylesToProcess = availableTemplates.slice(0, MAX_VARIATIONS);
      }

      const totalSteps = stylesToProcess.length;
      let completedResults: MockupResult[] = [];

      // Process each style sequentially
      for (let i = 0; i < stylesToProcess.length; i++) {
        const currentStyle = stylesToProcess[i];
        
        console.log(`🔄 Processing style ${i + 1}/${totalSteps}: ${currentStyle}`);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('style', currentStyle);

        const response = await fetch('/api/generate-single-mockup', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData,
          // Increase timeout for OpenAI API calls
          signal: AbortSignal.timeout(300000) // 5 minutes
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Error on style ${currentStyle}:`, { status: response.status, text: errorText });
          
          // Parse error response for user-friendly messages
          try {
            const errorData = JSON.parse(errorText);
            if (response.status === 403 && errorData.requiresUpgrade) {
              throw new Error(errorData.message || "Mockup generation requires a paid plan. Upgrade to Pro or Business plan to generate AI mockups.");
            } else if (response.status === 402) {
              throw new Error(`Insufficient credits. Need ${errorData.creditsNeeded || MAX_VARIATIONS} credits for mockup generation.`);
            } else {
              throw new Error(errorData.error || errorData.message || `Failed to generate ${currentStyle} mockup`);
            }
          } catch (parseError) {
            // If JSON parsing fails, use generic error message
            if (response.status === 403) {
              throw new Error("Mockup generation requires a paid plan. Upgrade to Pro or Business plan to generate AI mockups.");
            } else if (response.status === 402) {
              throw new Error(`Insufficient credits. Need ${MAX_VARIATIONS} credits for mockup generation.`);
            } else {
              throw new Error(`Failed to generate ${currentStyle} mockup. Please try again.`);
            }
          }
        }

        const result = await response.json();
        console.log(`✅ Generated mockup for ${currentStyle}:`, result);
        
        // Handle the new FastAPI response format: {"styles": {"style_name": [{"filename": "...", "image_data": "data:image/jpeg;base64,..."}]}}
        if (result.styles && typeof result.styles === 'object') {
          const styleName = Object.keys(result.styles)[0]; // Get first style
          const styleImages = result.styles[styleName];
          
          if (Array.isArray(styleImages) && styleImages.length > 0) {
            const imageData = styleImages[0]; // Get first image
            
            if (imageData.image_data) {
              // Extract base64 data from data URL
              const base64Data = imageData.image_data.replace(/^data:image\/[a-z]+;base64,/, '');
              
              const variationNum = mode === 'single_template' ? i + 1 : 1;
              const mockupResult: MockupResult = {
                template: currentStyle,
                variation: variationNum,
                image: base64Data,
                metadata: { style: currentStyle }
              };
              
              completedResults.push(mockupResult);
              setResults([...completedResults]); // Show results as they come in
            }
          }
        } else {
          console.warn(`⚠️ Unexpected response format for ${currentStyle}:`, result);
        }

        // Update progress
        const progressPercent = ((i + 1) / totalSteps) * 100;
        setProgress(progressPercent);
      }

      console.log(`🎉 Sequential generation complete! Generated ${completedResults.length} mockups`);
      
    } catch (err) {
      console.error('❌ Sequential generation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Error details:', errorMessage);
      setError(`Mockup generation failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadMockup = (mockup: MockupResult, index: number) => {
    const link = document.createElement("a");
    link.href = `data:image/jpeg;base64,${mockup.image}`;
    link.download = `mockup_${mockup.template}_${mockup.variation}_${index + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Template Mockup Generator
          </CardTitle>
          <CardDescription>
            Generate mockups using predefined room templates via our mockup service
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="artwork">Upload Artwork</Label>
            <Input
              id="artwork"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={loading}
              data-testid="input-artwork-file"
            />
            <p className="text-xs text-gray-500">JPG, PNG up to 5MB</p>
            {file && (
              <Badge variant="secondary" className="mt-2">
                Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(1)}MB)
              </Badge>
            )}
          </div>

          <Separator />

          {/* Generation Mode */}
          <div className="space-y-4">
            <Label>Generation Mode</Label>
            <RadioGroup 
              value={mode} 
              onValueChange={(value) => setMode(value as GenerationMode)}
              disabled={loading}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single_template" id="single" data-testid="radio-single-template" />
                <Label htmlFor="single">{MAX_VARIATIONS} variations of one template</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all_templates" id="all" data-testid="radio-all-templates" />
                <Label htmlFor="all">1 mockup from each of the {availableTemplates.length} templates</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Template Selection (only for single_template mode) */}
          {mode === "single_template" && (
            <div className="space-y-2">
              <Label htmlFor="template">Select Template</Label>
              <Select value={template} onValueChange={(value) => setTemplate(value as Template)} disabled={loading}>
                <SelectTrigger data-testid="select-template">
                  <SelectValue placeholder="Choose a room template" />
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates.map((tmpl) => (
                    <SelectItem key={tmpl} value={tmpl} data-testid={`template-${tmpl}`}>
                      {tmpl.replace("_", " ").toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          {/* Generate Button */}
          <Button 
            onClick={handleGenerateSequential}
            disabled={!file || loading}
            className="w-full"
            data-testid="button-generate-mockups"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Generate ${mode === "single_template" ? `${MAX_VARIATIONS} Variations` : `${availableTemplates.length} Templates`}`
            )}
          </Button>

          {/* Progress Bar */}
          {loading && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                {progress < 50 ? "Processing artwork..." : progress < 90 ? "Generating mockups..." : "Finalizing..."}
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" data-testid="alert-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results Display */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Mockups ({results.length})</CardTitle>
            <CardDescription>
              {mode === "single_template" 
                ? `${MAX_VARIATIONS} variations of ${template?.replace("_", " ")}`
                : "1 mockup from each template"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((mockup, index) => (
                <Card key={index} className="overflow-hidden">
                  <div className="aspect-square relative bg-gray-100">
                    <img
                      src={`data:image/jpeg;base64,${mockup.image}`}
                      alt={`${mockup.template} mockup ${mockup.variation}`}
                      className="w-full h-full object-cover"
                      data-testid={`mockup-${index}`}
                    />
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge variant="outline" className="mb-2">
                          {mockup.template.replace("_", " ").toUpperCase()}
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          Variation {mockup.variation}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadMockup(mockup, index)}
                        data-testid={`button-download-${index}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
