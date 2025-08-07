// Using native fetch API available in Node.js 18+
import fs from 'fs';
import path from 'path';

export interface ComfyUIConfig {
  runpodUrl: string;
  apiKey?: string;
  workflowJson: any;
}

export interface ComfyUIInput {
  artworkImage: Buffer;
  mockupTemplate?: Buffer;
  prompt?: string;
  strength?: number;
  steps?: number;
}

export interface ComfyUIResult {
  success: boolean;
  mockupUrl?: string;
  mockupBuffer?: Buffer;
  error?: string;
  jobId?: string;
  status?: 'queued' | 'running' | 'completed' | 'failed';
}

export class ComfyUIService {
  private config: ComfyUIConfig;

  constructor(config: ComfyUIConfig) {
    this.config = config;
  }

  /**
   * Generate a mockup using ComfyUI workflow
   */
  async generateMockup(input: ComfyUIInput): Promise<ComfyUIResult> {
    try {
      console.log('🎨 Starting ComfyUI mockup generation...');
      
      // Step 1: Upload artwork image to ComfyUI
      const imageUploadResult = await this.uploadImage(input.artworkImage, 'artwork.jpg');
      if (!imageUploadResult.success) {
        throw new Error(`Failed to upload artwork: ${imageUploadResult.error}`);
      }

      // Step 2: Prepare workflow with image data
      const workflowData = this.prepareWorkflow('input_image.jpg', input);

      // Step 3: Queue the workflow with image data
      const queueResult = await this.queueWorkflow(workflowData, input.artworkImage);
      if (!queueResult.success) {
        throw new Error(`Failed to queue workflow: ${queueResult.error}`);
      }

      console.log(`🎨 ComfyUI job queued with ID: ${queueResult.jobId}`);

      // Step 4: Poll for completion
      const result = await this.pollForCompletion(queueResult.jobId!);
      
      return result;

    } catch (error) {
      console.error('🎨 ComfyUI mockup generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Upload an image to ComfyUI (RunPod Serverless)
   */
  private async uploadImage(imageBuffer: Buffer, filename: string): Promise<{success: boolean, filename?: string, error?: string}> {
    try {
      // For RunPod serverless, we'll include the image in the workflow request
      // rather than uploading separately
      return {
        success: true,
        filename: filename // We'll use this as a placeholder
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Prepare the workflow JSON with the uploaded image and parameters
   */
  private prepareWorkflow(imageFilename: string, input: ComfyUIInput): any {
    const workflow = JSON.parse(JSON.stringify(this.config.workflowJson));
    
    // Update the specific nodes in your bedroom mockup workflow
    const nodes = workflow.nodes;
    
    // Update LoadImage node (node 1) with uploaded image
    const loadImageNode = nodes.find((node: any) => node.id === 1 && node.type === 'LoadImage');
    if (loadImageNode) {
      loadImageNode.widgets_values = [imageFilename];
      console.log('🎨 Updated LoadImage node with:', imageFilename);
    }
    
    // Update PromptInput node (node 2) with custom prompt
    const promptNode = nodes.find((node: any) => node.id === 2 && node.type === 'PromptInput');
    if (promptNode && input.prompt) {
      promptNode.widgets_values = [input.prompt];
      console.log('🎨 Updated PromptInput node with:', input.prompt);
    }
    
    // Update StableDiffusionXL node (node 3) with generation parameters
    const sdxlNode = nodes.find((node: any) => node.id === 3 && node.type === 'StableDiffusionXL');
    if (sdxlNode) {
      if (input.steps) {
        sdxlNode.widgets_values.steps = input.steps;
      }
      if (input.strength) {
        sdxlNode.widgets_values.guidance_scale = input.strength * 10; // Convert 0-1 to 0-10 scale
      }
      console.log('🎨 Updated SDXL node with steps:', input.steps, 'guidance:', sdxlNode.widgets_values.guidance_scale);
    }

    return workflow;
  }

  /**
   * Queue a workflow for execution (RunPod Serverless)
   */
  private async queueWorkflow(workflow: any, imageBuffer?: Buffer): Promise<{success: boolean, jobId?: string, error?: string}> {
    try {
      // Convert image to base64 for RunPod serverless
      const imageBase64 = imageBuffer ? imageBuffer.toString('base64') : '';
      
      // RunPod serverless API format
      const requestBody = {
        input: {
          workflow: workflow,
          image: imageBase64 // Include image data directly
        }
      };

      console.log('🎨 Sending RunPod serverless request...');

      const response = await fetch(`${this.config.runpodUrl}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`RunPod request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json() as any;
      console.log('🎨 RunPod response:', result);
      
      return {
        success: true,
        jobId: result.id || result.jobId // RunPod returns job ID
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Queue failed'
      };
    }
  }

  /**
   * Poll for workflow completion
   */
  private async pollForCompletion(jobId: string, maxWaitTime = 300000): Promise<ComfyUIResult> {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const status = await this.checkJobStatus(jobId);
        
        if (status.status === 'completed') {
          // Get the generated image
          const imageResult = await this.getGeneratedImage(jobId);
          return {
            success: true,
            mockupBuffer: imageResult.buffer,
            mockupUrl: imageResult.url,
            jobId,
            status: 'completed'
          };
        }
        
        if (status.status === 'failed') {
          return {
            success: false,
            error: status.error || 'Workflow execution failed',
            jobId,
            status: 'failed'
          };
        }

        console.log(`🎨 ComfyUI job ${jobId} status: ${status.status}`);
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));

      } catch (error) {
        console.error('🎨 Error polling job status:', error);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    return {
      success: false,
      error: 'Timeout waiting for workflow completion',
      jobId,
      status: 'failed'
    };
  }

  /**
   * Check the status of a queued job (RunPod Serverless)
   */
  private async checkJobStatus(jobId: string): Promise<{status: string, error?: string}> {
    try {
      const response = await fetch(`${this.config.runpodUrl}/status/${jobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });

      if (!response.ok) {
        return { status: 'unknown' };
      }

      const statusData = await response.json() as any;
      console.log('🎨 Job status response:', statusData);
      
      // RunPod serverless status mapping
      switch (statusData.status) {
        case 'IN_QUEUE':
          return { status: 'queued' };
        case 'IN_PROGRESS':
          return { status: 'running' };
        case 'COMPLETED':
          return { status: 'completed' };
        case 'FAILED':
          return { 
            status: 'failed', 
            error: statusData.error || 'Job failed'
          };
        default:
          return { status: 'unknown' };
      }

    } catch (error) {
      console.error('🎨 Error checking job status:', error);
      return { status: 'unknown' };
    }
  }

  /**
   * Get the generated image from a completed job (RunPod Serverless)
   */
  private async getGeneratedImage(jobId: string): Promise<{buffer?: Buffer, url?: string}> {
    try {
      // Get job result from RunPod serverless
      const response = await fetch(`${this.config.runpodUrl}/status/${jobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get job result');
      }

      const jobData = await response.json() as any;
      console.log('🎨 Job result data:', jobData);

      if (!jobData.output) {
        throw new Error('No output found in job result');
      }

      // RunPod serverless typically returns base64 encoded images
      const output = jobData.output;
      let imageBase64: string | null = null;

      // Check different possible output formats
      if (typeof output === 'string') {
        // Direct base64 string
        imageBase64 = output;
      } else if (output.image) {
        // Image in output.image
        imageBase64 = output.image;
      } else if (output.images && output.images.length > 0) {
        // Array of images
        imageBase64 = output.images[0];
      } else if (output.result) {
        // Result wrapper
        imageBase64 = output.result;
      }

      if (!imageBase64) {
        throw new Error('No image data found in job output');
      }

      // Remove data URL prefix if present
      const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      return {
        buffer,
        url: undefined // No direct URL for serverless results
      };

    } catch (error) {
      console.error('🎨 Error getting generated image:', error);
      throw error;
    }
  }

  /**
   * Test the connection to ComfyUI (RunPod Serverless)
   */
  async testConnection(): Promise<{success: boolean, error?: string, info?: any}> {
    try {
      console.log('🎨 Testing RunPod serverless connection to:', this.config.runpodUrl);
      
      // For RunPod serverless, we can test with a simple status request
      // or try a health check endpoint
      const response = await fetch(`${this.config.runpodUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        signal: AbortSignal.timeout(15000) // 15 second timeout for serverless
      });

      console.log('🎨 RunPod health check response:', response.status, response.statusText);

      if (response.ok) {
        let responseData: any = {};
        
        try {
          responseData = await response.json();
        } catch (e) {
          responseData = { status: 'healthy' };
        }
        
        return {
          success: true,
          info: {
            endpoint: '/health',
            status: response.status,
            data: responseData,
            url: this.config.runpodUrl,
            type: 'RunPod Serverless'
          }
        };
      } else {
        // If health check fails, try to determine the issue
        let errorInfo = '';
        
        if (response.status === 401) {
          errorInfo = 'Authentication failed. Check your API key.';
        } else if (response.status === 404) {
          errorInfo = 'Endpoint not found. This might be a valid RunPod serverless endpoint but ComfyUI may not be properly deployed.';
        } else if (response.status === 503) {
          errorInfo = 'Service unavailable. Your RunPod instance might be cold starting.';
        } else {
          errorInfo = `HTTP ${response.status}: ${response.statusText}`;
        }

        return {
          success: false,
          error: `RunPod connection test failed: ${errorInfo}`,
          info: {
            url: this.config.runpodUrl,
            status: response.status,
            statusText: response.statusText,
            type: 'RunPod Serverless',
            suggestion: 'Verify your RunPod serverless endpoint URL and API key. Make sure your ComfyUI workflow is properly deployed.'
          }
        };
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Connection test failed';
      console.error('🎨 RunPod serverless connection test failed:', errorMsg);
      
      return {
        success: false,
        error: errorMsg,
        info: {
          url: this.config.runpodUrl,
          type: 'RunPod Serverless',
          suggestion: 'Check your internet connection and verify the RunPod serverless URL format: https://api.runpod.ai/v2/YOUR_ENDPOINT_ID'
        }
      };
    }
  }
}

// Load your actual bedroom mockup workflow
const workflowPath = path.join(process.cwd(), 'attached_assets', 'mockup_bedroom_workflow_1754591557930.json');
const DEFAULT_WORKFLOW = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

// Export a configured instance with your bedroom mockup workflow
export const comfyUIService = new ComfyUIService({
  runpodUrl: process.env.COMFYUI_RUNPOD_URL || 'http://localhost:8188',
  apiKey: process.env.COMFYUI_API_KEY,
  workflowJson: DEFAULT_WORKFLOW
});