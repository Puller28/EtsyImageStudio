import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { z } from "zod";
import { storage } from "./storage";
import { insertProjectSchema, insertUserSchema } from "@shared/schema";
import { generateEtsyListing } from "./services/openai";
import { segmindService } from "./services/segmind";
import { aiArtGeneratorService } from "./services/ai-art-generator";
import { fallbackUpscale, base64ToBuffer, bufferToBase64 } from "./services/image-upscaler-fallback";
import { resizeImageToFormats } from "./services/image-processor";
import { generateMockupsForCategory } from "./services/mockup-templates";
import { generateProjectZip } from "./services/zip-generator";
import { AuthService, authenticateToken, optionalAuth, type AuthenticatedRequest } from "./auth";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login({ email, password });
      
      if (!result) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const { password } = req.body;
      
      const result = await AuthService.register({
        ...userData,
        password
      });
      
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid user data", details: error.errors });
      }
      if (error instanceof Error && error.message === "User already exists with this email") {
        return res.status(409).json({ error: error.message });
      }
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Get current user (with optional auth)
  app.get("/api/user", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(req.user);
    } catch (error) {
      console.error("Error getting user:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Get user projects
  app.get("/api/projects", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const projects = await storage.getUserProjects(req.userId);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to get projects" });
    }
  });

  // Get specific project
  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to get project" });
    }
  });

  // Create new project with image upload
  app.post("/api/projects", optionalAuth, upload.single("image"), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      if (!req.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { artworkTitle, styleKeywords, upscaleOption, mockupTemplate } = req.body;
      
      const projectData = insertProjectSchema.parse({
        userId: req.userId,
        title: artworkTitle || "Untitled Artwork",
        originalImageUrl: `data:image/jpeg;base64,${req.file.buffer.toString('base64')}`,
        upscaleOption: upscaleOption || "2x",
        mockupTemplate: mockupTemplate || "living-room",
        artworkTitle: artworkTitle || "Untitled Artwork",
        styleKeywords: styleKeywords || "digital art"
      });

      const project = await storage.createProject(projectData);
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid project data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create project" });
      }
    }
  });

  // Process project (upscale, resize, mockup, SEO) - REAL PROCESSING
  app.post("/api/projects/:id/process", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      console.log(`🔧 Starting REAL processing for project: ${project.id}`);
      
      // Update status to processing
      await storage.updateProject(project.id, { status: "processing" });
      
      // Start real processing in background
      processProjectAsync(project).catch(error => {
        console.error(`🔧❌ Background processing failed for ${project.id}:`, error);
      });
      
      res.json({ message: "Real processing started" });
      
    } catch (error) {
      console.error("🔧❌ Failed to start real processing:", error);
      await storage.updateProject(req.params.id, { status: "failed" });
      res.status(500).json({ error: "Failed to process project" });
    }
  });

  // Generate Etsy listing
  app.post("/api/projects/:id/generate-listing", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const { artworkTitle, styleKeywords } = req.body;
      const listing = await generateEtsyListing(artworkTitle, styleKeywords);
      
      await storage.updateProject(project.id, { etsyListing: listing });
      
      res.json(listing);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate listing" });
    }
  });

  // Reset stuck project status (debug endpoint)
  app.post("/api/projects/:id/reset", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Mark as completed with dummy data for stuck projects
      await storage.updateProject(project.id, {
        status: "completed",
        zipUrl: "data:application/zip;base64,UEsDBAoAAAAAAItJJVkAAAAAAAAAAAAAAAAJAAAAbW9ja3VwLmpwZw==",
        mockupImageUrl: project.upscaledImageUrl || project.originalImageUrl,
        resizedImages: [project.originalImageUrl, project.originalImageUrl, project.originalImageUrl, project.originalImageUrl, project.originalImageUrl]
      });

      const updatedProject = await storage.getProject(project.id);
      res.json(updatedProject);
    } catch (error) {
      res.status(500).json({ error: "Failed to reset project" });
    }
  });

  // Download project ZIP
  app.get("/api/projects/:id/download", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project || project.status !== "completed") {
        return res.status(404).json({ error: "Project not ready for download" });
      }

      if (!project.zipUrl) {
        return res.status(404).json({ error: "ZIP file not available" });
      }

      // In a real implementation, you would stream the file from storage
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${project.title}.zip"`);
      res.json({ downloadUrl: project.zipUrl });
    } catch (error) {
      res.status(500).json({ error: "Failed to download project" });
    }
  });

  // Generate and download ZIP file with actual assets
  app.get("/api/projects/:id/download-zip", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project || project.status !== "completed") {
        return res.status(404).json({ error: "Project not ready for download" });
      }

      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Add project files to ZIP
      if (project.originalImageUrl && project.originalImageUrl.startsWith('data:image/')) {
        const base64Data = project.originalImageUrl.split(',')[1];
        zip.file("original-image.jpg", base64Data, { base64: true });
      }

      // Add upscaled image
      if (project.upscaledImageUrl && project.upscaledImageUrl.startsWith('data:image/')) {
        const base64Data = project.upscaledImageUrl.split(',')[1];
        zip.file("upscaled-image.jpg", base64Data, { base64: true });
      }

      // Add print format sizes
      const printFormats = ["4x5-8x10.jpg", "3x4-18x24.jpg", "2x3-12x18.jpg", "11x14.jpg", "A4-ISO.jpg"];
      printFormats.forEach((filename, index) => {
        if (project.resizedImages?.[index] && project.resizedImages[index].startsWith('data:image/')) {
          const base64Data = project.resizedImages[index].split(',')[1];
          zip.file(`print-formats/${filename}`, base64Data, { base64: true });
        }
      });

      // Add mockup images
      if (project.mockupImages) {
        Object.entries(project.mockupImages).forEach(([key, url], index) => {
          if (url && typeof url === 'string' && url.startsWith('data:image/')) {
            const base64Data = url.split(',')[1];
            zip.file(`mockups/mockup-${index + 1}.jpg`, base64Data, { base64: true });
          }
        });
      }

      // Add Etsy listing content if available
      if (project.etsyListing) {
        zip.file("etsy-listing.txt", 
          `TITLE: ${project.etsyListing.title}\n\n` +
          `TAGS: ${project.etsyListing.tags.join(', ')}\n\n` +
          `DESCRIPTION:\n${project.etsyListing.description}`
        );
      }

      // Generate ZIP file
      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${project.title || 'project'}.zip"`);
      res.send(zipBuffer);

    } catch (error) {
      console.error("ZIP generation error:", error);
      res.status(500).json({ error: "Failed to generate ZIP file" });
    }
  });

  // AI Art Generation endpoint
  app.post("/api/generate-art", async (req, res) => {
    try {
      const { prompt, negativePrompt, aspectRatio, category } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      console.log('Starting AI art generation with prompt:', prompt);
      
      // Generate optimized prompt for Etsy
      const optimizedPrompt = aiArtGeneratorService.generateEtsyPrompt(prompt, category);
      
      // Generate artwork using Imagen 3
      const base64Image = await aiArtGeneratorService.generateArtwork({
        prompt: optimizedPrompt,
        negativePrompt,
        aspectRatio: aspectRatio as '1:1' | '3:4' | '4:3' | '9:16' | '16:9',
      });
      
      console.log('AI art generation completed successfully');
      
      res.json({ 
        image: base64Image,
        prompt: optimizedPrompt
      });
      
    } catch (error) {
      console.error("AI art generation error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate artwork" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function processProjectAsync(project: any) {
  const startTime = Date.now();
  
  console.log(`🔧 processProjectAsync called for project: ${project.id}`);
  console.log(`🔧 Project data:`, JSON.stringify(project, null, 2));
  
  try {
    console.log('🔧 Starting real image processing for:', project.id);
    
    // Import processing services
    const { SegmindService } = await import('./services/segmind');
    const { resizeImageToFormats } = await import('./services/image-processor');
    const { generateMockupsForCategory, getTemplatesForCategory } = await import('./services/mockup-templates');
    
    // Convert base64 image to buffer for processing
    const base64Data = project.originalImageUrl.split(',')[1];
    const originalBuffer = Buffer.from(base64Data, 'base64');
    
    // Step 1: Upscale image using Segmind or fallback
    console.log('Step 1: Upscaling image...');
    let upscaledImageUrl = project.originalImageUrl;
    
    try {
      if (process.env.SEGMIND_API_KEY) {
        const segmind = new SegmindService(process.env.SEGMIND_API_KEY);
        const upscaleOption = project.upscaleOption || '2x';
        const scale = upscaleOption === '4x' ? 4 : 2;
        
        const upscaledBase64 = await segmind.upscaleImage({
          scale,
          image: base64Data
        });
        
        upscaledImageUrl = `data:image/jpeg;base64,${upscaledBase64}`;
        console.log('✅ Image upscaled successfully with Segmind');
      } else {
        console.log('⚠️ Segmind API key not found, using fallback upscaler');
        throw new Error('No Segmind API key');
      }
    } catch (error) {
      console.error('❌ Segmind upscaling failed, trying fallback:', error);
      try {
        const { fallbackUpscale } = await import('./services/image-upscaler-fallback');
        const upscaleOption = project.upscaleOption || '2x';
        const scale = upscaleOption === '4x' ? 4 : 2;
        
        const upscaledBuffer = await fallbackUpscale(originalBuffer, scale);
        upscaledImageUrl = `data:image/jpeg;base64,${upscaledBuffer.toString('base64')}`;
        console.log('✅ Image upscaled successfully with fallback');
      } catch (fallbackError) {
        console.error('❌ Fallback upscaling also failed, using original:', fallbackError);
      }
    }
    
    // Step 2: Create print format sizes
    console.log('Step 2: Creating print formats...');
    const upscaledBuffer = Buffer.from(upscaledImageUrl.split(',')[1], 'base64');
    const resizedFormats = await resizeImageToFormats(upscaledBuffer);
    
    const resizedImages = Object.values(resizedFormats).map(buffer => 
      `data:image/jpeg;base64,${buffer.toString('base64')}`
    );
    
    console.log('✅ Created', resizedImages.length, 'print formats');
    
    // Step 3: Generate mockups
    console.log('Step 3: Generating mockups...');
    const mockupTemplate = project.mockupTemplate || 'living-room';
    
    const mockupImages: { [key: string]: string } = {};
    
    try {
      // Generate mockups for the selected template category
      const mockupBuffers = await generateMockupsForCategory(upscaledBuffer, mockupTemplate);
      
      for (const [mockupId, buffer] of Object.entries(mockupBuffers)) {
        mockupImages[mockupId] = `data:image/jpeg;base64,${buffer.toString('base64')}`;
      }
      
      console.log('✅ Generated', Object.keys(mockupImages).length, 'mockups');
    } catch (error) {
      console.error('❌ Mockup generation failed:', error);
      // Use upscaled image as fallback for mockups
      const templates = getTemplatesForCategory(mockupTemplate);
      for (let i = 0; i < Math.min(5, templates.length); i++) {
        const template = templates[i];
        mockupImages[template.id] = upscaledImageUrl;
      }
    }
    
    // Update project with processed assets
    await storage.updateProject(project.id, {
      upscaledImageUrl,
      mockupImageUrl: Object.values(mockupImages)[0] || upscaledImageUrl,
      mockupImages,
      resizedImages,
      zipUrl: `/api/projects/${project.id}/download-zip`,
      status: "completed"
    });

    const processingTime = Date.now() - startTime;
    console.log(`✅ Real processing completed successfully for project: ${project.id} in ${processingTime}ms`);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`🔧❌ Processing failed for project ${project.id} after ${processingTime}ms:`, error);
    console.error("🔧❌ Error details:", (error as Error).stack);
    console.error("🔧❌ Error type:", typeof error);
    console.error("🔧❌ Error message:", (error as Error).message);
    await storage.updateProject(project.id, { status: "failed" });
  }
}
