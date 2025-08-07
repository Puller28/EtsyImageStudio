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
  const [mockupFile, setMockupFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("Create a professional product mockup in a modern living room setting");
  const [strength, setStrength] = useState([0.8]);
  const [steps, setSteps] = useState([20]);
  const [result, setResult] = useState<ComfyUIResult | null>(null);
  const { toast } = useToast();

  const testConnection = async () => {
    setIsTestingConnection(true);
    try {
      const response = await fetch('/api/comfyui-status');
      const data = await response.json();
      setStatus(data);
      
      if (data.success) {
        toast({
          title: "Connection Successful",
          description: "ComfyUI service is ready for mockup generation",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: data.error || "Unable to connect to ComfyUI service",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorData = { success: false, error: "Network error connecting to ComfyUI" };
      setStatus(errorData);
      toast({
        title: "Connection Error",
        description: "Failed to test ComfyUI connection",
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
      formData.append('artwork', artworkFile);
      if (mockupFile) {
        formData.append('mockupTemplate', mockupFile);
      }
      formData.append('prompt', prompt);
      formData.append('strength', strength[0].toString());
      formData.append('steps', steps[0].toString());

      const response = await fetch('/api/comfyui-mockup', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        toast({
          title: "Mockup Generated",
          description: `ComfyUI workflow completed successfully (Job: ${data.jobId})`,
        });
      } else {
        toast({
          title: "Generation Failed",
          description: data.error || "ComfyUI mockup generation failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorData = { success: false, error: "Network error during generation" };
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            ComfyUI Integration Test
          </CardTitle>
          <CardDescription>
            Test your RunPod ComfyUI 5.2.0 instance for AI-powered mockup generation
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
            Upload your artwork and configure ComfyUI workflow parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Uploads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="artwork">Artwork Image (Required)</Label>
              <Input
                id="artwork"
                type="file"
                accept="image/*"
                onChange={(e) => setArtworkFile(e.target.files?.[0] || null)}
                data-testid="input-artwork"
              />
              {artworkFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {artworkFile.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mockup-template">Mockup Template (Optional)</Label>
              <Input
                id="mockup-template"
                type="file"
                accept="image/*"
                onChange={(e) => setMockupFile(e.target.files?.[0] || null)}
                data-testid="input-mockup-template"
              />
              {mockupFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {mockupFile.name}
                </p>
              )}
            </div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Strength: {strength[0]}</Label>
                <Slider
                  value={strength}
                  onValueChange={setStrength}
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  data-testid="slider-strength"
                />
                <p className="text-xs text-muted-foreground">
                  How much the workflow should modify the input
                </p>
              </div>

              <div className="space-y-2">
                <Label>Steps: {steps[0]}</Label>
                <Slider
                  value={steps}
                  onValueChange={setSteps}
                  min={10}
                  max={50}
                  step={5}
                  data-testid="slider-steps"
                />
                <p className="text-xs text-muted-foreground">
                  Number of diffusion steps (higher = better quality)
                </p>
              </div>
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

      {/* Results */}
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
    </div>
  );
}