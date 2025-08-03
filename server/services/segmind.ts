// Segmind API integration for image upscaling
// Uses Real-ESRGAN models for 2x and 4x image enhancement

interface SegmindUpscaleOptions {
  scale: 2 | 4;
  image: string; // base64 encoded image
}

interface SegmindResponse {
  image: string; // base64 encoded result
}

export class SegmindService {
  private apiKey: string;
  private baseUrl = 'https://api.segmind.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async upscaleImage(options: SegmindUpscaleOptions): Promise<string> {
    const modelEndpoint = options.scale === 4 ? 'real-esrgan-4x' : 'real-esrgan-2x';
    
    try {
      const response = await fetch(`${this.baseUrl}/${modelEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          image: options.image,
          scale: options.scale,
          face_enhance: false
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Segmind API error: ${response.status} - ${errorText}`);
      }

      const result: SegmindResponse = await response.json();
      return result.image;
    } catch (error) {
      console.error('Segmind upscaling error:', error);
      throw new Error(`Failed to upscale image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Alternative method for Real-ESRGAN x4plus model (higher quality)
  async upscaleImageX4Plus(image: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/real-esrgan-x4plus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          image: image,
          scale: 4,
          face_enhance: false
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Segmind API error: ${response.status} - ${errorText}`);
      }

      const result: SegmindResponse = await response.json();
      return result.image;
    } catch (error) {
      console.error('Segmind upscaling error:', error);
      throw new Error(`Failed to upscale image with x4plus: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Create singleton instance
export const segmindService = new SegmindService(process.env.SEGMIND_API_KEY || '');