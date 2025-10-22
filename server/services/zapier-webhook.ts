import fetch from 'node-fetch';
import { createPinterestImageService } from './pinterest-image-generator';

interface BlogPostData {
  title: string;
  slug: string;
  metaDescription: string;
  keywords: string[];
  url: string;
}

interface PinterestImageData {
  imageUrl: string;
  title: string;
  description: string;
  link: string;
}

/**
 * Send blog post data to Zapier webhook for Pinterest posting
 */
export async function sendToZapier(blogPost: BlogPostData): Promise<void> {
  const zapierWebhookUrl = process.env.ZAPIER_WEBHOOK_URL;
  
  if (!zapierWebhookUrl) {
    console.log('⚠️ ZAPIER_WEBHOOK_URL not configured, skipping webhook');
    return;
  }

  try {
    console.log(`📤 Preparing Pinterest images for Zapier: "${blogPost.title}"`);
    
    // Generate 3 Pinterest pin images
    const imageService = createPinterestImageService();
    if (!imageService) {
      throw new Error('Pinterest image service not available');
    }

    const pinVariations = await imageService.generatePinImages({
      title: blogPost.title,
      subtitle: blogPost.metaDescription,
      keywords: blogPost.keywords,
    });

    // Prepare data for Zapier
    const zapierData = {
      blogPost: {
        title: blogPost.title,
        description: blogPost.metaDescription,
        url: blogPost.url,
        keywords: blogPost.keywords.join(', '),
      },
      pins: pinVariations.map((pin, index) => ({
        imageUrl: pin.imageUrl,
        title: pin.title,
        description: pin.description,
        link: blogPost.url,
        boardId: process.env.PINTEREST_BOARD_ID || '',
      })),
      timestamp: new Date().toISOString(),
    };

    console.log(`📤 Sending ${pinVariations.length} pins to Zapier webhook...`);

    // Send to Zapier
    const response = await fetch(zapierWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(zapierData),
    });

    if (!response.ok) {
      throw new Error(`Zapier webhook failed: ${response.status} ${response.statusText}`);
    }

    console.log(`✅ Successfully sent to Zapier: ${pinVariations.length} pins for "${blogPost.title}"`);
  } catch (error: any) {
    console.error(`❌ Zapier webhook failed for "${blogPost.title}":`, error.message);
    throw error;
  }
}

/**
 * Create Zapier webhook service if configured
 */
export function createZapierService() {
  if (!process.env.ZAPIER_WEBHOOK_URL) {
    return null;
  }

  return {
    sendBlogPostToPinterest: sendToZapier,
  };
}
