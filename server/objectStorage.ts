import { Response } from "express";
import { randomUUID } from "crypto";
import { Readable } from "stream";

const storageBaseUrl = (() => {
  const explicitUrl = process.env.SUPABASE_PROJECT_ASSETS_URL?.replace(/\/+$/, "");
  if (explicitUrl) return explicitUrl;

  const projectUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  if (projectUrl) return `${projectUrl}/storage/v1`;

  throw new Error("SUPABASE_PROJECT_ASSETS_URL or SUPABASE_URL must be configured");
})();

const serviceKey = (() => {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_KEY is required for object storage");
  }
  return key;
})();

function encodePath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

async function uploadToSupabase(bucket: string, objectName: string, buffer: Buffer, contentType: string) {
  const uploadUrl = `${storageBaseUrl}/object/${encodeURIComponent(bucket)}/${encodePath(objectName)}`;
  const uploadHeaders: Record<string, string> = {
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
    "Content-Type": contentType,
    "Content-Length": buffer.length.toString(),
    "x-upsert": "true",
  };

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: uploadHeaders,
    body: buffer,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Supabase storage upload failed (${response.status}): ${errorText}`);
  }
}

async function downloadFromSupabase(bucket: string, objectName: string) {
  const downloadUrl = `${storageBaseUrl}/object/authenticated/${encodeURIComponent(bucket)}/${encodePath(objectName)}`;
  const downloadHeaders: Record<string, string> = {
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
  };

  const response = await fetch(downloadUrl, {
    headers: downloadHeaders,
  });

  return response;
}

async function deleteFromSupabase(bucket: string, objectName: string) {
  const deleteUrl = `${storageBaseUrl}/object/${encodeURIComponent(bucket)}/${encodePath(objectName)}`;
  const deleteHeaders: Record<string, string> = {
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
  };

  const response = await fetch(deleteUrl, {
    method: "DELETE",
    headers: deleteHeaders,
  });

  if (response.ok || response.status === 404) {
    return;
  }

  const errorText = await response.text().catch(() => "");

  if (response.status === 400) {
    try {
      const errorJson = JSON.parse(errorText);
      const statusCode = String(errorJson?.statusCode || "");
      const message = String(errorJson?.message || "").toLowerCase();
      const error = String(errorJson?.error || "").toLowerCase();

      if (statusCode === "404" || message.includes("not found") || error.includes("not_found")) {
        return;
      }
    } catch {
      // Ignore JSON parse errors and fall through to throw
    }
  }

  throw new Error(`Supabase storage delete failed (${response.status}): ${errorText}`);
}

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

  private normaliseObjectPath(path: string): string {
    return path.replace(/^\/?objects\//, "");
  }

  publicUrlForPath(objectPath: string): string {
    const normalized = this.normaliseObjectPath(objectPath);
    return `/objects/${normalized}`;
  }

  // Upload image data (base64) to object storage and return URL
  async uploadImage(imageData: string, projectId: string, imageType: string): Promise<string> {
    try {
      // Remove data URL prefix if present
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      const objectName = `projects/${projectId}/${imageType}/${randomUUID()}.jpg`;
      await uploadToSupabase(this.bucketName, objectName, buffer, "image/jpeg");

      console.log(`storage: Uploaded ${imageType} image to storage: ${objectName}`);
      return this.publicUrlForPath(objectName);
    } catch (error) {
      console.error(`storage: Failed to upload ${imageType} image:`, error);
      throw error;
    }
  }

  async uploadAssetBuffer(buffer: Buffer, projectId: string, filename: string, contentType: string): Promise<{ storagePath: string; publicUrl: string }> {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
    const objectName = `projects/${projectId}/assets/${randomUUID()}-${safeName}`;
    await uploadToSupabase(this.bucketName, objectName, buffer, contentType || "application/octet-stream");
    return {
      storagePath: objectName,
      publicUrl: this.publicUrlForPath(objectName),
    };
  }

  // Upload multiple images and return URLs
  async uploadImages(images: { [key: string]: string }, projectId: string, imageType: "mockups" | "resizes"): Promise<{ [key: string]: string }> {
    const results: { [key: string]: string } = {};

    for (const [key, imageData] of Object.entries(images)) {
      if (imageData && imageData.length > 0) {
        try {
          const folder = imageType === "mockups" ? "mockup" : "resize";
          const url = await this.uploadImage(imageData, projectId, folder);
          results[key] = url;
        } catch (error) {
          console.warn(`storage: Failed to upload ${key} for project ${projectId}:`, error);
        }
      }
    }

    return results;
  }

  async deleteAsset(objectPath: string): Promise<void> {
    const normalized = this.normaliseObjectPath(objectPath);
    try {
      await deleteFromSupabase(this.bucketName, normalized);
    } catch (error) {
      console.error(`storage: Failed to delete asset ${normalized}:`, error);
      throw error;
    }
  }

  // Serve image from object storage
  async serveImage(objectPath: string, res: Response): Promise<void> {
    try {
      // Remove /objects/ prefix to get actual object name
      const objectName = objectPath.replace(/^\/objects\//, "");

      const response = await downloadFromSupabase(this.bucketName, objectName);

      if (response.status === 404) {
        res.status(404).json({ error: "Image not found" });
        return;
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`Supabase storage download failed (${response.status}): ${errorText}`);
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      const contentLength = response.headers.get("content-length");

      const headers: Record<string, string> = {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      };
      if (contentLength) {
        headers["Content-Length"] = contentLength;
      }

      res.set(headers);

      if (!response.body) {
        res.status(500).json({ error: "Empty response from storage" });
        return;
      }

      Readable.fromWeb(response.body as any)
        .on("error", (err) => {
          console.error("Stream error:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: "Error streaming image" });
          }
        })
        .pipe(res);
    } catch (error) {
      console.error("Error serving image:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error serving image" });
      }
    }
  }

  // Fetch image from storage and return as Buffer
  async fetchImageAsBuffer(storagePath: string): Promise<Buffer> {
    try {
      const normalized = this.normaliseObjectPath(storagePath);
      const response = await downloadFromSupabase(this.bucketName, normalized);

      if (!response.ok) {
        throw new Error(`Failed to fetch image from storage: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error(`storage: Failed to fetch image ${storagePath}:`, error);
      throw error;
    }
  }

  // Helper to check if a value is a storage path (not base64)
  static isStoragePath(value: string | null | undefined): boolean {
    if (!value || typeof value !== 'string') return false;
    return value.startsWith('/objects/') || value.startsWith('projects/');
  }

  // Helper to convert storage path or base64 to buffer
  async getImageBuffer(imageUrl: string | null): Promise<Buffer | null> {
    if (!imageUrl) return null;

    // If it's a storage path, fetch from storage
    if (ProjectImageStorage.isStoragePath(imageUrl)) {
      return await this.fetchImageAsBuffer(imageUrl);
    }

    // If it's base64, convert directly
    if (imageUrl.startsWith('data:image/')) {
      const base64Data = imageUrl.split(',')[1];
      return Buffer.from(base64Data, 'base64');
    }

    return null;
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



