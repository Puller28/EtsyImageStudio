import { ProjectImageStorage, objectStorageClient } from "../objectStorage";
import { db } from "../db";
import { projects } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface MigrationProgress {
  totalProjects: number;
  processedProjects: number;
  migratedImages: number;
  errors: string[];
  startTime: Date;
  estimatedCompletion?: Date;
}

export class ImageMigrationService {
  private objectStorage = new ProjectImageStorage();
  private bucketName = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || "";
  private progress: MigrationProgress = {
    totalProjects: 0,
    processedProjects: 0,
    migratedImages: 0,
    errors: [],
    startTime: new Date()
  };

  /**
   * Check if a URL is a base64 data URL
   */
  private isBase64Url(url: string): boolean {
    return url.startsWith('data:image/');
  }

  /**
   * Check if a URL is already using object storage
   */
  private isObjectStorageUrl(url: string): boolean {
    return url.startsWith('/objects/') || url.includes('storage.googleapis.com');
  }

  /**
   * Upload base64 image to object storage and return the URL
   */
  private async uploadImageToStorage(
    base64Data: string, 
    projectId: string, 
    imageType: string
  ): Promise<string> {
    try {
      // Remove data URL prefix if present
      const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      
      const objectName = `projects/${projectId}/${imageType}/${randomUUID()}.jpg`;
      const file = objectStorageClient.bucket(this.bucketName).file(objectName);
      
      // Save buffer directly to object storage
      await file.save(buffer, {
        metadata: {
          contentType: 'image/jpeg',
        },
        public: false,
      });
      
      const objectPath = `/objects/${objectName}`;
      console.log(`✅ Migrated ${imageType} image to object storage: ${objectPath}`);
      return objectPath;
      
    } catch (error) {
      console.error(`❌ Failed to upload ${imageType} image:`, error);
      throw error;
    }
  }

  /**
   * Migrate a single project's images from base64 to object storage
   */
  async migrateProjectImages(projectId: string): Promise<{
    success: boolean;
    migratedCount: number;
    errors: string[];
  }> {
    const result = { success: true, migratedCount: 0, errors: [] };
    
    try {
      // Fetch project from database
      const projectRows = await db.select().from(projects).where(eq(projects.id, projectId));
      if (projectRows.length === 0) {
        throw new Error(`Project ${projectId} not found`);
      }

      const project = projectRows[0];
      const updates: any = {};

      // Migrate original image
      if (project.originalImageUrl && this.isBase64Url(project.originalImageUrl)) {
        try {
          const objectUrl = await this.uploadImageToStorage(
            project.originalImageUrl, 
            projectId, 
            'original'
          );
          updates.originalImageUrl = objectUrl;
          result.migratedCount++;
        } catch (error) {
          const errorMsg = `Failed to migrate original image: ${error}`;
          result.errors.push(errorMsg);
          result.success = false;
        }
      }

      // Migrate upscaled image
      if (project.upscaledImageUrl && this.isBase64Url(project.upscaledImageUrl)) {
        try {
          const objectUrl = await this.uploadImageToStorage(
            project.upscaledImageUrl, 
            projectId, 
            'upscaled'
          );
          updates.upscaledImageUrl = objectUrl;
          result.migratedCount++;
        } catch (error) {
          const errorMsg = `Failed to migrate upscaled image: ${error}`;
          result.errors.push(errorMsg);
          result.success = false;
        }
      }

      // Migrate mockup image
      if (project.mockupImageUrl && this.isBase64Url(project.mockupImageUrl)) {
        try {
          const objectUrl = await this.uploadImageToStorage(
            project.mockupImageUrl, 
            projectId, 
            'mockup'
          );
          updates.mockupImageUrl = objectUrl;
          result.migratedCount++;
        } catch (error) {
          const errorMsg = `Failed to migrate mockup image: ${error}`;
          result.errors.push(errorMsg);
          result.success = false;
        }
      }

      // Migrate mockup images object
      if (project.mockupImages) {
        const migratedMockups: Record<string, string> = {};
        let mockupMigrated = false;

        for (const [key, imageUrl] of Object.entries(project.mockupImages)) {
          if (this.isBase64Url(imageUrl)) {
            try {
              const objectUrl = await this.uploadImageToStorage(
                imageUrl, 
                projectId, 
                `mockup-${key}`
              );
              migratedMockups[key] = objectUrl;
              mockupMigrated = true;
              result.migratedCount++;
            } catch (error) {
              const errorMsg = `Failed to migrate mockup ${key}: ${error}`;
              result.errors.push(errorMsg);
              result.success = false;
              migratedMockups[key] = imageUrl; // Keep original on error
            }
          } else {
            migratedMockups[key] = imageUrl; // Already migrated or not base64
          }
        }

        if (mockupMigrated) {
          updates.mockupImages = migratedMockups;
        }
      }

      // Migrate resized images
      if (project.resizedImages && project.resizedImages.length > 0) {
        const migratedResized = [];
        let resizedMigrated = false;

        for (const resized of project.resizedImages) {
          if (this.isBase64Url(resized.url)) {
            try {
              const objectUrl = await this.uploadImageToStorage(
                resized.url, 
                projectId, 
                `resize-${resized.size}`
              );
              migratedResized.push({ ...resized, url: objectUrl });
              resizedMigrated = true;
              result.migratedCount++;
            } catch (error) {
              const errorMsg = `Failed to migrate resized ${resized.size}: ${error}`;
              result.errors.push(errorMsg);
              result.success = false;
              migratedResized.push(resized); // Keep original on error
            }
          } else {
            migratedResized.push(resized); // Already migrated or not base64
          }
        }

        if (resizedMigrated) {
          updates.resizedImages = migratedResized;
        }
      }

      // Update project in database if we have changes
      if (Object.keys(updates).length > 0) {
        await db.update(projects)
          .set({
            ...updates,
            metadata: {
              ...project.metadata,
              migratedToObjectStorage: true,
              migrationDate: new Date().toISOString()
            }
          })
          .where(eq(projects.id, projectId));

        console.log(`✅ Updated project ${projectId} with ${result.migratedCount} migrated images`);
      }

      return result;

    } catch (error) {
      const errorMsg = `Failed to migrate project ${projectId}: ${error}`;
      result.errors.push(errorMsg);
      result.success = false;
      return result;
    }
  }

