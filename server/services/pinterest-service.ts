/**
 * Pinterest API Integration Service
 * 
 * Handles Pinterest API authentication, pin creation, and board management
 * Supports auto-posting blog content with optimized images
 */

import fetch from 'node-fetch';

interface PinterestConfig {
  accessToken: string;
  boardId?: string;
}

interface PinData {
  title: string;
  description: string;
  link: string;
  imageUrl: string;
  boardId?: string;
  altText?: string;
}

interface PinResponse {
  id: string;
  title: string;
  description: string;
  link: string;
  media: {
    images: {
      '1200x': {
        url: string;
      };
    };
  };
  board_id: string;
  created_at: string;
}

interface BoardInfo {
  id: string;
  name: string;
  description: string;
  pin_count: number;
}

export class PinterestService {
  private accessToken: string;
  private baseUrl = 'https://api.pinterest.com/v5';
  private defaultBoardId?: string;

  constructor(config: PinterestConfig) {
    this.accessToken = config.accessToken;
    this.defaultBoardId = config.boardId;
  }

  /**
   * Create a new pin on Pinterest
   */
  async createPin(pinData: PinData): Promise<PinResponse> {
    const boardId = pinData.boardId || this.defaultBoardId;
    
    if (!boardId) {
      throw new Error('Board ID is required. Set default board or provide in pinData.');
    }

    const payload = {
      board_id: boardId,
      title: pinData.title.substring(0, 100), // Pinterest limit
      description: pinData.description.substring(0, 500), // Pinterest limit
      link: pinData.link,
      media_source: {
        source_type: 'image_url',
        url: pinData.imageUrl,
      },
      alt_text: pinData.altText || pinData.title,
    };

    const response = await fetch(`${this.baseUrl}/pins`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pinterest API error: ${response.status} - ${error}`);
    }

    return await response.json() as PinResponse;
  }

  /**
   * Get user's boards
   */
  async getBoards(): Promise<BoardInfo[]> {
    const response = await fetch(`${this.baseUrl}/boards?page_size=25`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pinterest API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as { items: BoardInfo[] };
    return data.items;
  }

  /**
   * Create a new board
   */
  async createBoard(name: string, description: string): Promise<BoardInfo> {
    const response = await fetch(`${this.baseUrl}/boards`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        description,
        privacy: 'PUBLIC',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pinterest API error: ${response.status} - ${error}`);
    }

    return await response.json() as BoardInfo;
  }

  /**
   * Get pin analytics
   */
  async getPinAnalytics(pinId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/pins/${pinId}/analytics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pinterest API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  /**
   * Auto-post blog content to Pinterest with multiple variations
   */
  async autoPostBlogToPinterest(blogPost: {
    title: string;
    slug: string;
    metaDescription: string;
    keywords: string[];
  }): Promise<PinResponse[]> {
    const baseUrl = 'https://imageupscaler.app';
    const blogUrl = `${baseUrl}/blog/${blogPost.slug}`;
    
    // Generate multiple pin variations
    const pinVariations = [
      {
        title: blogPost.title,
        description: `${blogPost.metaDescription} | Read the full guide at ImageUpscaler.app`,
        hashtags: blogPost.keywords.slice(0, 3).map(k => `#${k.replace(/\s+/g, '')}`).join(' '),
      },
      {
        title: `${blogPost.title} [Free Guide]`,
        description: `Step-by-step guide for Etsy sellers and digital artists. ${blogPost.metaDescription}`,
        hashtags: '#EtsySeller #DigitalArt #PrintOnDemand',
      },
      {
        title: `Etsy Sellers: ${blogPost.title}`,
        description: `Boost your sales with this comprehensive guide. ${blogPost.metaDescription}`,
        hashtags: '#EtsyTips #EtsySEO #OnlineBusiness',
      },
    ];

    const results: PinResponse[] = [];

    for (const variation of pinVariations) {
      try {
        // Generate Pinterest image for this variation
        const imageUrl = await this.generatePinterestImage({
          title: variation.title,
          subtitle: blogPost.metaDescription.substring(0, 100),
          template: 'blog-post',
        });

        // Create the pin
        const pin = await this.createPin({
          title: variation.title,
          description: `${variation.description}\n\n${variation.hashtags}`,
          link: blogUrl,
          imageUrl,
          altText: blogPost.title,
        });

        results.push(pin);
        
        // Rate limiting: wait 2 seconds between pins
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Failed to create pin variation:`, error);
        // Continue with other variations even if one fails
      }
    }

    return results;
  }

  /**
   * Generate Pinterest-optimized image
   * This is a placeholder - will be implemented with actual image generation
   */
  private async generatePinterestImage(options: {
    title: string;
    subtitle: string;
    template: string;
  }): Promise<string> {
    // For now, return a placeholder
    // This will be replaced with actual image generation service
    return `https://imageupscaler.app/api/pinterest/generate?title=${encodeURIComponent(options.title)}`;
  }
}

/**
 * Factory function to create Pinterest service instance
 */
export function createPinterestService(): PinterestService | null {
  const accessToken = process.env.PINTEREST_ACCESS_TOKEN;
  const boardId = process.env.PINTEREST_BOARD_ID;

  if (!accessToken) {
    console.warn('Pinterest access token not configured');
    return null;
  }

  return new PinterestService({
    accessToken,
    boardId,
  });
}
