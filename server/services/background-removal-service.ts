import FormData from 'form-data';
import axios from 'axios';

/**
 * Background Removal Service
 * Uses remove.bg API for professional background removal
 */

export interface BackgroundRemovalResult {
  success: boolean;
  imageBase64?: string;
  error?: string;
  creditsUsed?: number;
}

export class BackgroundRemovalService {
  private static readonly REMOVE_BG_API_KEY = process.env.REMOVE_BG_API_KEY;
  private static readonly API_URL = 'https://api.remove.bg/v1.0/removebg';

  /**
   * Remove background from an image
   * @param imageBuffer - Image buffer or base64 string
   * @param options - Removal options
   */
  static async removeBackground(
    imageBuffer: Buffer | string,
    options: {
      size?: 'auto' | 'preview' | 'full' | 'medium' | 'hd' | '4k';
      type?: 'auto' | 'person' | 'product' | 'car';
      format?: 'auto' | 'png' | 'jpg' | 'zip';
      roi?: string; // Region of interest: "0% 0% 100% 100%"
      crop?: boolean;
      scale?: string; // e.g., "50%"
    } = {}
  ): Promise<BackgroundRemovalResult> {
    try {
      // Check if API key is configured
      if (!this.REMOVE_BG_API_KEY) {
        console.warn('⚠️ REMOVE_BG_API_KEY not configured, using fallback');
        return this.fallbackRemoval(imageBuffer);
      }

      const formData = new FormData();

      // Handle base64 input
      if (typeof imageBuffer === 'string') {
        // Remove data URL prefix if present
        const base64Data = imageBuffer.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        formData.append('image_file', buffer, { filename: 'image.png' });
      } else {
        formData.append('image_file', imageBuffer, { filename: 'image.png' });
      }

      // Add options
      formData.append('size', options.size || 'auto');
      if (options.type) formData.append('type', options.type);
      if (options.format) formData.append('format', options.format);
      if (options.roi) formData.append('roi', options.roi);
      if (options.crop !== undefined) formData.append('crop', options.crop.toString());
      if (options.scale) formData.append('scale', options.scale);

      console.log('🎨 Removing background with remove.bg API...');

      const response = await axios.post(this.API_URL, formData, {
        headers: {
          'X-Api-Key': this.REMOVE_BG_API_KEY,
          ...formData.getHeaders(),
        },
        responseType: 'arraybuffer',
        timeout: 60000, // 60 seconds
      });

      // Convert response to base64
      const imageBase64 = `data:image/png;base64,${Buffer.from(response.data).toString('base64')}`;

      // Get credits info from headers
      const creditsUsed = parseInt(response.headers['x-credits-charged'] || '1', 10);

      console.log(`✅ Background removed successfully (${creditsUsed} credits used)`);

      return {
        success: true,
        imageBase64,
        creditsUsed,
      };
    } catch (error: any) {
      console.error('❌ Background removal failed:', error.message);

      // Handle specific errors
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 403) {
          return {
            success: false,
            error: 'API key invalid or insufficient credits',
          };
        } else if (status === 400) {
          return {
            success: false,
            error: 'Invalid image format or parameters',
          };
        } else if (status === 402) {
          return {
            success: false,
            error: 'Insufficient API credits. Please upgrade your remove.bg plan.',
          };
        }
      }

      return {
        success: false,
        error: error.message || 'Failed to remove background',
      };
    }
  }

  /**
   * Fallback method when API key is not configured
   * Returns a simple message encouraging users to configure the API
   */
  private static async fallbackRemoval(imageBuffer: Buffer | string): Promise<BackgroundRemovalResult> {
    console.log('⚠️ Using fallback - remove.bg API not configured');
    
    return {
      success: false,
      error: 'Background removal service not configured. Please add REMOVE_BG_API_KEY to environment variables.',
    };
  }

  /**
   * Get account information (credits remaining, etc.)
   */
  static async getAccountInfo(): Promise<{
    success: boolean;
    credits?: number;
    error?: string;
  }> {
    try {
      if (!this.REMOVE_BG_API_KEY) {
        return {
          success: false,
          error: 'API key not configured',
        };
      }

      const response = await axios.get('https://api.remove.bg/v1.0/account', {
        headers: {
          'X-Api-Key': this.REMOVE_BG_API_KEY,
        },
      });

      return {
        success: true,
        credits: response.data.credits?.total || 0,
      };
    } catch (error: any) {
      console.error('Failed to get account info:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Estimate credits for an operation
   */
  static estimateCredits(size: string = 'auto'): number {
    const creditMap: Record<string, number> = {
      preview: 1,
      auto: 1,
      medium: 1,
      full: 1,
      hd: 3,
      '4k': 4,
    };

    return creditMap[size] || 1;
  }
}