  /**
   * Get migration status for all projects
   */
  async getMigrationStatus(): Promise<{
    total: number;
    needsMigration: number;
    alreadyMigrated: number;
    sampleProjects: Array<{
      id: string;
      title: string;
      base64Images: string[];
      objectStorageImages: string[];
    }>;
  }> {
    const allProjects = await db.select().from(projects);
    
    let needsMigration = 0;
    let alreadyMigrated = 0;
    const sampleProjects = [];

    for (const project of allProjects.slice(0, 10)) { // Sample first 10
      const base64Images = [];
      const objectStorageImages = [];

      // Check each image field
      if (project.originalImageUrl) {
        if (this.isBase64Url(project.originalImageUrl)) {
          base64Images.push('original');
        } else if (this.isObjectStorageUrl(project.originalImageUrl)) {
          objectStorageImages.push('original');
        }
      }

      if (project.upscaledImageUrl) {
        if (this.isBase64Url(project.upscaledImageUrl)) {
          base64Images.push('upscaled');
        } else if (this.isObjectStorageUrl(project.upscaledImageUrl)) {
          objectStorageImages.push('upscaled');
        }
      }

      if (project.mockupImageUrl) {
        if (this.isBase64Url(project.mockupImageUrl)) {
          base64Images.push('mockup');
        } else if (this.isObjectStorageUrl(project.mockupImageUrl)) {
          objectStorageImages.push('mockup');
        }
      }

      // Count project migration status
      if (base64Images.length > 0) {
        needsMigration++;
      } else {
        alreadyMigrated++;
      }

      sampleProjects.push({
        id: project.id,
        title: project.title,
        base64Images,
        objectStorageImages
      });
    }

    return {
      total: allProjects.length,
      needsMigration,
      alreadyMigrated,
      sampleProjects
    };
  }

  /**
   * Run batch migration with progress tracking
   */
  async runBatchMigration(batchSize: number = 5): Promise<MigrationProgress> {
    console.log(`🚀 Starting batch migration with batch size: ${batchSize}`);
    
    // Reset progress
    this.progress = {
      totalProjects: 0,
      processedProjects: 0,
      migratedImages: 0,
      errors: [],
      startTime: new Date()
    };

    try {
      // Get projects that need migration
      const allProjects = await db.select().from(projects);
      const projectsNeedingMigration = [];

      for (const project of allProjects) {
        const hasBase64 = 
          (project.originalImageUrl && this.isBase64Url(project.originalImageUrl)) ||
          (project.upscaledImageUrl && this.isBase64Url(project.upscaledImageUrl)) ||
          (project.mockupImageUrl && this.isBase64Url(project.mockupImageUrl)) ||
          (project.mockupImages && Object.values(project.mockupImages).some(url => this.isBase64Url(url))) ||
          (project.resizedImages && project.resizedImages.some(r => this.isBase64Url(r.url)));

        if (hasBase64) {
          projectsNeedingMigration.push(project.id);
        }
      }

      this.progress.totalProjects = projectsNeedingMigration.length;
      console.log(`📊 Found ${this.progress.totalProjects} projects needing migration`);

      // Process in batches
      for (let i = 0; i < projectsNeedingMigration.length; i += batchSize) {
        const batch = projectsNeedingMigration.slice(i, i + batchSize);
        
        console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(projectsNeedingMigration.length / batchSize)}`);

        // Process batch in parallel
        const batchPromises = batch.map(projectId => this.migrateProjectImages(projectId));
        const batchResults = await Promise.allSettled(batchPromises);

        // Update progress
        for (const result of batchResults) {
          this.progress.processedProjects++;
          
          if (result.status === 'fulfilled') {
            this.progress.migratedImages += result.value.migratedCount;
            this.progress.errors.push(...result.value.errors);
          } else {
            this.progress.errors.push(`Batch processing error: ${result.reason}`);
          }
        }

        // Estimate completion time
        const elapsed = Date.now() - this.progress.startTime.getTime();
        const avgTimePerProject = elapsed / this.progress.processedProjects;
        const remainingProjects = this.progress.totalProjects - this.progress.processedProjects;
        
        if (remainingProjects > 0) {
          this.progress.estimatedCompletion = new Date(
            Date.now() + (avgTimePerProject * remainingProjects)
          );
        }

        console.log(`📈 Progress: ${this.progress.processedProjects}/${this.progress.totalProjects} projects (${this.progress.migratedImages} images migrated)`);

        // Small delay between batches to prevent overwhelming the system
        if (i + batchSize < projectsNeedingMigration.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`✅ Migration completed: ${this.progress.migratedImages} images migrated from ${this.progress.processedProjects} projects`);
      if (this.progress.errors.length > 0) {
        console.log(`⚠️  Encountered ${this.progress.errors.length} errors during migration`);
      }

      return this.progress;

    } catch (error) {
      this.progress.errors.push(`Migration failed: ${error}`);
      console.error('❌ Migration failed:', error);
      return this.progress;
    }
  }

  /**
   * Get current migration progress
   */
  getProgress(): MigrationProgress {
    return this.progress;
  }
}