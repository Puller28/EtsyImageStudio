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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Handle specific RunPod service issues
      if (errorMessage.includes('502') || errorMessage.includes('Bad Gateway')) {
        return {
          success: false,
          error: 'RunPod service is temporarily unavailable (502 Bad Gateway). Please try again in a few minutes.'
        };
      }
      
      return {
        success: false,
        error: errorMessage
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
   * Compress image for RunPod to stay under payload limits
   */
  private async compressImageForRunPod(imageBuffer: Buffer): Promise<Buffer> {
    const sharp = (await import('sharp')).default;
    
    try {
      // Target: Keep final payload under 5MB (image should be under 2MB)
      const metadata = await sharp(imageBuffer).metadata();
      console.log(`🎨 Original image: ${metadata.width}x${metadata.height}, ${imageBuffer.length} bytes`);
      
      // Resize if too large, compress aggressively
      let processedImage = sharp(imageBuffer);
      
      // Resize if width/height > 1024
      if (metadata.width && metadata.height && (metadata.width > 1024 || metadata.height > 1024)) {
        processedImage = processedImage.resize(1024, 1024, { 
          fit: 'inside', 
          withoutEnlargement: true 
        });
      }
      
      // Compress as JPEG with aggressive quality settings
      const compressedBuffer = await processedImage
        .jpeg({ 
          quality: 75,
          progressive: true,
          mozjpeg: true
        })
        .toBuffer();
        
      console.log(`🎨 Compressed to: ${compressedBuffer.length} bytes (${((compressedBuffer.length / imageBuffer.length) * 100).toFixed(1)}% of original)`);
      
      return compressedBuffer;
    } catch (error) {
      console.warn(`🎨 Image compression failed, using original: ${error}`);
      return imageBuffer;
    }
  }

  /**
   * Prepare the workflow JSON with the uploaded image and parameters
   */
  private prepareWorkflow(imageFilename: string, input: ComfyUIInput): any {
    // Create a simplified, compatible ComfyUI workflow for bedroom mockup generation
    // Based on standard ComfyUI node types that should exist in most ComfyUI installations
    
    const prompt: Record<string, any> = {
      "1": {
        "class_type": "LoadImage",
        "inputs": {
          "image": "input_image.jpg", // Will be replaced with base64 data
          "upload": "image"
        }
      },
      "2": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": input.prompt || "A realistic bedroom with natural light filtering through curtains, a framed artwork with a black border featuring the uploaded image, well-lit and integrated into the room decor.",
          "clip": ["4", 1]
        }
      },
      "3": {
        "class_type": "CLIPTextEncode", 
        "inputs": {
          "text": "blurry, low quality, distorted, amateur",
          "clip": ["4", 1]
        }
      },
      "4": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
          "ckpt_name": "sd_xl_base_1.0.safetensors"
        }
      },
      "5": {
        "class_type": "KSampler",
        "inputs": {
          "seed": Math.floor(Math.random() * 1000000),
          "steps": input.steps || 30,
          "cfg": input.strength ? input.strength * 10 : 7.5,
          "sampler_name": "euler",
          "scheduler": "normal",
          "denoise": 0.85,
          "model": ["4", 0],
          "positive": ["2", 0],
          "negative": ["3", 0],
          "latent_image": ["6", 0]
        }
      },
      "6": {
        "class_type": "EmptyLatentImage",
        "inputs": {
          "width": 1024,
          "height": 1024,
          "batch_size": 1
        }
      },
      "7": {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": ["5", 0],
          "vae": ["4", 2]
        }
      },
      "8": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "bedroom_mockup",
          "images": ["7", 0]
        }
      }
    };
    
    console.log('🎨 Created standard ComfyUI workflow with prompt:', input.prompt);
    console.log('🎨 Parameters - Steps:', input.steps, 'CFG:', prompt["5"].inputs.cfg);
    
    return prompt;
  }

  /**
   * Queue a workflow for execution (RunPod Serverless) with retry logic
   */
  private async queueWorkflow(workflow: any, imageBuffer?: Buffer): Promise<{success: boolean, jobId?: string, error?: string}> {
    const maxRetries = 3;
    const retryDelays = [2000, 5000, 10000]; // 2s, 5s, 10s
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // For RunPod serverless, we need to compress and embed the image data
        if (imageBuffer) {
          // Compress image to reduce payload size (max 2MB target)
          const compressedBuffer = await this.compressImageForRunPod(imageBuffer);
          const imageBase64 = compressedBuffer.toString('base64');
          console.log(`🎨 Original: ${imageBuffer.length} bytes, Compressed: ${compressedBuffer.length} bytes, base64: ${imageBase64.length} chars`);
          
          // Update the LoadImage node with the base64 image data  
          if (workflow["1"] && workflow["1"].class_type === "LoadImage") {
            workflow["1"].inputs.image = imageBase64;
            console.log(`🎨 Updated LoadImage node with compressed base64 data`);
          }
        }
        
        // RunPod serverless API format - use correct parameter name
        const requestBody = {
          input: {
            workflow: workflow,
            client_id: `etsyart-${Date.now()}`
          }
        };
        
        console.log(`🎨 Workflow nodes: ${Object.keys(workflow).length}`);

        console.log(`🎨 Sending RunPod serverless request (attempt ${attempt + 1}/${maxRetries + 1})...`);
        console.log(`🎨 Request payload size: ${JSON.stringify(requestBody).length} bytes`);

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
          const errorMessage = `RunPod request failed: ${response.status} ${response.statusText} - ${errorText.slice(0, 200)}`;
          
          // Check if this is a retryable error (5xx server errors)
          if (response.status >= 500 && attempt < maxRetries) {
            console.log(`🔄 Server error ${response.status}, retrying in ${retryDelays[attempt]}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
            continue; // Retry
          }
          
          throw new Error(errorMessage);
        }

        const result = await response.json() as any;
        console.log('🎨 RunPod response:', result);
        
        return {
          success: true,
          jobId: result.id || result.jobId // RunPod returns job ID
        };
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`🎨 Attempt ${attempt + 1} failed with error: ${errorMessage}`);
        
        // Check if this is a retryable network error
        if ((errorMessage.includes('502') || errorMessage.includes('503') || errorMessage.includes('504') || 
             errorMessage.includes('timeout') || errorMessage.includes('ECONNRESET') || 
             errorMessage.includes('terminated')) && attempt < maxRetries) {
          console.log(`🔄 Retryable error detected, retrying in ${retryDelays[attempt]}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
          continue; // Retry
        }
        
        // If we've exhausted retries or it's not a retryable error, return error
        if (attempt === maxRetries) {
          return {
            success: false,
            error: `Failed after ${maxRetries + 1} attempts: ${errorMessage}`
          };
        }
        
        // For non-retryable errors, fail immediately
        return {
          success: false,
          error: `Non-retryable error: ${errorMessage}`
        };
      }
    }
    
    // This should never be reached
    return {
      success: false,
      error: 'Unexpected error in retry logic'
    };
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