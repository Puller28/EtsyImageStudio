// Professional mockup template system using HTML5 Canvas
// Creates realistic artwork presentations in professional interior settings

import { createCanvas, loadImage } from "canvas";
import sharp from 'sharp';

export interface MockupTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  dropZone: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number; // degrees
    perspective?: boolean;
  };
  background: string;
  overlays?: Array<{
    type: 'frame' | 'shadow' | 'reflection' | 'wall' | 'furniture';
    x: number;
    y: number;
    width: number;
    height: number;
    color?: string;
    opacity?: number;
  }>;
}

// Define 5 mockup templates per category
export const MOCKUP_TEMPLATES: Record<string, MockupTemplate[]> = {
  "living-room": [
    {
      id: "living-room-1",
      name: "Modern Living Room - Large Wall",
      width: 1600,
      height: 1200,
      dropZone: { x: 400, y: 200, width: 800, height: 600 },
      background: "#f8f8f8",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 800, color: "#e8e8e8" },
        { type: 'furniture', x: 100, y: 800, width: 400, height: 400, color: "#8B4513" }, // Sofa
        { type: 'shadow', x: 420, y: 780, width: 760, height: 40, color: "#000000", opacity: 0.2 }
      ]
    },
    {
      id: "living-room-2", 
      name: "Cozy Living Room - Above Sofa",
      width: 1600,
      height: 1200,
      dropZone: { x: 500, y: 150, width: 600, height: 450 },
      background: "#f5f5f5",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 700, color: "#ddd" },
        { type: 'furniture', x: 200, y: 700, width: 1200, height: 500, color: "#654321" }, // Large sofa
        { type: 'frame', x: 490, y: 140, width: 620, height: 470, color: "#8B4513" }
      ]
    },
    {
      id: "living-room-3",
      name: "Minimalist Living Room - Gallery Wall",
      width: 1600,
      height: 1200,
      dropZone: { x: 300, y: 250, width: 500, height: 375 },
      background: "#ffffff",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 900, color: "#f9f9f9" },
        { type: 'furniture', x: 50, y: 900, width: 300, height: 300, color: "#2F4F4F" }, // Side table
        { type: 'shadow', x: 315, y: 615, width: 470, height: 20, color: "#000000", opacity: 0.15 }
      ]
    },
    {
      id: "living-room-4",
      name: "Contemporary Living Room - Corner Display",
      width: 1600,
      height: 1200,
      dropZone: { x: 200, y: 180, width: 700, height: 525, rotation: -2 },
      background: "#f7f7f7",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 850, color: "#e5e5e5" },
        { type: 'furniture', x: 1000, y: 750, width: 600, height: 450, color: "#708090" }, // Modern chair
        { type: 'frame', x: 190, y: 170, width: 720, height: 545, color: "#2F4F4F" }
      ]
    },
    {
      id: "living-room-5",
      name: "Elegant Living Room - Fireplace Mantle",
      width: 1600,
      height: 1200,
      dropZone: { x: 450, y: 100, width: 700, height: 525 },
      background: "#fafafa",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 800, color: "#ececec" },
        { type: 'furniture', x: 300, y: 600, width: 1000, height: 200, color: "#8B4513" }, // Mantle
        { type: 'furniture', x: 400, y: 800, width: 800, height: 400, color: "#2F2F2F" }, // Fireplace
        { type: 'shadow', x: 465, y: 610, width: 670, height: 25, color: "#000000", opacity: 0.3 }
      ]
    }
  ],
  "bedroom": [
    {
      id: "bedroom-1",
      name: "Master Bedroom - Above Bed",
      width: 1600,
      height: 1200,
      dropZone: { x: 450, y: 150, width: 700, height: 525 },
      background: "#f9f9f9",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 800, color: "#f0f0f0" },
        { type: 'furniture', x: 200, y: 700, width: 1200, height: 500, color: "#8B7355" }, // Bed
        { type: 'shadow', x: 465, y: 665, width: 670, height: 20, color: "#000000", opacity: 0.2 }
      ]
    },
    {
      id: "bedroom-2",
      name: "Cozy Bedroom - Bedside Wall",
      width: 1600,
      height: 1200,
      dropZone: { x: 100, y: 200, width: 500, height: 375 },
      background: "#f8f8f8",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 850, color: "#e8e8e8" },
        { type: 'furniture', x: 700, y: 800, width: 900, height: 400, color: "#8B7355" }, // Bed
        { type: 'furniture', x: 50, y: 850, width: 200, height: 350, color: "#654321" }, // Nightstand
        { type: 'frame', x: 90, y: 190, width: 520, height: 395, color: "#2F4F4F" }
      ]
    },
    {
      id: "bedroom-3",
      name: "Modern Bedroom - Accent Wall",
      width: 1600,
      height: 1200,
      dropZone: { x: 300, y: 180, width: 600, height: 450, rotation: 1 },
      background: "#ffffff",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 800, color: "#f5f5f5" },
        { type: 'furniture', x: 1000, y: 750, width: 600, height: 450, color: "#696969" }, // Modern dresser
        { type: 'shadow', x: 315, y: 620, width: 570, height: 15, color: "#000000", opacity: 0.15 }
      ]
    },
    {
      id: "bedroom-4",
      name: "Romantic Bedroom - Gallery Style",
      width: 1600,
      height: 1200,
      dropZone: { x: 500, y: 120, width: 600, height: 450 },
      background: "#fdf8f8",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 750, color: "#f0e6e6" },
        { type: 'furniture', x: 300, y: 700, width: 1000, height: 500, color: "#DDA0DD" }, // Bed with headboard
        { type: 'frame', x: 490, y: 110, width: 620, height: 470, color: "#8B4513" }
      ]
    },
    {
      id: "bedroom-5",
      name: "Minimalist Bedroom - Clean Lines",
      width: 1600,
      height: 1200,
      dropZone: { x: 400, y: 200, width: 800, height: 600 },
      background: "#ffffff",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 850, color: "#fafafa" },
        { type: 'furniture', x: 150, y: 800, width: 1300, height: 400, color: "#F5F5DC" }, // Platform bed
        { type: 'shadow', x: 420, y: 790, width: 760, height: 25, color: "#000000", opacity: 0.1 }
      ]
    }
  ],
  "office": [
    {
      id: "office-1",
      name: "Home Office - Behind Desk",
      width: 1600,
      height: 1200,
      dropZone: { x: 400, y: 100, width: 800, height: 600 },
      background: "#ffffff",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 800, color: "#f8f8f8" },
        { type: 'furniture', x: 200, y: 800, width: 1200, height: 400, color: "#8B4513" }, // Desk
        { type: 'shadow', x: 420, y: 690, width: 760, height: 20, color: "#000000", opacity: 0.2 }
      ]
    },
    {
      id: "office-2",
      name: "Professional Office - Side Wall",
      width: 1600,
      height: 1200,
      dropZone: { x: 200, y: 200, width: 600, height: 450 },
      background: "#f9f9f9",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 850, color: "#eeeeee" },
        { type: 'furniture', x: 900, y: 800, width: 700, height: 400, color: "#2F4F4F" }, // Office chair & desk
        { type: 'frame', x: 190, y: 190, width: 620, height: 470, color: "#000000" }
      ]
    },
    {
      id: "office-3",
      name: "Creative Office - Inspiration Wall",
      width: 1600,
      height: 1200,
      dropZone: { x: 300, y: 150, width: 700, height: 525, rotation: -1 },
      background: "#fefefe",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 800, color: "#f0f0f0" },
        { type: 'furniture', x: 100, y: 850, width: 400, height: 350, color: "#FF6347" }, // Creative desk
        { type: 'shadow', x: 315, y: 665, width: 670, height: 20, color: "#000000", opacity: 0.15 }
      ]
    },
    {
      id: "office-4",
      name: "Executive Office - Conference Area",
      width: 1600,
      height: 1200,
      dropZone: { x: 450, y: 120, width: 700, height: 525 },
      background: "#f7f7f7",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 800, color: "#e0e0e0" },
        { type: 'furniture', x: 200, y: 800, width: 1200, height: 400, color: "#654321" }, // Conference table
        { type: 'frame', x: 440, y: 110, width: 720, height: 545, color: "#2F4F4F" }
      ]
    },
    {
      id: "office-5",
      name: "Modern Office - Standing Desk Area",
      width: 1600,
      height: 1200,
      dropZone: { x: 500, y: 180, width: 600, height: 450 },
      background: "#ffffff",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 850, color: "#f5f5f5" },
        { type: 'furniture', x: 1100, y: 750, width: 500, height: 450, color: "#708090" }, // Standing desk
        { type: 'shadow', x: 515, y: 620, width: 570, height: 15, color: "#000000", opacity: 0.2 }
      ]
    }
  ],
  "kitchen": [
    {
      id: "kitchen-1",
      name: "Modern Kitchen - Above Counter",
      width: 1600,
      height: 1200,
      dropZone: { x: 400, y: 150, width: 800, height: 600 },
      background: "#ffffff",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 850, color: "#f8f8f8" },
        { type: 'furniture', x: 100, y: 850, width: 1400, height: 350, color: "#8B4513" }, // Counter
        { type: 'shadow', x: 420, y: 740, width: 760, height: 20, color: "#000000", opacity: 0.2 }
      ]
    },
    {
      id: "kitchen-2",
      name: "Farmhouse Kitchen - Breakfast Nook",
      width: 1600,
      height: 1200,
      dropZone: { x: 300, y: 200, width: 600, height: 450 },
      background: "#fefefe",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 800, color: "#f0f0f0" },
        { type: 'furniture', x: 1000, y: 800, width: 600, height: 400, color: "#DEB887" }, // Breakfast table
        { type: 'frame', x: 290, y: 190, width: 620, height: 470, color: "#8B4513" }
      ]
    },
    {
      id: "kitchen-3",
      name: "Contemporary Kitchen - Island View",
      width: 1600,
      height: 1200,
      dropZone: { x: 200, y: 120, width: 700, height: 525, rotation: 2 },
      background: "#f9f9f9",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 750, color: "#eeeeee" },
        { type: 'furniture', x: 500, y: 800, width: 1100, height: 400, color: "#2F4F4F" }, // Kitchen island
        { type: 'shadow', x: 215, y: 635, width: 670, height: 20, color: "#000000", opacity: 0.15 }
      ]
    },
    {
      id: "kitchen-4",
      name: "Rustic Kitchen - Above Stove",
      width: 1600,
      height: 1200,
      dropZone: { x: 450, y: 180, width: 700, height: 525 },
      background: "#faf8f8",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 800, color: "#e8e8e8" },
        { type: 'furniture', x: 300, y: 750, width: 1000, height: 450, color: "#8B4513" }, // Stove area
        { type: 'frame', x: 440, y: 170, width: 720, height: 545, color: "#654321" }
      ]
    },
    {
      id: "kitchen-5",
      name: "Scandinavian Kitchen - Clean Aesthetic",
      width: 1600,
      height: 1200,
      dropZone: { x: 500, y: 200, width: 600, height: 450 },
      background: "#ffffff",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 850, color: "#fafafa" },
        { type: 'furniture', x: 50, y: 850, width: 1500, height: 350, color: "#F5F5DC" }, // Light wood counter
        { type: 'shadow', x: 515, y: 640, width: 570, height: 15, color: "#000000", opacity: 0.1 }
      ]
    }
  ],
  "hallway": [
    {
      id: "hallway-1",
      name: "Grand Hallway - Statement Wall",
      width: 1600,
      height: 1200,
      dropZone: { x: 400, y: 100, width: 800, height: 600 },
      background: "#f8f8f8",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 900, color: "#eeeeee" },
        { type: 'furniture', x: 100, y: 900, width: 1400, height: 300, color: "#8B4513" }, // Hallway runner
        { type: 'shadow', x: 420, y: 690, width: 760, height: 25, color: "#000000", opacity: 0.2 }
      ]
    },
    {
      id: "hallway-2",
      name: "Narrow Hallway - Gallery Display",
      width: 1200,
      height: 1600,
      dropZone: { x: 300, y: 200, width: 600, height: 450 },
      background: "#ffffff",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1200, height: 1200, color: "#f5f5f5" },
        { type: 'furniture', x: 50, y: 1200, width: 1100, height: 400, color: "#708090" }, // Hallway console
        { type: 'frame', x: 290, y: 190, width: 620, height: 470, color: "#2F4F4F" }
      ]
    },
    {
      id: "hallway-3",
      name: "Entryway Hallway - Welcome Area",
      width: 1600,
      height: 1200,
      dropZone: { x: 200, y: 150, width: 700, height: 525, rotation: -1 },
      background: "#fafafa",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 850, color: "#f0f0f0" },
        { type: 'furniture', x: 1000, y: 800, width: 600, height: 400, color: "#8B4513" }, // Entry bench
        { type: 'shadow', x: 215, y: 665, width: 670, height: 20, color: "#000000", opacity: 0.15 }
      ]
    },
    {
      id: "hallway-4",
      name: "Long Hallway - Multiple Frames",
      width: 1600,
      height: 1200,
      dropZone: { x: 450, y: 200, width: 700, height: 525 },
      background: "#f7f7f7",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 900, color: "#e5e5e5" },
        { type: 'furniture', x: 0, y: 900, width: 1600, height: 300, color: "#654321" }, // Hallway floor
        { type: 'frame', x: 440, y: 190, width: 720, height: 545, color: "#000000" }
      ]
    },
    {
      id: "hallway-5",
      name: "Modern Hallway - Minimalist Display",
      width: 1600,
      height: 1200,
      dropZone: { x: 500, y: 180, width: 600, height: 450 },
      background: "#ffffff",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 850, color: "#fafafa" },
        { type: 'furniture', x: 200, y: 850, width: 1200, height: 350, color: "#F5F5DC" }, // Clean hallway floor
        { type: 'shadow', x: 515, y: 620, width: 570, height: 15, color: "#000000", opacity: 0.1 }
      ]
    }
  ],
  "gallery": [
    {
      id: "gallery-1",
      name: "Art Gallery - Spotlight Display",
      width: 1600,
      height: 1200,
      dropZone: { x: 400, y: 150, width: 800, height: 600 },
      background: "#ffffff",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 1000, color: "#f8f8f8" },
        { type: 'furniture', x: 0, y: 1000, width: 1600, height: 200, color: "#2F2F2F" }, // Gallery floor
        { type: 'shadow', x: 420, y: 740, width: 760, height: 30, color: "#000000", opacity: 0.3 }
      ]
    },
    {
      id: "gallery-2",
      name: "Museum Gallery - Professional Frame",
      width: 1600,
      height: 1200,
      dropZone: { x: 300, y: 200, width: 600, height: 450 },
      background: "#fefefe",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 1000, color: "#f5f5f5" },
        { type: 'furniture', x: 0, y: 1000, width: 1600, height: 200, color: "#708090" }, // Polished floor
        { type: 'frame', x: 280, y: 180, width: 640, height: 490, color: "#8B4513" }
      ]
    },
    {
      id: "gallery-3",
      name: "Contemporary Gallery - Clean Lines",
      width: 1600,
      height: 1200,
      dropZone: { x: 450, y: 120, width: 700, height: 525, rotation: 0 },
      background: "#ffffff",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 950, color: "#fafafa" },
        { type: 'furniture', x: 0, y: 950, width: 1600, height: 250, color: "#E5E5E5" }, // Gallery floor
        { type: 'shadow', x: 465, y: 635, width: 670, height: 25, color: "#000000", opacity: 0.2 }
      ]
    },
    {
      id: "gallery-4",
      name: "Industrial Gallery - Exposed Elements",
      width: 1600,
      height: 1200,
      dropZone: { x: 200, y: 180, width: 800, height: 600, rotation: 1 },
      background: "#f7f7f7",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 950, color: "#e8e8e8" },
        { type: 'furniture', x: 0, y: 950, width: 1600, height: 250, color: "#2F4F4F" }, // Concrete floor
        { type: 'frame', x: 185, y: 165, width: 830, height: 630, color: "#000000" }
      ]
    },
    {
      id: "gallery-5",
      name: "Boutique Gallery - Intimate Setting",
      width: 1600,
      height: 1200,
      dropZone: { x: 500, y: 200, width: 600, height: 450 },
      background: "#fafafa",
      overlays: [
        { type: 'wall', x: 0, y: 0, width: 1600, height: 950, color: "#f0f0f0" },
        { type: 'furniture', x: 0, y: 950, width: 1600, height: 250, color: "#8B4513" }, // Warm wood floor
        { type: 'shadow', x: 515, y: 640, width: 570, height: 20, color: "#000000", opacity: 0.15 }
      ]
    }
  ]
};

