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
    
    // Retry logic for transient failures
    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.attemptGeneration(options, attempt);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Don't retry content safety blocks - the prompt is the issue, not a transient error
        const isContentSafetyBlock = errorMessage.includes('CONTENT_SAFETY_BLOCK');
        
        if (isContentSafetyBlock) {
          console.log(`🛡️ Content safety block detected - not retrying`);
          throw error;
        }
        
        // Check if this is a retryable error (network issues, temporary failures, etc.)
        const isRetryable = errorMessage.includes('timeout') || 
                           errorMessage.includes('network') ||
                           errorMessage.includes('ECONNREFUSED') ||
                           errorMessage.includes('503') ||
                           errorMessage.includes('502');
        
        if (attempt < maxRetries && isRetryable) {
          console.log(`AI generation attempt ${attempt} failed with retryable error: ${errorMessage}`);
          console.log(`Retrying with attempt ${attempt + 1}/${maxRetries}...`);
          
          // Wait a bit before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        
        // If not retryable or max retries reached, throw the error
        throw error;
      }
    }
    
    throw new Error('Max retries reached');
  }

  private async attemptGeneration(options: ArtGenerationOptions, attempt: number): Promise<string> {
    try {
      const requestBody = {
        prompt: options.prompt,
        negative_prompt: options.negativePrompt || "blurry, low quality, distorted, watermark, text, signature",
        aspect_ratio: options.aspectRatio || "1:1",
        output_format: options.outputFormat || "JPEG",
        seed: options.seed || Math.floor(Math.random() * 1000000),
        safety_tolerance: options.safetyTolerance || "BLOCK_SOME",
        person_generation: "allow_adult"
      };

      // Use different seeds for retries to avoid same result
      if (attempt > 1) {
        requestBody.seed = Math.floor(Math.random() * 1000000);
        console.log(`Attempt ${attempt}: Using new seed ${requestBody.seed}`);
      }

      const response = await fetch(`${this.baseUrl}/imagen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      console.log(`Segmind AI Art generation response status (attempt ${attempt}):`, response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Segmind AI Art generation error response (attempt ${attempt}):`, errorText);
        
        // Provide more specific error messages
        if (response.status === 401) {
          throw new Error('Invalid Segmind API key. Please check your SEGMIND_API_KEY in environment variables.');
        } else if (response.status === 402) {
          throw new Error('Insufficient credits in your Segmind account. Please add more credits.');
        } else if (response.status === 404) {
          throw new Error('Segmind Imagen 3 model not found. Please check the API documentation.');
        } else if (response.status === 400) {
          // Parse error to detect content safety blocks
          let errorMessage = errorText;
          
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error === 'No images were generated.' || 
                errorJson.error?.includes('safety') || 
                errorJson.error?.includes('content policy')) {
              
              // Content safety block - provide helpful user-facing message
              throw new Error('CONTENT_SAFETY_BLOCK: Your prompt was blocked by our content safety filters. Please try:\n\n' +
                '• Removing references to ages or minors (e.g., "7 years old", "child", "kid")\n' +
                '• Using general terms like "people", "friends", or "family" instead\n' +
                '• Avoiding sensitive or explicit content\n' +
                '• Simplifying your prompt to focus on the main subject\n\n' +
                'If you continue to have issues, try a different description of your desired artwork.');
            }
          } catch (parseError) {
            // If JSON parsing fails, fall through to generic error
          }
          
          // Check for common content policy violations
          const isCelebrityBlock = errorText.toLowerCase().includes('no images were generated');
          
          if (isCelebrityBlock) {
            throw new Error(
              'Content policy violation: Your prompt may contain celebrity names, trademarked characters, or other restricted content. ' +
              'Please try:\n' +
              '• Describing the scene or action without using specific names\n' +
              '• Using generic descriptions like "martial artist" instead of celebrity names\n' +
              '• Focusing on the style, mood, or composition rather than specific people\n\n' +
              'Example: Instead of "Bruce Lee fighting", try "martial artist in dynamic fighting pose, action scene"'
            );
          }
          
          throw new Error(`Unable to generate image: ${errorText}. Please try rephrasing your prompt or contact support if the issue persists.`);
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
      console.log(`Imagen 3 art generation completed successfully on attempt ${attempt} (with 300 DPI)`);
      return base64Image;
    } catch (error) {
      console.error(`AI art generation error on attempt ${attempt}:`, error);
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