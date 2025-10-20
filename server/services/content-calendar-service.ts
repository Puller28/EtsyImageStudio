import { SocialMediaService } from './social-media-service';

// Target keywords from SEO strategy
const TARGET_KEYWORDS = [
  // Primary keywords
  'AI image upscaler',
  'image upscaling tool',
  'enhance image quality',
  'AI photo enhancer',
  'upscale images online',
  
  // Long-tail keywords
  'how to upscale images without losing quality',
  'best AI image upscaler for Etsy',
  'upscale product photos for print',
  'AI mockup generator for Etsy',
  'create wall art mockups',
  'generate Etsy listing descriptions',
  
  // Feature-specific
  'AI background removal',
  'batch image upscaling',
  'AI art generator',
  'mockup templates',
  'Etsy SEO tools',
  
  // Use case keywords
  'Etsy seller tools',
  'print on demand image tools',
  'wall art creation',
  'product photography enhancement',
  'digital art upscaling'
];

// Content themes and angles
const CONTENT_THEMES = [
  { theme: 'Tutorial', angle: 'How to', platforms: ['twitter', 'linkedin', 'facebook', 'pinterest', 'instagram'] },
  { theme: 'Tip', angle: 'Quick tip', platforms: ['twitter', 'linkedin', 'pinterest', 'instagram'] },
  { theme: 'Showcase', angle: 'Before/After', platforms: ['twitter', 'facebook', 'linkedin', 'pinterest', 'instagram'] },
  { theme: 'Feature', angle: 'Did you know', platforms: ['twitter', 'linkedin', 'instagram'] },
  { theme: 'Success Story', angle: 'Case study', platforms: ['linkedin', 'facebook', 'pinterest'] },
  { theme: 'Question', angle: 'Engagement', platforms: ['twitter', 'facebook', 'instagram'] },
  { theme: 'Stat/Fact', angle: 'Industry insight', platforms: ['linkedin', 'twitter'] },
  { theme: 'Inspiration', angle: 'Get inspired', platforms: ['pinterest', 'instagram'] },
];

// Platform-specific best practices
const PLATFORM_SPECS = {
  twitter: {
    maxLength: 280,
    tone: 'casual and engaging',
    hashtagCount: 2,
    callToAction: 'Try it free',
    bestTimes: ['9am', '12pm', '5pm']
  },
  linkedin: {
    maxLength: 1300,
    tone: 'professional and informative',
    hashtagCount: 3,
    callToAction: 'Learn more',
    bestTimes: ['8am', '12pm', '5pm']
  },
  facebook: {
    maxLength: 500,
    tone: 'friendly and conversational',
    hashtagCount: 2,
    callToAction: 'Get started',
    bestTimes: ['1pm', '3pm', '7pm']
  },
  pinterest: {
    maxLength: 500,
    tone: 'inspirational and visual',
    hashtagCount: 5,
    callToAction: 'Pin it now',
    bestTimes: ['2pm', '8pm', '9pm']
  },
  instagram: {
    maxLength: 2200,
    tone: 'casual and visual',
    hashtagCount: 10,
    callToAction: 'Link in bio',
    bestTimes: ['11am', '2pm', '7pm']
  }
};

export interface ContentCalendarItem {
  id: string;
  date: Date;
  platform: string;
  keyword: string;
  theme: string;
  content: string;
  status: 'scheduled' | 'published' | 'draft';
  createdAt: Date;
}

export class ContentCalendarService {
  /**
   * Generate a weekly content calendar automatically
   */
  static async generateWeeklyCalendar(): Promise<ContentCalendarItem[]> {
    const calendar: ContentCalendarItem[] = [];
    const startDate = new Date();
    
    // Generate 7 days of content (1 post per day per platform)
    for (let day = 0; day < 7; day++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);
      
      // Select platforms for this day (rotate through them)
      const platforms = this.selectPlatformsForDay(day);
      
      for (const platform of platforms) {
        // Pick a keyword and theme
        const keyword = this.selectKeyword(day, platform);
        const theme = this.selectTheme(platform);
        
        // Generate content
        const content = await this.generateSmartContent(platform, keyword, theme);
        
        calendar.push({
          id: `${date.toISOString()}-${platform}`,
          date,
          platform,
          keyword,
          theme: theme.theme,
          content,
          status: 'scheduled',
          createdAt: new Date()
        });
      }
    }
    
