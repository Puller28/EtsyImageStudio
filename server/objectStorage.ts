import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

// The object storage client is used to interact with the object storage service.
export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// The object storage service for handling project images
export class ProjectImageStorage {
  private bucketName: string;
  
  constructor() {
    this.bucketName = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || "";
    if (!this.bucketName) {
      throw new Error("Object storage bucket not configured");
    }
  }

  // Upload image data (base64) to object storage and return URL
  async uploadImage(imageData: string, projectId: string, imageType: 'upscaled' | 'mockup' | 'resize'): Promise<string> {
    try {
      // Remove data URL prefix if present
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      const objectName = `projects/${projectId}/${imageType}/${randomUUID()}.jpg`;
      const file = objectStorageClient.bucket(this.bucketName).file(objectName);
      
      await file.save(buffer, {
        metadata: {
          contentType: 'image/jpeg',
        },
        public: false,
      });
      
      console.log(`✅ Uploaded ${imageType} image to storage: ${objectName}`);
      return `/objects/${objectName}`;
      
    } catch (error) {
      console.error(`❌ Failed to upload ${imageType} image:`, error);
      throw error;
    }
  }

  // Upload multiple images and return URLs
  async uploadImages(images: { [key: string]: string }, projectId: string, imageType: 'mockups' | 'resizes'): Promise<{ [key: string]: string }> {
    const results: { [key: string]: string } = {};
    
    for (const [key, imageData] of Object.entries(images)) {
      if (imageData && imageData.length > 0) {
        try {
          const url = await this.uploadImage(imageData, projectId, imageType === 'mockups' ? 'mockup' : 'resize');
          results[key] = url;
        } catch (error) {
          console.warn(`⚠️ Failed to upload ${key} for project ${projectId}:`, error);
        }
      }
    }
    
    return results;
  }

  // Serve image from object storage
  async serveImage(objectPath: string, res: Response): Promise<void> {
    try {
      // Remove /objects/ prefix to get actual object name
      const objectName = objectPath.replace(/^\/objects\//, '');
      const file = objectStorageClient.bucket(this.bucketName).file(objectName);
      
      const [exists] = await file.exists();
      if (!exists) {
        res.status(404).json({ error: 'Image not found' });
        return;
      }
      
      const [metadata] = await file.getMetadata();
      
      res.set({
        'Content-Type': metadata.contentType || 'image/jpeg',
        'Content-Length': metadata.size,
        'Cache-Control': 'public, max-age=3600',
      });
      
      const stream = file.createReadStream();
      stream.on('error', (err) => {
        console.error('Stream error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error streaming image' });
        }
      });
      
      stream.pipe(res);
      
    } catch (error) {
      console.error('Error serving image:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error serving image' });
      }
    }
  }

  // Create a small thumbnail from image data (for database storage)
  static createThumbnail(imageData: string, maxSize: number = 200): string {
    // For now, just truncate the base64 data for smaller storage
    // In production, you'd use an image processing library to create actual thumbnails
    if (imageData.length <= maxSize * 1000) {
      return imageData; // Already small enough
    }
    
    // Return original for now - in production, implement actual thumbnail generation
    return imageData;
  }
}