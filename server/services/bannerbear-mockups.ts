// Professional mockup generation using Bannerbear API
// Replaces custom Canvas-based mockup system with professional quality

import Bannerbear from 'bannerbear';

export interface BannerbearMockupResult {
  id: string;
  name: string;
  imageUrl: string;
  status: 'completed' | 'processing' | 'failed';
}

// Professional interior design templates from Bannerbear
// These will be created in the Bannerbear dashboard
const INTERIOR_TEMPLATES = {
  'living-room-1': 'bb_living_room_modern', // Will be actual template IDs
  'living-room-2': 'bb_living_room_cozy',
  'living-room-3': 'bb_living_room_minimal', 
  'living-room-4': 'bb_living_room_contemporary',
  'living-room-5': 'bb_living_room_gallery'
};

class BannerbearMockupService {
  private bb: Bannerbear | null = null;
  private isEnabled = false;

  constructor() {
    const apiKey = process.env.BANNERBEAR_API_KEY;
    if (apiKey) {
      this.bb = new Bannerbear(apiKey);
      this.isEnabled = true;
      console.log('🎨 Bannerbear API initialized for professional mockups');
    } else {
      console.log('⚠️ Bannerbear API key not found - using fallback mockup system');
    }
  }

  async generateMockups(imageUrl: string, category: string = 'living-room'): Promise<BannerbearMockupResult[]> {
    if (!this.isEnabled || !this.bb) {
      throw new Error('Bannerbear not configured - requires BANNERBEAR_API_KEY');
    }

    console.log(`🎨 Generating professional mockups for category: ${category}`);
    const templates = this.getTemplatesForCategory(category);
    const mockups: BannerbearMockupResult[] = [];

    // Generate mockups for each template
    for (const [templateName, templateId] of Object.entries(templates)) {
      try {
        console.log(`🎨 Creating mockup with template: ${templateName}`);
        
        const image = await this.bb.create_image(templateId, {
          modifications: [
            {
              name: 'artwork_image', // Dynamic object name in template
              image_url: imageUrl
            }
          ]
        });

        mockups.push({
          id: `${category}-${templateName}`,
          name: this.getTemplateName(templateName),
          imageUrl: image.image_url_jpg,
          status: 'completed'
        });

        console.log(`✅ Generated mockup: ${templateName}`);
      } catch (error) {
        console.error(`❌ Failed to generate mockup ${templateName}:`, error);
        mockups.push({
          id: `${category}-${templateName}`,
          name: this.getTemplateName(templateName),
          imageUrl: '',
          status: 'failed'
        });
      }
    }

    return mockups;
  }

  private getTemplatesForCategory(category: string): Record<string, string> {
    switch (category) {
      case 'living-room':
        return INTERIOR_TEMPLATES;
      default:
        return INTERIOR_TEMPLATES; // Default to living room
    }
  }

  private getTemplateName(templateKey: string): string {
    const names: Record<string, string> = {
      'living-room-1': 'Modern Living Room',
      'living-room-2': 'Cozy Living Room', 
      'living-room-3': 'Minimalist Living Room',
      'living-room-4': 'Contemporary Living Room',
      'living-room-5': 'Gallery Wall Display'
    };
    return names[templateKey] || templateKey;
  }

  // Fallback method when Bannerbear is not available
  async generateFallbackMockup(imageBuffer: Buffer): Promise<Buffer> {
    // Import the existing Canvas-based system as fallback
    const { generateMockupsForCategory } = await import('./mockup-templates');
    const mockups = await generateMockupsForCategory(imageBuffer, 'living-room');
    
    // Return the first mockup as fallback
    const firstMockup = Object.values(mockups)[0];
    if (!firstMockup) {
      throw new Error('Failed to generate fallback mockup');
    }
    
    return firstMockup;
  }

  isConfigured(): boolean {
    return this.isEnabled;
  }
}

export const bannerbearService = new BannerbearMockupService();