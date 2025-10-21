/**
 * Pinterest Image Generator Service
 * 
 * Generates Pinterest-optimized images (1000x1500px) with branded templates
 * Supports multiple templates: blog-post, quote, list, tutorial, before-after
 */

import { createCanvas, loadImage, registerFont } from 'canvas';
import path from 'path';

export interface PinterestImageOptions {
  title: string;
  subtitle?: string;
  template: 'blog-post' | 'quote' | 'list' | 'tutorial' | 'before-after';
  points?: string[];
  branding?: boolean;
  backgroundColor?: string;
  accentColor?: string;
}

export class PinterestImageGenerator {
  private readonly width = 1000;
  private readonly height = 1500;
  private readonly brandColor = '#8B5CF6'; // Purple
  private readonly accentColor = '#EC4899'; // Pink

  /**
   * Generate a Pinterest-optimized image
   */
  async generateImage(options: PinterestImageOptions): Promise<Buffer> {
    const canvas = createCanvas(this.width, this.height);
    const ctx = canvas.getContext('2d');

    // Set background
    const bgColor = options.backgroundColor || '#FFFFFF';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, this.width, this.height);

    // Apply template
    switch (options.template) {
      case 'blog-post':
        await this.renderBlogPostTemplate(ctx, options);
        break;
      case 'quote':
        await this.renderQuoteTemplate(ctx, options);
        break;
      case 'list':
        await this.renderListTemplate(ctx, options);
        break;
      case 'tutorial':
        await this.renderTutorialTemplate(ctx, options);
        break;
      case 'before-after':
        await this.renderBeforeAfterTemplate(ctx, options);
        break;
    }

    // Add branding if enabled
    if (options.branding !== false) {
      this.addBranding(ctx);
    }

    return canvas.toBuffer('image/png');
  }

  /**
   * Blog Post Template - Clean, professional design
   */
  private async renderBlogPostTemplate(ctx: any, options: PinterestImageOptions) {
    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#F3E8FF');
    gradient.addColorStop(1, '#FCE7F3');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // Decorative top bar
    ctx.fillStyle = this.brandColor;
    ctx.fillRect(0, 0, this.width, 20);

    // Main title
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    
    const titleLines = this.wrapText(ctx, options.title, this.width - 100);
    let y = 300;
    titleLines.forEach(line => {
      ctx.fillText(line, this.width / 2, y);
      y += 85;
    });

    // Subtitle
    if (options.subtitle) {
      ctx.fillStyle = '#6B7280';
      ctx.font = '32px Arial';
      const subtitleLines = this.wrapText(ctx, options.subtitle, this.width - 120);
      y += 40;
      subtitleLines.forEach(line => {
        ctx.fillText(line, this.width / 2, y);
        y += 45;
      });
    }

    // Decorative element
    ctx.fillStyle = this.accentColor;
    ctx.beginPath();
    ctx.arc(this.width / 2, y + 80, 40, 0, Math.PI * 2);
    ctx.fill();

    // Call to action
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 36px Arial';
    ctx.fillText('Read Full Guide →', this.width / 2, this.height - 200);
  }

  /**
   * Quote Template - Inspirational design
   */
  private async renderQuoteTemplate(ctx: any, options: PinterestImageOptions) {
    // Solid background
    ctx.fillStyle = this.brandColor;
    ctx.fillRect(0, 0, this.width, this.height);

    // Quote marks
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = 'bold 200px Georgia';
    ctx.textAlign = 'left';
    ctx.fillText('"', 80, 250);

    // Quote text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'italic 56px Georgia';
    ctx.textAlign = 'center';
    
    const quoteLines = this.wrapText(ctx, options.title, this.width - 160);
    let y = 400;
    quoteLines.forEach(line => {
      ctx.fillText(line, this.width / 2, y);
      y += 70;
    });

    // Attribution
    if (options.subtitle) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '32px Arial';
      ctx.fillText(`— ${options.subtitle}`, this.width / 2, y + 60);
    }
  }

  /**
   * List Template - Numbered or bulleted list
   */
  private async renderListTemplate(ctx: any, options: PinterestImageOptions) {
    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, this.width, this.height);

    // Header
    ctx.fillStyle = this.brandColor;
    ctx.fillRect(0, 0, this.width, 200);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 56px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(options.title, this.width / 2, 130);

    // List items
    const points = options.points || ['Point 1', 'Point 2', 'Point 3'];
    let y = 300;
    
    points.forEach((point, index) => {
      // Number circle
      ctx.fillStyle = this.accentColor;
      ctx.beginPath();
      ctx.arc(100, y, 35, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.fillText((index + 1).toString(), 100, y + 12);
      
      // Point text
      ctx.fillStyle = '#1F2937';
      ctx.font = '32px Arial';
      ctx.textAlign = 'left';
      const pointLines = this.wrapText(ctx, point, this.width - 200);
      let pointY = y - 10;
      pointLines.forEach(line => {
        ctx.fillText(line, 160, pointY);
        pointY += 40;
      });
      
      y += 180;
    });
  }

  /**
   * Tutorial Template - Step-by-step guide
   */
  private async renderTutorialTemplate(ctx: any, options: PinterestImageOptions) {
    // Similar to list but with "STEP" prefix
    await this.renderListTemplate(ctx, options);
    
    // Add "TUTORIAL" badge
    ctx.fillStyle = this.accentColor;
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('STEP-BY-STEP TUTORIAL', this.width / 2, 50);
  }

  /**
   * Before/After Template - Comparison design
   */
  private async renderBeforeAfterTemplate(ctx: any, options: PinterestImageOptions) {
    // Split design
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(0, 0, this.width / 2, this.height);
    
    ctx.fillStyle = '#10B981';
    ctx.fillRect(this.width / 2, 0, this.width / 2, this.height);

    // Labels
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('BEFORE', this.width / 4, 100);
    ctx.fillText('AFTER', (this.width / 4) * 3, 100);

    // Title
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 56px Arial';
    const titleLines = this.wrapText(ctx, options.title, this.width - 100);
    let y = this.height - 300;
    
    // White background for title
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(50, y - 80, this.width - 100, titleLines.length * 70 + 40);
    
    ctx.fillStyle = '#1F2937';
    titleLines.forEach(line => {
      ctx.fillText(line, this.width / 2, y);
      y += 70;
    });
  }

  /**
   * Add branding footer
   */
  private addBranding(ctx: any) {
    // Footer background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, this.height - 120, this.width, 120);

    // Logo/Brand name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 42px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ImageUpscaler.app', this.width / 2, this.height - 60);

    // Tagline
    ctx.font = '24px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('AI-Powered Image Enhancement for Etsy Sellers', this.width / 2, this.height - 25);
  }

  /**
   * Wrap text to fit within width
   */
  private wrapText(ctx: any, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    
    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }
}

/**
 * Factory function to create Pinterest image generator
 */
export function createPinterestImageGenerator(): PinterestImageGenerator {
  return new PinterestImageGenerator();
}
