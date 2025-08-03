// AI Art Generation service using Segmind SDXL models
// Provides text-to-image generation for users without existing artwork

import sharp from 'sharp';

interface ArtGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  style?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance?: number;
  seed?: number;
}

interface SegmindTextToImageResponse {
  image?: string; // base64 encoded result (JSON response)
}

export class AIArtGeneratorService {
  private apiKey: string;
  private baseUrl = 'https://api.segmind.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateArtwork(options: ArtGenerationOptions): Promise<string> {
    // Validate API key exists
    if (!this.apiKey || this.apiKey.length === 0) {
      throw new Error('Segmind API key is not configured. Please add SEGMIND_API_KEY to your environment variables.');
    }

    console.log('Starting AI art generation with prompt:', options.prompt);
    
    try {
      const response = await fetch(`${this.baseUrl}/sdxl1.0-txt2img`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          prompt: options.prompt,
          negative_prompt: options.negativePrompt || "blurry, low quality, distorted, watermark, text, signature",
          style: options.style || "enhance",
          samples: 1,
          scheduler: "UniPC",
          num_inference_steps: options.steps || 25,
          guidance_scale: options.guidance || 8,
          strength: 1,
          seed: options.seed || Math.floor(Math.random() * 1000000),
          img_width: options.width || 1024,
          img_height: options.height || 1024,
          base64: false // Request binary response for better quality
        }),
      });

      console.log('Segmind AI Art generation response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Segmind AI Art generation error response:', errorText);
        
        // Provide more specific error messages
        if (response.status === 401) {
          throw new Error('Invalid Segmind API key. Please check your SEGMIND_API_KEY in environment variables.');
        } else if (response.status === 402) {
          throw new Error('Insufficient credits in your Segmind account. Please add more credits.');
        } else if (response.status === 404) {
          throw new Error('Segmind SDXL model not found. Please check the API documentation.');
        } else {
          throw new Error(`Segmind API error (${response.status}): ${errorText}`);
        }
      }

      // Check if response is JSON or binary image
      const contentType = response.headers.get('content-type');
      console.log('Segmind art generation response content-type:', contentType);
      
      if (contentType && contentType.includes('application/json')) {
        // JSON response format
        const result: SegmindTextToImageResponse = await response.json();
        console.log('AI art generation completed successfully (JSON format)');
        if (!result.image) {
          throw new Error('No image data in response');
        }
        return result.image;
      } else {
        // Binary image response format - process through Sharp to set 300 DPI
        const imageBuffer = Buffer.from(await response.arrayBuffer());
        
        // Process with Sharp to ensure 300 DPI metadata and optimize for printing
        const processedBuffer = await sharp(imageBuffer)
          .jpeg({ quality: 95 })
          .withMetadata({
            density: 300 // Ensure 300 DPI for print quality
          })
          .toBuffer();
        
        const base64Image = processedBuffer.toString('base64');
        console.log('AI art generation completed successfully (binary format with 300 DPI)');
        return base64Image;
      }
    } catch (error) {
      console.error('AI art generation error:', error);
      throw new Error(`Failed to generate artwork: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Test API connection
  async testConnection(): Promise<boolean> {
    try {
      await this.generateArtwork({ 
        prompt: "test image", 
        width: 512, 
        height: 512, 
        steps: 10 
      });
      return true;
    } catch (error) {
      console.error('AI Art Generator connection test failed:', error);
      return false;
    }
  }

  // Get popular art styles for Etsy
  getPopularStyles(): string[] {
    return [
      "enhance", // Default enhancement
      "photographic", // Photorealistic style
      "digital-art", // Digital art style
      "comic-book", // Comic book style
      "fantasy-art", // Fantasy artwork
      "line-art", // Line art style
      "origami", // Paper craft style
      "neon-punk", // Cyberpunk neon style
      "isometric", // Isometric style
      "low-poly", // Low polygon style
      "pixel-art", // Pixel art style
      "watercolor" // Watercolor painting style
    ];
  }

  // Generate Etsy-optimized prompts
  generateEtsyPrompt(userPrompt: string, category: string = "digital art"): string {
    const etsyKeywords = [
      "high quality",
      "printable",
      "wall art",
      "home decor",
      "instant download",
      "digital print"
    ];
    
    const qualityTerms = [
      "professional",
      "detailed",
      "vibrant colors",
      "sharp focus",
      "4k resolution"
    ];

    // Combine user prompt with Etsy-optimized terms
    const optimizedPrompt = [
      userPrompt,
      ...qualityTerms.slice(0, 2),
      category,
      "printable art"
    ].join(", ");

    return optimizedPrompt;
  }
}

// Create singleton instance
export const aiArtGeneratorService = new AIArtGeneratorService(process.env.SEGMIND_API_KEY || '');