    return calendar;
  }

  /**
   * Generate smart content based on platform, keyword, and theme
   */
  static async generateSmartContent(
    platform: string,
    keyword: string,
    theme: { theme: string; angle: string }
  ): Promise<string> {
    const specs = PLATFORM_SPECS[platform as keyof typeof PLATFORM_SPECS] || PLATFORM_SPECS.twitter;
    
    const prompt = `Create a ${specs.tone} social media post for ${platform} about "${keyword}".

Theme: ${theme.theme}
Angle: ${theme.angle}
Max length: ${specs.maxLength} characters
Include ${specs.hashtagCount} relevant hashtags
Call to action: ${specs.callToAction}

The post should:
- Be engaging and valuable
- Highlight a specific benefit or use case
- Include a clear call to action
- Use appropriate hashtags for discoverability
- Match the platform's tone and style

Generate ONLY the post content, no explanations.`;

    try {
      const result = await SocialMediaService.generatePost({
        platform: platform as 'twitter' | 'linkedin' | 'facebook',
        topic: keyword,
        tone: this.mapToneToType(specs.tone),
        includeHashtags: true,
        includeEmojis: true,
        callToAction: specs.callToAction
      });
      return result.content;
    } catch (error) {
      console.error('Failed to generate content:', error);
      // Fallback to template-based content
      return this.generateTemplateContent(platform, keyword, theme);
    }
  }

  /**
   * Map tone string to SocialMediaService tone type
   */
  private static mapToneToType(tone: string): 'professional' | 'casual' | 'inspirational' | 'educational' {
    if (tone.includes('professional')) return 'professional';
    if (tone.includes('casual')) return 'casual';
    if (tone.includes('inspirational')) return 'inspirational';
    return 'educational';
  }

  /**
   * Fallback template-based content generation
   */
  private static generateTemplateContent(
    platform: string,
    keyword: string,
    theme: { theme: string; angle: string }
  ): string {
    const specs = PLATFORM_SPECS[platform as keyof typeof PLATFORM_SPECS];
    
    const templates = {
      Tutorial: `${theme.angle} use ${keyword} to transform your images! 🎨\n\nQuick steps:\n1. Upload your image\n2. Choose enhancement level\n3. Download in seconds\n\n${specs.callToAction} → imageupscaler.app`,
      
      Tip: `💡 Pro tip: ${keyword} works best with high-contrast images. Get sharper, clearer results every time!\n\n${specs.callToAction} → imageupscaler.app`,
      
      Showcase: `Before vs After using ${keyword} ✨\n\nSee the difference AI enhancement makes. Perfect for Etsy sellers and digital artists!\n\n${specs.callToAction} → imageupscaler.app`,
      
      Feature: `Did you know? Our ${keyword} feature can process images up to 4x resolution without quality loss! 🚀\n\n${specs.callToAction} → imageupscaler.app`,
      
      'Success Story': `Etsy seller increased sales by 40% using ${keyword} for product photos! 📈\n\nBetter images = more sales. Try it yourself!\n\n${specs.callToAction} → imageupscaler.app`,
      
      Question: `What's your biggest challenge with ${keyword}? 🤔\n\nDrop a comment and let's solve it together!\n\n${specs.callToAction} → imageupscaler.app`,
      
      'Stat/Fact': `73% of online shoppers say image quality affects their purchase decision. 📊\n\nMake every pixel count with ${keyword}!\n\n${specs.callToAction} → imageupscaler.app`
    };
    
    const content = templates[theme.theme as keyof typeof templates] || templates.Tip;
    
    // Add platform-specific hashtags
    const hashtags = this.generateHashtags(keyword, specs.hashtagCount);
    return `${content}\n\n${hashtags}`;
  }

  /**
   * Select platforms for a specific day (ensure variety)
   */
  private static selectPlatformsForDay(day: number): string[] {
    const allPlatforms = ['twitter', 'linkedin', 'facebook', 'pinterest', 'instagram'];
    
    // Rotate through all platforms
    // Day 0 = Twitter, Day 1 = LinkedIn, Day 2 = Facebook, Day 3 = Pinterest, Day 4 = Instagram, then repeat
    return [allPlatforms[day % allPlatforms.length]];
  }

  /**
   * Select keyword based on day and platform
   */
  private static selectKeyword(day: number, platform: string): string {
    // Rotate through keywords to ensure variety
    const index = (day * 3 + (platform === 'twitter' ? 0 : platform === 'linkedin' ? 1 : 2)) % TARGET_KEYWORDS.length;
    return TARGET_KEYWORDS[index];
  }

  /**
   * Select theme based on platform
   */
  private static selectTheme(platform: string): { theme: string; angle: string; platforms: string[] } {
    const availableThemes = CONTENT_THEMES.filter(t => t.platforms.includes(platform));
    const randomIndex = Math.floor(Math.random() * availableThemes.length);
    return availableThemes[randomIndex];
  }

  /**
   * Generate relevant hashtags
   */
  private static generateHashtags(keyword: string, count: number): string {
    const hashtagMap: Record<string, string[]> = {
      'AI image upscaler': ['#AIImageUpscaler', '#ImageEnhancement', '#AITools', '#PhotoUpscaling', '#DigitalArt', '#AIArt', '#ImageQuality', '#PhotoEditor', '#DesignTools', '#CreativeTools'],
      'image upscaling tool': ['#ImageUpscaling', '#PhotoEnhancement', '#DigitalArt', '#PhotoTools', '#ImageEditor', '#DesignSoftware', '#CreativeDesign', '#DigitalTools', '#PhotoQuality', '#ArtTools'],
      'enhance image quality': ['#ImageQuality', '#PhotoEditing', '#DigitalPhotography', '#PhotoEnhancement', '#ImageEditor', '#Photography', '#DigitalArt', '#PhotoPerfection', '#QualityMatters', '#ProPhotography'],
      'AI photo enhancer': ['#AIPhotoEnhancer', '#PhotoEnhancement', '#AIPhotography', '#PhotoAI', '#ImageAI', '#SmartPhoto', '#AIEditing', '#PhotoMagic', '#EnhancePhotos', '#AITools'],
      'upscale images online': ['#OnlineTools', '#ImageUpscaling', '#DigitalTools', '#WebTools', '#OnlineEditor', '#CloudTools', '#WebDesign', '#DigitalCreation', '#OnlineDesign', '#WebApps'],
      'Etsy seller tools': ['#EtsySeller', '#EtsyTools', '#PrintOnDemand', '#EtsyShop', '#EtsyBusiness', '#HandmadeShop', '#EtsySuccess', '#OnlineSelling', '#EtsyTips', '#ShopOwner'],
      'AI mockup generator': ['#MockupGenerator', '#ProductMockups', '#EtsyDesign', '#MockupDesign', '#ProductPhotography', '#DesignMockup', '#BrandingTools', '#ProductDisplay', '#VisualDesign', '#MockupArt'],
      'AI background removal': ['#BackgroundRemoval', '#PhotoEditing', '#AITools', '#RemoveBackground', '#PhotoCutout', '#ImageEditing', '#CleanBackground', '#ProductPhotography', '#WhiteBackground', '#PhotoTools'],
      'Etsy SEO tools': ['#EtsySEO', '#EtsyMarketing', '#EtsySuccess', '#SEOTools', '#EtsyGrowth', '#OnlineMarketing', '#EtsyTips', '#ShopSEO', '#EtsyStrategy', '#DigitalMarketing']
    };
    
    const hashtags = hashtagMap[keyword] || ['#ImageUpscaler', '#AITools', '#DigitalArt', '#PhotoEnhancement', '#CreativeTools', '#DesignTools', '#AIArt', '#PhotoEditor', '#ImageQuality', '#DigitalDesign'];
    return hashtags.slice(0, count).join(' ');
  }

  /**
   * Get content suggestions for a specific platform
   */
  static async getContentSuggestions(platform: string, count: number = 5): Promise<Array<{
    keyword: string;
    theme: string;
    preview: string;
  }>> {
    const suggestions = [];
    
    for (let i = 0; i < count; i++) {
      const keyword = TARGET_KEYWORDS[i % TARGET_KEYWORDS.length];
      const theme = this.selectTheme(platform);
      const preview = this.generateTemplateContent(platform, keyword, theme).substring(0, 100) + '...';
      
      suggestions.push({
        keyword,
        theme: theme.theme,
        preview
      });
    }
    
    return suggestions;
  }

  /**
   * Generate single smart post for immediate use
   */
  static async generateSmartPost(platform: string): Promise<{
    content: string;
    keyword: string;
    theme: string;
    hashtags: string;
  }> {
    const keyword = TARGET_KEYWORDS[Math.floor(Math.random() * TARGET_KEYWORDS.length)];
    const theme = this.selectTheme(platform);
    const content = await this.generateSmartContent(platform, keyword, theme);
    const specs = PLATFORM_SPECS[platform as keyof typeof PLATFORM_SPECS];
    const hashtags = this.generateHashtags(keyword, specs.hashtagCount);
    
    return {
      content,
      keyword,
      theme: theme.theme,
      hashtags
    };
  }
}
