import fetch from 'node-fetch';
import { PinterestImageGenerator } from './pinterest-image-generator';
import { ProjectImageStorage } from '../objectStorage';

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
 * Generate pin title variations
 */
function generatePinTitles(baseTitle: string): string[] {
  return [
    baseTitle,
    `Ultimate Guide: ${baseTitle}`,
    `${baseTitle} - Complete Guide`,
  ];
}

/**
 * Generate pin descriptions
 */
function generatePinDescriptions(metaDescription: string, keywords: string[]): string[] {
  const keywordText = keywords.slice(0, 3).join(', ');
  return [
    metaDescription,
    `${metaDescription} Learn more about ${keywordText}.`,
    `Discover everything about ${keywordText}. ${metaDescription}`,
  ];
}

/**
 * Pinterest Board Mapping
 * Maps keywords to specific Pinterest board IDs
 */
const PINTEREST_BOARDS = {
  // Image Upscaling Guide - for content about image quality, upscaling, enhancement
  imageUpscaling: {
    id: process.env.PINTEREST_BOARD_IMAGE_UPSCALING || '988610624392612434',
    keywords: ['upscale', 'image quality', 'enhance', 'resolution', 'quality', 'pixel', 'blur']
  },
  // Digital Art Business - for content about selling digital art, business tips
  digitalArt: {
    id: process.env.PINTEREST_BOARD_DIGITAL_ART || '988610624392612434',
    keywords: ['digital art', 'business', 'selling', 'marketplace', 'revenue', 'profit']
  },
  // AI Tools for Sellers - for content about AI, automation, tools
  aiTools: {
    id: process.env.PINTEREST_BOARD_AI_TOOLS || '988610624392612434',
    keywords: ['ai', 'artificial intelligence', 'automation', 'tool', 'generator', 'chatgpt']
  },
  // Print on Demand - for content about printing, POD, printables
  printOnDemand: {
    id: process.env.PINTEREST_BOARD_PRINT_ON_DEMAND || '988610624392612434',
    keywords: ['print', 'pod', 'printable', 'poster', 'canvas', 'wall art', 'download']
  },
  // Etsy SEO Tips - for content about Etsy, SEO, optimization
  etsySeo: {
    id: process.env.PINTEREST_BOARD_ETSY_SEO || '988610624392612434',
    keywords: ['etsy', 'seo', 'optimization', 'ranking', 'search', 'tags', 'listing']
  },
  // Default fallback
  default: {
    id: process.env.PINTEREST_BOARD_ID || '988610624392612434',
    keywords: []
  }
};

/**
 * Determine the best Pinterest board based on blog keywords
 */
function selectPinterestBoard(keywords: string[], title: string): string {
  const allText = [...keywords, title].join(' ').toLowerCase();
  
  // Check each board's keywords
  for (const [boardName, board] of Object.entries(PINTEREST_BOARDS)) {
    if (boardName === 'default') continue;
    
    // Check if any of the board's keywords match
    const hasMatch = board.keywords.some(keyword => 
      allText.includes(keyword.toLowerCase())
    );
    
    if (hasMatch) {
      console.log(`📌 Selected Pinterest board: ${boardName} (matched keywords)`);
      return board.id;
    }
  }
  
  // Fallback to default board
  console.log(`📌 Using default Pinterest board (no keyword match)`);
  return PINTEREST_BOARDS.default.id;
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
    const imageGenerator = new PinterestImageGenerator();
    const imageStorage = new ProjectImageStorage();
    const pinTitles = generatePinTitles(blogPost.title);
    const pinDescriptions = generatePinDescriptions(blogPost.metaDescription, blogPost.keywords);
    
    const pinVariations: PinterestImageData[] = [];
    
    for (let i = 0; i < 3; i++) {
      // Generate image
      const imageBuffer = await imageGenerator.generateImage({
        title: pinTitles[i],
        subtitle: blogPost.metaDescription.substring(0, 100),
        template: 'blog-post',
        branding: true,
      });
      
      // Upload to Supabase and get public URL
      const fileName = `pin-${i + 1}-${Date.now()}.png`;
      const { publicUrl } = await imageStorage.uploadAssetBuffer(imageBuffer, `blog-${blogPost.slug}`, fileName, 'image/png');
      const imageUrl = `https://imageupscaler.app${publicUrl}`;
      
      pinVariations.push({
        imageUrl,
        title: pinTitles[i],
        description: pinDescriptions[i],
        link: blogPost.url,
      });
    }
    
    console.log(`✅ Generated ${pinVariations.length} Pinterest images`);

    // Select the best Pinterest board based on keywords
    const selectedBoardId = selectPinterestBoard(blogPost.keywords, blogPost.title);

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
        boardId: selectedBoardId,
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
