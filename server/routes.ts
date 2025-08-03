import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { z } from "zod";
import { storage } from "./storage";
import { insertProjectSchema } from "@shared/schema";
import { generateEtsyListing } from "./services/openai";
import { segmindService } from "./services/segmind";
import { fallbackUpscale, base64ToBuffer, bufferToBase64 } from "./services/image-upscaler-fallback";
import { resizeImageToFormats, generateMockup } from "./services/image-processor";
import { generateProjectZip } from "./services/zip-generator";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Get current user (demo user)
  app.get("/api/user", async (req, res) => {
    try {
      const user = await storage.getUser("demo-user-1");
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error getting user:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Get user projects
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getUserProjects("demo-user-1");
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
  app.post("/api/projects", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const { artworkTitle, styleKeywords, upscaleOption, mockupTemplate } = req.body;
      
      const projectData = insertProjectSchema.parse({
        userId: "demo-user-1",
        title: artworkTitle,
        originalImageUrl: `data:image/jpeg;base64,${req.file.buffer.toString('base64')}`,
        upscaleOption,
        mockupTemplate,
        artworkTitle,
        styleKeywords
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

  // Process project (upscale, resize, mockup, SEO)
  app.post("/api/projects/:id/process", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Update status to processing
      await storage.updateProject(project.id, { status: "processing" });

      // Process in background
      processProjectAsync(project);

      res.json({ message: "Processing started" });
    } catch (error) {
      res.status(500).json({ error: "Failed to start processing" });
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

  const httpServer = createServer(app);
  return httpServer;
}

async function processProjectAsync(project: any) {
  try {
    console.log('Starting project processing for:', project.id);
    
    // Convert base64 to buffer
    const imageData = project.originalImageUrl.split(',')[1];
    const originalBuffer = Buffer.from(imageData, 'base64');
    
    console.log('Original image size:', originalBuffer.length, 'bytes');

    // Step 1: Upscale image using Segmind (with fallback)
    const scale = project.upscaleOption === "4x" ? 4 : 2;
    let upscaledBase64: string;
    
    try {
      console.log('Attempting Segmind API upscaling...');
      upscaledBase64 = await segmindService.upscaleImage({
        scale: scale as 2 | 4,
        image: imageData
      });
      console.log('Segmind upscaling successful');
    } catch (segmindError: any) {
      console.log('Segmind API failed, using fallback upscaling:', segmindError.message);
      
      // Fallback to Sharp-based upscaling
      const upscaledBuffer = await fallbackUpscale(originalBuffer, scale);
      upscaledBase64 = bufferToBase64(upscaledBuffer);
      console.log('Fallback upscaling completed');
    }
    
    const upscaledImageUrl = `data:image/jpeg;base64,${upscaledBase64}`;
    await storage.updateProject(project.id, { upscaledImageUrl });

    // Step 2: Resize to print formats
    const upscaledBuffer = Buffer.from(upscaledBase64, 'base64');
    const resizedImages = await resizeImageToFormats(upscaledBuffer);
    
    // Convert to base64 URLs for storage
    const resizedImageUrls = Object.fromEntries(
      Object.entries(resizedImages).map(([format, buffer]) => [
        format,
        `data:image/jpeg;base64,${buffer.toString('base64')}`
      ])
    );

    // Step 3: Generate mockup
    const mockupBuffer = await generateMockup(upscaledBuffer, project.mockupTemplate);
    const mockupImageUrl = `data:image/jpeg;base64,${mockupBuffer.toString('base64')}`;

    // Step 4: Generate ZIP
    const zipBuffer = await generateProjectZip({
      originalImage: originalBuffer,
      upscaledImage: upscaledBuffer,
      resizedImages,
      mockupImage: mockupBuffer,
      etsyListing: project.etsyListing || { title: "", tags: [], description: "" },
      projectTitle: project.title
    });

    const zipUrl = `data:application/zip;base64,${zipBuffer.toString('base64')}`;

    // Update project with final results
    await storage.updateProject(project.id, {
      mockupImageUrl,
      resizedImages: Object.values(resizedImageUrls),
      zipUrl,
      status: "completed"
    });

  } catch (error) {
    console.error("Processing failed:", error);
    console.error("Error details:", error.stack);
    await storage.updateProject(project.id, { status: "failed" });
  }
}
