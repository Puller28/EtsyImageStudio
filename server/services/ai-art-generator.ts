// AI Art Generation service using Segmind Imagen 3 model
// Google DeepMind's highest quality text-to-image model for professional artwork

import sharp from 'sharp';

interface ArtGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  outputFormat?: 'JPEG' | 'PNG';
  seed?: number;
  safetyTolerance?: string;
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
      const response = await fetch(`${this.baseUrl}/imagen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          prompt: options.prompt,
          negative_prompt: options.negativePrompt || "blurry, low quality, distorted, watermark, text, signature",
          aspect_ratio: options.aspectRatio || "1:1",
          output_format: options.outputFormat || "JPEG",
          seed: options.seed || Math.floor(Math.random() * 1000000),
          safety_tolerance: options.safetyTolerance || "BLOCK_SOME",
          person_generation: "allow_adult"
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
          throw new Error('Segmind Imagen 3 model not found. Please check the API documentation.');
        } else {
          throw new Error(`Segmind API error (${response.status}): ${errorText}`);
        }
      }

      // Imagen 3 returns binary image data directly
      const imageBuffer = Buffer.from(await response.arrayBuffer());
      
      // Process with Sharp to ensure 300 DPI metadata and optimize for printing
      const processedBuffer = await sharp(imageBuffer)
        .jpeg({ quality: 95 })
        .withMetadata({
          density: 300 // Ensure 300 DPI for print quality
        })
        .toBuffer();
      
      const base64Image = processedBuffer.toString('base64');
      console.log('Imagen 3 art generation completed successfully (with 300 DPI)');
      return base64Image;
    } catch (error) {
      console.error('AI art generation error:', error);
      throw new Error(`Failed to generate artwork: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Test API connection
  async testConnection(): Promise<boolean> {
    try {
      await this.generateArtwork({ 
        prompt: "simple test image", 
        aspectRatio: "1:1"
      });
      return true;
    } catch (error) {
      console.error('AI Art Generator connection test failed:', error);
      return false;
    }
  }

  // Get available aspect ratios for Imagen 3
  getAspectRatios(): Array<{value: string, label: string}> {
    return [
      { value: "1:1", label: "Square (1:1)" },
      { value: "3:4", label: "Portrait (3:4)" },
      { value: "4:3", label: "Landscape (4:3)" }
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