export async function generateMockupsForCategory(imageBuffer: Buffer, category: string): Promise<{ [mockupId: string]: Buffer }> {
  const templates = MOCKUP_TEMPLATES[category];
  if (!templates) {
    throw new Error(`No templates found for category: ${category}`);
  }

  console.log(`Generating ${templates.length} mockups for category: ${category}`);
  const mockups: { [mockupId: string]: Buffer } = {};

  for (const template of templates) {
    try {
      const mockupBuffer = await generateMockupFromTemplate(imageBuffer, template);
      mockups[template.id] = mockupBuffer;
      console.log(`Generated mockup: ${template.name}`);
    } catch (error) {
      console.error(`Failed to generate mockup ${template.name}:`, error);
    }
  }

  return mockups;
}

async function generateMockupFromTemplate(imageBuffer: Buffer, template: MockupTemplate): Promise<Buffer> {
  try {
    // Create canvas with template dimensions
    const canvas = createCanvas(template.width, template.height);
    const ctx = canvas.getContext("2d");

    // Create realistic room background
    await drawRealisticRoom(ctx, template);

    // Draw frame border (realistic picture frame)
    drawPictureFrame(ctx, template.dropZone);

    // Load and process the artwork image
    const image = await loadImage(imageBuffer);
    
    // Calculate scaling to fit drop zone while maintaining aspect ratio
    const dropZone = template.dropZone;
    const imageAspect = image.width / image.height;
    const dropZoneAspect = dropZone.width / dropZone.height;
    
    let drawWidth = dropZone.width;
    let drawHeight = dropZone.height;
    
    if (imageAspect > dropZoneAspect) {
      // Image is wider than drop zone
      drawHeight = dropZone.width / imageAspect;
    } else {
      // Image is taller than drop zone
      drawWidth = dropZone.height * imageAspect;
    }
    
    // Center the image in the drop zone
    const drawX = dropZone.x + (dropZone.width - drawWidth) / 2;
    const drawY = dropZone.y + (dropZone.height - drawHeight) / 2;

    // Apply rotation if specified
    if (dropZone.rotation) {
      const centerX = drawX + drawWidth / 2;
      const centerY = drawY + drawHeight / 2;
      
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((dropZone.rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
    }

    // Draw the artwork
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    
    if (dropZone.rotation) {
      ctx.restore();
    }

    // Convert canvas to buffer with 300 DPI
    const canvasBuffer = canvas.toBuffer("image/jpeg");
    
    // Process through Sharp to ensure 300 DPI metadata
    const finalBuffer = await sharp(canvasBuffer)
      .jpeg({ quality: 95 })
      .withMetadata({
        density: 300 // Ensure 300 DPI for print quality
      })
      .toBuffer();

    return finalBuffer;
  } catch (error) {
    throw new Error(`Failed to generate mockup from template: ${(error as Error).message}`);
  }
}

// Create realistic room backgrounds
async function drawRealisticRoom(ctx: any, template: MockupTemplate) {
  const { width, height } = template;
  
  // Create gradient backgrounds for depth
  if (template.id.includes('living-room-1')) {
    // Modern living room with accent wall
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#f8f9fa");
    gradient.addColorStop(0.6, "#e9ecef");
    gradient.addColorStop(1, "#dee2e6");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Accent wall behind artwork
    ctx.fillStyle = "#343a40";
    ctx.fillRect(200, 0, 1200, height * 0.7);
    
    // Floor
    ctx.fillStyle = "#8b5a3c";
    ctx.fillRect(0, height * 0.7, width, height * 0.3);
    
  } else if (template.id.includes('living-room-2')) {
    // Cozy warm living room
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#fff8f0");
    gradient.addColorStop(0.65, "#f5ebe0");
    gradient.addColorStop(1, "#d6ad7d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Sofa area
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(150, height * 0.6, width - 300, height * 0.4);
    
  } else if (template.id.includes('living-room-3')) {
    // Minimalist white room
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    
    // Subtle wall texture
    ctx.fillStyle = "#f8f9fa";
    ctx.fillRect(0, 0, width, height * 0.75);
    
    // Light hardwood floor
    ctx.fillStyle = "#deb887";
    ctx.fillRect(0, height * 0.75, width, height * 0.25);
    
  } else if (template.id.includes('living-room-4')) {
    // Contemporary room with dramatic lighting
    const gradient = ctx.createRadialGradient(width/2, height/3, 0, width/2, height/3, width/2);
    gradient.addColorStop(0, "#f0f0f0");
    gradient.addColorStop(0.7, "#e0e0e0");
    gradient.addColorStop(1, "#c0c0c0");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Dark floor
    ctx.fillStyle = "#2f2f2f";
    ctx.fillRect(0, height * 0.8, width, height * 0.2);
    
  } else {
    // Gallery/boutique setting
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, width, height);
    
    // Gallery wall
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, width, height * 0.8);
    
    // Polished floor
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(0, height * 0.8, width, height * 0.2);
  }
  
  // Add subtle lighting effects
  addLightingEffects(ctx, width, height);
}

// Draw realistic picture frame
function drawPictureFrame(ctx: any, dropZone: any) {
  const frameWidth = 15;
  const shadowOffset = 8;
  
  // Frame shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fillRect(
    dropZone.x + shadowOffset, 
    dropZone.y + shadowOffset, 
    dropZone.width + frameWidth * 2, 
    dropZone.height + frameWidth * 2
  );
  
  // Frame outer border (dark wood)
  ctx.fillStyle = "#4a4a4a";
  ctx.fillRect(
    dropZone.x - frameWidth, 
    dropZone.y - frameWidth, 
    dropZone.width + frameWidth * 2, 
    dropZone.height + frameWidth * 2
  );
  
  // Frame inner border (highlight)
  ctx.fillStyle = "#6a6a6a";
  ctx.fillRect(
    dropZone.x - frameWidth + 3, 
    dropZone.y - frameWidth + 3, 
    dropZone.width + (frameWidth - 3) * 2, 
    dropZone.height + (frameWidth - 3) * 2
  );
  
  // Mat/inner frame
  ctx.fillStyle = "#f8f8f8";
  ctx.fillRect(
    dropZone.x - 5, 
    dropZone.y - 5, 
    dropZone.width + 10, 
    dropZone.height + 10
  );
}

// Add realistic lighting effects
function addLightingEffects(ctx: any, width: number, height: number) {
  // Subtle window light from left
  const lightGradient = ctx.createLinearGradient(0, 0, width * 0.3, 0);
  lightGradient.addColorStop(0, "rgba(255, 255, 255, 0.1)");
  lightGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = lightGradient;
  ctx.fillRect(0, 0, width * 0.3, height * 0.7);
  
  // Ambient room shadow in corners
  const cornerGradient = ctx.createRadialGradient(width, height, 0, width, height, width * 0.8);
  cornerGradient.addColorStop(0, "rgba(0, 0, 0, 0.05)");
  cornerGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = cornerGradient;
  ctx.fillRect(0, 0, width, height);
}

// Get available categories
export function getMockupCategories(): string[] {
  return Object.keys(MOCKUP_TEMPLATES);
}

// Get templates for a specific category
export function getTemplatesForCategory(category: string): MockupTemplate[] {
  return MOCKUP_TEMPLATES[category] || [];
}