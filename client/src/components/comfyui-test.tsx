import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, Zap, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';

interface ComfyUIStatus {
  success: boolean;
  error?: string;
  info?: any;
}

interface ComfyUIResult {
  success: boolean;
  mockup?: string;
  jobId?: string;
  error?: string;
  info?: {
    method: string;
    processingTime: string;
    workflowUrl?: string;
  };
}

export function ComfyUITest() {
  const [status, setStatus] = useState<ComfyUIStatus | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("Framed artwork in a cozy bedroom with sunlight filtering through linen curtains, natural light, soft shadows, minimalist decor");
  const [steps, setSteps] = useState([20]);
  const [result, setResult] = useState<ComfyUIResult | null>(null);
  const [batchResults, setBatchResults] = useState<any>(null);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const { toast } = useToast();
  const { token } = useAuth();

  const testConnection = async () => {
    setIsTestingConnection(true);
    try {
      // Test the new FastAPI health endpoint
      const response = await fetch('/api/comfyui/healthz');
      const data = await response.json();
      
      if (data.ok) {
        const statusData = { success: true, info: { endpoint: 'FastAPI ComfyUI Service', status: 'Ready' } };
        setStatus(statusData);
        toast({
          title: "Connection Successful",
          description: "FastAPI ComfyUI service is ready for mockup generation",
        });
      } else {
        const errorData = { success: false, error: "FastAPI service not responding correctly" };
        setStatus(errorData);
        toast({
          title: "Connection Failed",
          description: "FastAPI ComfyUI service is not responding correctly",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorData = { success: false, error: "Network error connecting to FastAPI ComfyUI service" };
      setStatus(errorData);
      toast({
        title: "Connection Error",
        description: "Failed to connect to FastAPI ComfyUI service (make sure it's running on port 8000)",
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const generateMockup = async () => {
    if (!artworkFile) {
      toast({
        title: "Missing Artwork",
        description: "Please select an artwork image to generate mockup",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', artworkFile);
      formData.append('prompt', prompt);
      formData.append('negative', 'blurry, low detail, distorted, bad framing, artifacts');
      formData.append('canvas_w', '1024');
      formData.append('canvas_h', '1024');
      formData.append('art_w', '512');
      formData.append('art_h', '512');
      formData.append('pos_x', '256');
      formData.append('pos_y', '256');
      formData.append('steps', steps[0].toString());
      formData.append('cfg', '6.5');
      formData.append('seed', Math.floor(Math.random() * 1000000).toString());
      formData.append('poll_seconds', '90');

      const response = await fetch('/api/comfyui/generate', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      // Handle new backend response format
      if (data.success && data.mockup) {
        setResult(data); // Backend already returns the correct format
        toast({
          title: "Mockup Generated",
          description: `ComfyUI workflow completed successfully (Job: ${data.jobId})`,
        });
      } else if (data.success === false) {
        setResult(data); // Backend returns error in correct format
        toast({
          title: "Generation Failed",
          description: data.error || "ComfyUI workflow failed",
          variant: "destructive",
        });
      } else {
        // Fallback for unexpected format
        const errorResult = { success: false, error: 'Unexpected response format' };
        setResult(errorResult);
        toast({
          title: "Generation Failed",
          description: "Unexpected response from ComfyUI service",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorData = { success: false, error: `Network error: ${error}` };
      setResult(errorData);
      toast({
        title: "Generation Error",
        description: "Failed to communicate with ComfyUI service",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateBatchMockups = async () => {
    if (!artworkFile) {
      toast({
        title: "Missing Artwork",
        description: "Please select an artwork image for batch generation",
        variant: "destructive",
      });
      return;
    }

    setIsBatchGenerating(true);
    setBatchResults(null);

    try {
      const formData = new FormData();
      formData.append('file', artworkFile);
      formData.append('steps', steps[0].toString());
      formData.append('cfg', '6.5');
      formData.append('seed', Math.floor(Math.random() * 1000000).toString());
      formData.append('poll_seconds', '90');

      const response = await fetch('/api/comfyui/batch', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      setBatchResults(data);

      const successful = data.items?.filter((item: any) => item.result?.status === 'COMPLETED').length || 0;
      const failed = data.items?.filter((item: any) => item.result?.status === 'FAILED').length || 0;

      toast({
        title: "Batch Generation Complete",
        description: `Generated ${successful} successful mockups, ${failed} failed`,
      });
    } catch (error) {
      toast({
        title: "Batch Generation Error",
        description: "Failed to communicate with ComfyUI service",
        variant: "destructive",
      });
    } finally {
      setIsBatchGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            ComfyUI Integration Test
          </CardTitle>
          <CardDescription>
            Test connection to FastAPI ComfyUI service for LatentComposite mockup generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center gap-4">
            <Button 
              onClick={testConnection} 
              disabled={isTestingConnection}
              data-testid="button-test-connection"
            >
              {isTestingConnection ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Test Connection
            </Button>
            
            {status && (
              <div className="flex items-center gap-2">
                {status.success ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600">Connected</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-600">Failed</span>
                  </>
                )}
              </div>
            )}
          </div>

          {status && !status.success && (
            <Alert>
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Connection Error:</strong> {status.error}
                <br />
                <small>Ensure your RunPod instance is running and the URL is correct.</small>
              </AlertDescription>
            </Alert>
          )}

          {status && status.success && status.info && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>ComfyUI Ready:</strong> System stats received
                <br />
                <small>Your RunPod instance is accessible and ready for workflows.</small>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generate Mockup</CardTitle>
          <CardDescription>
            Upload artwork to be placed exactly as framed piece on generated bedroom background using LatentComposite
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="artwork">Artwork Image</Label>
            <Input
              id="artwork"
              type="file"
              accept="image/*"
              onChange={(e) => setArtworkFile(e.target.files?.[0] || null)}
              data-testid="input-artwork"
            />
            {artworkFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {artworkFile.name} - Will be scaled to 512×512 and placed on bedroom wall
              </p>
            )}
          </div>

          {/* Workflow Parameters */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the mockup style and setting you want..."
                data-testid="textarea-prompt"
              />
            </div>

            <div className="space-y-2">
              <Label>Steps: {steps[0]}</Label>
              <Slider
                value={steps}
                onValueChange={setSteps}
                min={15}
                max={30}
                step={5}
                data-testid="slider-steps"
              />
              <p className="text-xs text-muted-foreground">
                Number of diffusion steps for background generation (your artwork is preserved exactly)
              </p>
            </div>
          </div>

          {/* Generate Button */}
          <Button 
            onClick={generateMockup} 
            disabled={!artworkFile || isGenerating || !status?.success}
            className="w-full"
            data-testid="button-generate-mockup"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating Mockup...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Generate ComfyUI Mockup
              </>
            )}
          </Button>

          {!status?.success && (
            <p className="text-sm text-muted-foreground text-center">
              Test connection first before generating mockups
            </p>
          )}
        </CardContent>
      </Card>

      {/* Batch Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Generation</CardTitle>
          <CardDescription>
            Generate 5 different room styles with your artwork using preset prompts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={generateBatchMockups} 
            disabled={!artworkFile || isBatchGenerating || !status?.success}
            className="w-full"
            variant="outline"
            data-testid="button-batch-generate"
          >
            {isBatchGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating 5 Room Styles...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Generate 5 Room Styles
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Gallery wall • Cozy bedroom • Living room • Minimalist hallway • Rustic study
          </p>
        </CardContent>
      </Card>

      {/* Single Result */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>
              {result.success ? "Generated Mockup" : "Generation Error"}
            </CardTitle>
            {result.info && (
              <CardDescription>
                Method: {result.info.method} | Time: {result.info.processingTime}
                {result.jobId && ` | Job ID: ${result.jobId}`}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {result.success && result.mockup ? (
              <div className="space-y-4">
                <img 
                  src={result.mockup} 
                  alt="Generated Mockup" 
                  className="w-full max-w-2xl mx-auto rounded-lg border"
                  data-testid="img-generated-mockup"
                />
                {result.info?.workflowUrl && (
                  <p className="text-sm text-muted-foreground text-center">
                    <a 
                      href={result.info.workflowUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      View Original on ComfyUI
                    </a>
                  </p>
                )}
              </div>
            ) : (
              <Alert>
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Error:</strong> {result.error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Batch Results */}
      {batchResults && (
        <Card>
          <CardHeader>
            <CardTitle>
              Batch Results ({batchResults.count} generated)
            </CardTitle>
            <CardDescription>
              Multiple room styles with your artwork
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {batchResults.items?.map((item: any, index: number) => (
                <div key={index} className="space-y-2">
                  <h4 className="font-medium text-sm">{item.prompt}</h4>
                  {item.result?.status === 'COMPLETED' && item.result.output?.[0] ? (
                    <img 
                      src={item.result.output[0]} 
                      alt={`Batch mockup ${index + 1}`}
                      className="w-full rounded border"
                    />
                  ) : (
                    <div className="bg-gray-100 dark:bg-gray-800 rounded p-4 text-center">
                      <XCircle className="h-6 w-6 mx-auto text-red-500 mb-2" />
                      <p className="text-sm text-red-600">
                        {item.error || item.result?.error || 'Generation failed'}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}