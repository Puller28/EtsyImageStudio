import { User, Project, CreditTransaction, NewsletterSubscriber, InsertNewsletterSubscriber } from "../shared/schema";
import crypto from "crypto";
import postgres from 'postgres';
import { ProjectImageStorage } from './objectStorage';

type SqlClient = ReturnType<typeof postgres>;
type ProjectSummary = Pick<Project,
  'hasOriginalImage' |
  'hasUpscaledImage' |
  'hasMockupImage' |
  'hasMockupImages' |
  'mockupCount' |
  'hasResizedImages' |
  'resizedCount' |
  'hasEtsyListing'
>;

type ProjectBase = Omit<Project, 'id' | 'createdAt' | keyof ProjectSummary>;
type CreateProjectInput = ProjectBase & Partial<ProjectSummary>;

function deriveProjectSummary(data: Partial<Project>): ProjectSummary {
  const hasOriginalImage = typeof data.originalImageUrl === 'string' && data.originalImageUrl.trim().length > 0;
  const hasUpscaledImage = typeof data.upscaledImageUrl === 'string' && data.upscaledImageUrl.trim().length > 0;
  const hasMockupImage = typeof data.mockupImageUrl === 'string' && data.mockupImageUrl.trim().length > 0;

  let mockupCount = 0;
  const mockupImages = data.mockupImages ?? null;
  if (Array.isArray(mockupImages)) {
    mockupCount = mockupImages.length;
  } else if (mockupImages && typeof mockupImages === 'object') {
    mockupCount = Object.keys(mockupImages).length;
  }
  const hasMockupImages = mockupCount > 0;

  let resizedCount = 0;
  const resizedImages = data.resizedImages ?? [];
  if (Array.isArray(resizedImages)) {
    resizedCount = resizedImages.length;
  } else if (resizedImages && typeof resizedImages === 'object') {
    resizedCount = Object.keys(resizedImages).length;
  }
  const hasResizedImages = resizedCount > 0;

  const hasEtsyListing =
    !!data.etsyListing &&
    typeof data.etsyListing === 'object' &&
    Object.keys(data.etsyListing).length > 0;

  return {
    hasOriginalImage,
    hasUpscaledImage,
    hasMockupImage,
    hasMockupImages,
    mockupCount,
    hasResizedImages,
    resizedCount,
    hasEtsyListing,
  };
}

function applySummaryToMetadata(metadata: Project['metadata'] | null | undefined, summary: ProjectSummary): Project['metadata'] {
  const base = metadata && typeof metadata === 'object' ? metadata : {};
  return {
    ...base,
    summary: {
      hasOriginalImage: summary.hasOriginalImage,
      hasUpscaledImage: summary.hasUpscaledImage,
      hasMockupImage: summary.hasMockupImage,
      hasMockupImages: summary.hasMockupImages,
      mockupCount: summary.mockupCount,
      hasResizedImages: summary.hasResizedImages,
      resizedCount: summary.resizedCount,
      hasEtsyListing: summary.hasEtsyListing,
    },
  };
}

// Helper to check if a value is a base64 data URL
function isBase64DataUrl(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith('data:image/');
}

// Helper to upload base64 image to storage and return storage path
async function uploadBase64ToStorage(base64Data: string, projectId: string, imageType: string): Promise<string | null> {
  if (!isBase64DataUrl(base64Data)) {
    return base64Data; // Already a path or null
  }
  
  try {
    const imageStorage = new ProjectImageStorage();
    const storagePath = await imageStorage.uploadImage(base64Data, projectId, imageType);
    console.log(`✅ Uploaded ${imageType} to storage: ${storagePath}`);
    return storagePath;
  } catch (error) {
    console.error(`❌ Failed to upload ${imageType} to storage:`, error);
    
    // Smart fallback: If image is very large (>2MB base64), try to compress it
    const base64Size = base64Data.length;
    const sizeInMB = base64Size / (1024 * 1024);
    
    if (sizeInMB > 2 && imageType === 'original') {
      console.warn(`⚠️ Original image is very large (${sizeInMB.toFixed(1)}MB), generating compressed version for database storage`);
      try {
        const { generateThumbnail } = await import('./services/image-processor');
        const buffer = Buffer.from(base64Data.split(',')[1], 'base64');
        const compressed = await generateThumbnail(buffer, 1600, 1600, 80); // Larger thumbnail for originals
        console.log(`✅ Compressed original from ${sizeInMB.toFixed(1)}MB to ${(compressed.length / (1024 * 1024)).toFixed(1)}MB`);
        return compressed;
      } catch (compressionError) {
        console.error(`❌ Failed to compress image:`, compressionError);
      }
    }
    
    return base64Data; // Fallback to original if upload and compression fail
  }
}

// Helper to upload multiple images (mockups/resizes) to storage IN PARALLEL
async function uploadImagesToStorage(
  images: Record<string, string> | Array<{size: string; url: string}>,
  projectId: string,
  imageType: 'mockup' | 'resize'
): Promise<Record<string, string> | Array<{size: string; url: string}>> {
  try {
    const imageStorage = new ProjectImageStorage();
    
    if (Array.isArray(images)) {
      // Handle resized images array - upload in parallel
      const uploaded = await Promise.all(
        images.map(async (item) => {
          if (isBase64DataUrl(item.url)) {
            const storagePath = await imageStorage.uploadImage(item.url, projectId, imageType);
            return { size: item.size, url: storagePath };
          }
          return item;
        })
      );
      return uploaded;
    } else {
      // Handle mockup images object - upload in parallel
      const entries = Object.entries(images);
      const uploadPromises = entries.map(async ([key, value]) => {
        if (isBase64DataUrl(value)) {
          const storagePath = await imageStorage.uploadImage(value, projectId, imageType);
          return [key, storagePath] as [string, string];
        }
        return [key, value] as [string, string];
      });
      
      const uploadedEntries = await Promise.all(uploadPromises);
      return Object.fromEntries(uploadedEntries);
    }
  } catch (error) {
    console.error(`❌ Failed to upload ${imageType} images to storage:`, error);
    return images; // Fallback to original if upload fails
  }
}

function parseJsonObject<T>(value: unknown, fallback: T): T {
  if (value == null) {
    return fallback;
  }

  if (typeof value === 'object') {
    return value as T;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return fallback;
}

function parseResizedImages(value: unknown): Project['resizedImages'] {
  const fallback: Project['resizedImages'] = [];
  const parsed = parseJsonObject(value, fallback);
  if (Array.isArray(parsed)) {
    return parsed;
  }
  return fallback;
}

function parseMockupImages(value: unknown): Project['mockupImages'] {
  if (value == null) {
    return null;
  }
  const parsed = parseJsonObject(value, {} as Record<string, string>);
  if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
    return parsed;
  }
  return null;
}

function parseEtsyListing(value: unknown): Project['etsyListing'] {
  if (value == null) {
    return null;
  }

  const parsed = parseJsonObject(value, null as Project['etsyListing']);

  if (
    parsed &&
    typeof parsed === 'object' &&
    'title' in parsed &&
    'tags' in parsed &&
    Array.isArray((parsed as any).tags) &&
    'description' in parsed
  ) {
    return parsed as Project['etsyListing'];
  }

  return null;
}

function transformDbProjectRow(row: any): Project {
  const mockupImages = parseMockupImages(row.mockup_images);
  const resizedImages = parseResizedImages(row.resized_images);
  const etsyListing = parseEtsyListing(row.etsy_listing);

  const base: Partial<Project> = {
    id: row.id,
    userId: row.user_id,
    title: row.title || 'Untitled Project',
    originalImageUrl: row.original_image_url,
    upscaledImageUrl: row.upscaled_image_url,
    mockupImageUrl: row.mockup_image_url,
    mockupImages,
    resizedImages,
    etsyListing,
    mockupTemplate: row.mockup_template,
    upscaleOption: row.upscale_option || '2x',
    status: row.status || 'pending',
    zipUrl: row.zip_url,
    thumbnailUrl: row.thumbnail_url,
    aiPrompt: row.ai_prompt,
    metadata: parseJsonObject(row.metadata, {}),
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
  };

  const summaryFromDb: ProjectSummary | null =
    typeof row.has_original_image === 'boolean'
      ? {
          hasOriginalImage: row.has_original_image,
          hasUpscaledImage: !!row.has_upscaled_image,
          hasMockupImage: !!row.has_mockup_image,
          hasMockupImages: !!row.has_mockup_images,
          mockupCount: Number(row.mockup_count) || 0,
          hasResizedImages: !!row.has_resized_images,
          resizedCount: Number(row.resized_count) || 0,
          hasEtsyListing: !!row.has_etsy_listing,
        }
      : null;

  const summary = summaryFromDb ?? deriveProjectSummary(base);
  const metadataWithSummary = applySummaryToMetadata(base.metadata ?? {}, summary);

  return {
    ...base,
    ...summary,
    metadata: metadataWithSummary,
  } as Project;
}

const POSTGRES_OPTIONS = {
  ssl: 'require' as const,
  max: 5,
  idle_timeout: 20,
  connect_timeout: 30,
  prepare: false,
  transform: { undefined: null },
  onnotice: () => {},
  fetch_types: false
};

let sharedSqlClient: SqlClient | null = null;
let sharedSqlOriginalEnd: (() => Promise<void>) | null = null;
let shutdownHandlersRegistered = false;

function registerShutdownHandlers() {
  if (shutdownHandlersRegistered) {
    return;
  }

  const teardown = async () => {
    if (!sharedSqlClient || !sharedSqlOriginalEnd) {
      return;
    }
    try {
      await sharedSqlOriginalEnd();
    } catch (error) {
      console.warn('Failed to gracefully shut down shared Postgres connection:', error);
    } finally {
      sharedSqlClient = null;
      sharedSqlOriginalEnd = null;
    }
  };

  process.once('exit', () => {
    void teardown();
  });

  shutdownHandlersRegistered = true;
}

// Robust database connection for production stability
function createDbConnection(): SqlClient {
  if (!sharedSqlClient) {
    const instance = postgres(process.env.DATABASE_URL!, POSTGRES_OPTIONS);
    sharedSqlOriginalEnd = instance.end.bind(instance);
    // Prevent downstream calls from closing the shared pool.
    instance.end = async () => Promise.resolve();
    sharedSqlClient = instance;
    registerShutdownHandlers();
  }
  return sharedSqlClient;
}

export interface IStorage {
  // User management
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Project management
  createProject(project: CreateProjectInput): Promise<Project>;
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByUserId(userId: string): Promise<Project[]>;
  deleteProject(id: string): Promise<boolean>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;

  // Credit management
  updateUserCredits(userId: string, credits: number): Promise<void>;
  updateUserSubscription(userId: string, subscriptionData: {
    subscriptionStatus: string;
    subscriptionPlan?: string;
    subscriptionId?: string;
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date;
  }): Promise<void>;
  updateUserCreditsWithTransaction(userId: string, creditChange: number, transactionType: string, description: string, projectId?: string): Promise<boolean>;
  logCreditTransaction(userId: string, type: string, amount: number, description: string): Promise<void>;
  createCreditTransaction(transaction: Omit<CreditTransaction, 'id' | 'createdAt'>): Promise<CreditTransaction>;
  getCreditTransactions(userId: string): Promise<CreditTransaction[]>;

  // Payment management
  isPaymentProcessed(paymentReference: string): Promise<boolean>;
  markPaymentProcessed(paymentReference: string, userId: string, creditsAllocated: number): Promise<void>;
  processWebhookPaymentAtomic(paymentReference: string, userId: string, creditsToAdd: number, transactionType: string): Promise<{success: boolean, alreadyProcessed: boolean}>;

  // Contact management
  getContactMessages(): Promise<any[]>;
  createContactMessage(message: any): Promise<any>;

  // Newsletter management
  createNewsletterSubscriber(subscriber: InsertNewsletterSubscriber): Promise<NewsletterSubscriber>;
  getNewsletterSubscribers(): Promise<NewsletterSubscriber[]>;
  unsubscribeNewsletter(email: string): Promise<boolean>;

  // Password reset
  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  getPasswordResetToken(token: string): Promise<{ userId: string; expiresAt: Date } | undefined>;
  deletePasswordResetToken(token: string): Promise<void>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<void>;
}

class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private projects = new Map<string, Project>();
  private projectListFetchedAt = new Map<string, number>();
  private creditTransactions = new Map<string, CreditTransaction>();
  private processedPayments = new Set<string>();
  private contactMessages = new Map<string, any>();
  private newsletterSubscribers = new Map<string, NewsletterSubscriber>();
  private passwordResetTokens = new Map<string, { userId: string; expiresAt: Date }>();

  private getCachedProjectsForUser(userId: string): Project[] {
    return Array.from(this.projects.values())
      .filter(project => project.userId === userId)
      .sort((a, b) => {
        const aTime = a.createdAt ? a.createdAt.getTime() : 0;
        const bTime = b.createdAt ? b.createdAt.getTime() : 0;
        return bTime - aTime;
      });
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = Array.from(this.users.values()).find(u => u.email === email);
    if (user) {
      console.log(`✅ Found user in memory: ${email}`);
      return user;
    }

    // Try to load from database
    try {
      const sql = createDbConnection();

      const users = await sql`
        SELECT * FROM public.users 
        WHERE email = ${email}
        LIMIT 1
      `;

      await sql.end();

      if (users.length > 0) {
        const dbUser = users[0];
        const user: User = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          password: dbUser.password,
          avatar: dbUser.avatar,
          credits: dbUser.credits || 100,
          subscriptionStatus: dbUser.subscription_status || 'free',
          subscriptionPlan: dbUser.subscription_plan,
          subscriptionId: dbUser.subscription_id,
          subscriptionStartDate: dbUser.subscription_start_date ? new Date(dbUser.subscription_start_date) : null,
          subscriptionEndDate: dbUser.subscription_end_date ? new Date(dbUser.subscription_end_date) : null,
          lastLogin: dbUser.last_login ? new Date(dbUser.last_login) : null,
          isAdmin: dbUser.is_admin || false,
          createdAt: new Date(dbUser.created_at)
        };
        
        this.users.set(user.id, user);
        console.log(`🔄 Loaded user ${email} from database`);
        return user;
      }
    } catch (error) {
      console.warn(`⚠️ Database query failed for user ${email}:`, error);
    }

    return undefined;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user) {
      return user;
    }

    // Try to load from database
    try {
      const sql = createDbConnection();

      const users = await sql`
        SELECT * FROM public.users 
        WHERE id = ${id}
        LIMIT 1
      `;

      await sql.end();

      if (users.length > 0) {
        const dbUser = users[0];
        const user: User = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          password: dbUser.password,
          avatar: dbUser.avatar,
          credits: dbUser.credits || 100,
          subscriptionStatus: dbUser.subscription_status || 'free',
          subscriptionPlan: dbUser.subscription_plan,
          subscriptionId: dbUser.subscription_id,
          subscriptionStartDate: dbUser.subscription_start_date ? new Date(dbUser.subscription_start_date) : null,
          subscriptionEndDate: dbUser.subscription_end_date ? new Date(dbUser.subscription_end_date) : null,
          lastLogin: dbUser.last_login ? new Date(dbUser.last_login) : null,
          isAdmin: dbUser.is_admin || false,
          createdAt: new Date(dbUser.created_at)
        };
        
        this.users.set(user.id, user);
        console.log(`🔄 Refreshed user ${id} from DB - Credits: ${user.credits}`);
        return user;
      }
    } catch (error) {
      console.warn(`⚠️ Database refresh failed for user ${id}:`, error);
    }

    return undefined;
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const id = crypto.randomUUID();
    const createdAt = new Date();
    
    const user: User = {
      id,
      ...userData,
      createdAt
    };

    // First persist to database - this MUST succeed
    try {
      const sql = createDbConnection();

      await sql`
        INSERT INTO public.users (id, email, name, password, credits, subscription_status, subscription_plan, created_at)
        VALUES (${user.id}, ${user.email}, ${user.name || user.email.split('@')[0]}, ${user.password}, ${user.credits || 100}, ${'free'}, ${null}, ${user.createdAt})
      `;
      
      await sql.end();
      console.log(`✅ Persisted user ${user.email} to database`);
      
      // Only add to memory after successful database save
      this.users.set(id, user);
      
    } catch (dbError) {
      console.error(`🚨 CRITICAL: Failed to persist user ${user.email} to database:`, dbError);
      throw new Error(`Registration failed: Unable to save user data to database`);
    }
    
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) {
      return undefined;
    }
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    
    // Persist to database
    try {
      const sql = createDbConnection();

      await sql`
        UPDATE public.users 
        SET 
          email = ${updatedUser.email},
          password = ${updatedUser.password},
          credits = ${updatedUser.credits},
          subscription_plan = ${updatedUser.subscriptionPlan || 'free'},
          stripe_customer_id = ${updatedUser.subscriptionId || null}
        WHERE id = ${id}
      `;
      
      await sql.end();
      console.log(`✅ Updated user ${id} in database`);
      
    } catch (dbError) {
      console.error(`⚠️ Failed to update user ${id} in database:`, dbError);
    }
    
    return updatedUser;
  }

  async createProject(projectData: CreateProjectInput): Promise<Project> {
    const id = crypto.randomUUID();
    const createdAt = new Date();

    console.log(`📦 Creating project ${id} - uploading images to storage...`);
    const uploadStartTime = Date.now();

    // Upload all base64 images to object storage IN PARALLEL for speed
    const [originalImageUrl, upscaledImageUrl, mockupImageUrl, thumbnailUrl, mockupImages, resizedImages] = await Promise.all([
      projectData.originalImageUrl 
        ? uploadBase64ToStorage(projectData.originalImageUrl, id, 'original')
        : Promise.resolve(null),
      
      projectData.upscaledImageUrl
        ? uploadBase64ToStorage(projectData.upscaledImageUrl, id, 'upscaled')
        : Promise.resolve(null),
      
      projectData.mockupImageUrl
        ? uploadBase64ToStorage(projectData.mockupImageUrl, id, 'mockup')
        : Promise.resolve(null),
      
      projectData.thumbnailUrl
        ? uploadBase64ToStorage(projectData.thumbnailUrl, id, 'thumbnail')
        : Promise.resolve(null),

      // Upload mockup images if present
      projectData.mockupImages && Object.keys(projectData.mockupImages).length > 0
        ? uploadImagesToStorage(projectData.mockupImages, id, 'mockup')
        : Promise.resolve(null),

      // Upload resized images if present
      Array.isArray(projectData.resizedImages) && projectData.resizedImages.length > 0
        ? uploadImagesToStorage(projectData.resizedImages, id, 'resize')
        : Promise.resolve([])
    ]);

    const uploadDuration = Date.now() - uploadStartTime;
    const mockupCount = mockupImages && typeof mockupImages === 'object' ? Object.keys(mockupImages).length : 0;
    const resizedCount = Array.isArray(resizedImages) ? resizedImages.length : 0;
    const imageCount = [originalImageUrl, upscaledImageUrl, mockupImageUrl, thumbnailUrl].filter(Boolean).length + mockupCount + resizedCount;
    console.log(`⚡ Uploaded ${imageCount} images in ${uploadDuration}ms (parallel)`);

    const normalizedData: ProjectBase = {
      ...projectData,
      title: projectData.title ?? 'Untitled Project',
      originalImageUrl: originalImageUrl ?? null,
      upscaledImageUrl: upscaledImageUrl ?? null,
      mockupImageUrl: mockupImageUrl ?? null,
      mockupImages: mockupImages as Record<string, string> | null,
      resizedImages: resizedImages as Array<{size: string; url: string}>,
      etsyListing: projectData.etsyListing ?? null,
      mockupTemplate: projectData.mockupTemplate ?? null,
      upscaleOption: projectData.upscaleOption ?? '2x',
      status: projectData.status ?? 'pending',
      zipUrl: projectData.zipUrl ?? null,
      thumbnailUrl: thumbnailUrl ?? null,
      aiPrompt: projectData.aiPrompt ?? null,
      metadata: projectData.metadata ?? {},
    };

    const summary = deriveProjectSummary(normalizedData);
    const metadataWithSummary = applySummaryToMetadata(normalizedData.metadata, summary);

    const project: Project = {
      id,
      ...normalizedData,
      ...summary,
      metadata: metadataWithSummary,
      createdAt,
    };

    // Try to save to database with retry logic for connection issues
    let dbSaveSuccess = false;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Database: Attempting to save project ${id} to database (attempt ${attempt}/3)`);
        const sql = createDbConnection();

        await sql`
          INSERT INTO projects (
            id, user_id, title, original_image_url, upscaled_image_url,
            mockup_image_url, mockup_images, resized_images, etsy_listing,
            mockup_template, upscale_option, status, zip_url, thumbnail_url,
            ai_prompt, metadata, has_original_image, has_upscaled_image, has_mockup_image,
            has_mockup_images, mockup_count, has_resized_images, resized_count, has_etsy_listing,
            created_at
          ) VALUES (
            ${project.id}, ${project.userId}, ${project.title || ''}, ${project.originalImageUrl || null},
            ${project.upscaledImageUrl || null}, ${project.mockupImageUrl || null}, ${JSON.stringify(project.mockupImages || [])},
            ${JSON.stringify(project.resizedImages || [])}, ${project.etsyListing ? JSON.stringify(project.etsyListing) : null},
            ${project.mockupTemplate || null}, ${project.upscaleOption || '2x'}, ${project.status || 'pending'}, ${project.zipUrl || null},
            ${project.thumbnailUrl || null}, ${project.aiPrompt || null}, ${JSON.stringify(project.metadata || {})},
            ${project.hasOriginalImage}, ${project.hasUpscaledImage}, ${project.hasMockupImage},
            ${project.hasMockupImages}, ${project.mockupCount}, ${project.hasResizedImages},
            ${project.resizedCount}, ${project.hasEtsyListing}, ${project.createdAt}
          )
        `;

        await sql.end();
        console.log(`✅ Database: Project ${id} successfully saved to database`);
        dbSaveSuccess = true;
        break;
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Database save attempt ${attempt}/3 failed:`, error);
        
        // Wait before retry (exponential backoff)
        if (attempt < 3) {
          const waitTime = attempt * 1000; // 1s, 2s
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    if (!dbSaveSuccess) {
      console.error(`CRITICAL: Failed to persist project ${id} to database after 3 attempts:`, lastError);
      // Still cache the project in memory so user doesn't lose their work
      this.projects.set(id, project);
      console.warn(`⚠️ Project ${id} cached in memory only - database save failed`);
      throw new Error('Project creation failed: Unable to save project data to database. Your project is cached but may be lost on server restart.');
    }

    this.projects.set(id, project);
    this.projectListFetchedAt.set(project.userId, Date.now());
    console.log(`MemStorage: Added project ${id} to cache`);


    return project;
  }

  async getProject(id: string, forceRefresh: boolean = false): Promise<Project | undefined> {
    console.log('MemStorage: Looking for project ' + id + ' (forceRefresh: ' + String(forceRefresh) + ')');
    console.log('MemStorage: Have ' + this.projects.size + ' projects in memory');
    console.log('MemStorage: Memory project IDs:', Array.from(this.projects.keys()));

    if (!forceRefresh) {
      const cachedProject = this.projects.get(id);
      if (cachedProject) {
        // Check if cached project has full data (not lightweight list data)
        // Lightweight data has ALL image fields set to undefined
        // We need to check if ANY image field is NOT undefined (meaning it has actual data or null)
        const hasImageData = 
          cachedProject.originalImageUrl !== undefined || 
          cachedProject.upscaledImageUrl !== undefined ||
          cachedProject.mockupImages !== undefined ||
          cachedProject.resizedImages !== undefined;
        
        if (hasImageData) {
          console.log('MemStorage: Served project ' + id + ' from cache (full data)');
          return cachedProject;
        } else {
          console.log('MemStorage: Cached project ' + id + ' has lightweight data, fetching full data from DB');
          this.projects.delete(id); // Remove lightweight cache
        }
      }
    } else {
      this.projects.delete(id);
      console.log('MemStorage: Cleared project ' + id + ' from cache for fresh reload');
    }

    console.log('MemStorage: Project ' + id + ' not found in cache, querying database...');

    try {
      const sql = createDbConnection();
      const queryStartTime = Date.now();

      const rows = await sql`
        SELECT 
          id, user_id, title, original_image_url, upscaled_image_url,
          mockup_image_url, mockup_images, resized_images, etsy_listing,
          mockup_template, upscale_option, status, zip_url, thumbnail_url,
          ai_prompt, metadata, created_at,
          has_original_image, has_upscaled_image, has_mockup_image,
          has_mockup_images, mockup_count, has_resized_images, resized_count, has_etsy_listing
        FROM projects 
        WHERE id = ${id}
        LIMIT 1
      `;

      const queryDuration = Date.now() - queryStartTime;
      console.log(`MemStorage: Database query completed in ${queryDuration}ms`);

      await sql.end();

      if (rows.length > 0) {
        const project = transformDbProjectRow(rows[0]);
        this.projects.set(project.id, project);
        console.log('MemStorage: Cached project ' + id + ' after DB fetch');
        return project;
      }
    } catch (error: any) {
      const errorCode = error?.code;
      const errorMessage = error?.message || String(error);
      
      if (errorCode === '57014') {
        console.error(`❌ Database timeout loading project ${id}. This usually means the project has very large base64 images stored in the database.`);
        console.error('💡 Consider migrating large images to object storage or increasing statement_timeout.');
      } else {
        console.warn('MemStorage: Failed to load project ' + id + ' from database:', errorMessage);
      }
    }

    return undefined;
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    console.log(`dY", Loading projects list for user ${userId} (optimized query)`);

    const cachedProjects = this.getCachedProjectsForUser(userId);
    const lastFetched = this.projectListFetchedAt.get(userId);
    const cacheIsFresh = typeof lastFetched === "number" && Date.now() - lastFetched < 30000;

    if (cacheIsFresh) {
      console.log(`? Returning cached projects for ${userId} (age: ${Date.now() - (lastFetched || 0)}ms)`);
      return cachedProjects;
    }

    try {
      const projects = await this.loadProjectsListFromDatabase(userId);
      this.projectListFetchedAt.set(userId, Date.now());
      projects.forEach((project) => this.projects.set(project.id, project));
      return projects;
    } catch (error) {
      console.log(`�s��,? Database query failed for user ${userId}, returning cached data:`, (error as Error).message);
      this.projectListFetchedAt.set(userId, Date.now());
      if (cachedProjects.length > 0) {
        return cachedProjects;
      }
      return [];
    }
  }

  private async loadProjectsListFromDatabase(userId: string): Promise<Project[]> {
    // For list view, only fetch lightweight metadata - NOT the huge image blobs!
    const connectionStart = Date.now();
    const sql = createDbConnection();
    const connectionTime = Date.now() - connectionStart;
    
    if (connectionTime > 1000) {
      console.warn(`⚠️ Slow database connection: ${connectionTime}ms`);
    }

    try {
      const queryStart = Date.now();
      const rows = await sql`
        SELECT 
          id, user_id, title, status, thumbnail_url,
          created_at, upscale_option, mockup_template,
          ai_prompt, metadata,
          has_original_image, has_upscaled_image, has_mockup_image,
          has_mockup_images, mockup_count, has_resized_images, resized_count, has_etsy_listing
        FROM projects 
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 20
      `;
      const queryTime = Date.now() - queryStart;
      
      if (queryTime > 5000) {
        console.error(`🐌 VERY SLOW QUERY: ${queryTime}ms - Consider adding database index on user_id`);
      } else if (queryTime > 1000) {
        console.warn(`⚠️ Slow query: ${queryTime}ms`);
      }

      // Transform rows with minimal data (no heavy image columns)
      const convertedProjects = rows.map((row: any) => {
        const base: Partial<Project> = {
          id: row.id,
          userId: row.user_id,
          title: row.title || 'Untitled Project',
          status: row.status || 'pending',
          thumbnailUrl: row.thumbnail_url || undefined,
          // Set image URLs to undefined for list view - they'll be loaded on-demand
          originalImageUrl: undefined,
          upscaledImageUrl: undefined,
          mockupImageUrl: undefined,
          mockupImages: undefined,
          resizedImages: undefined,
          etsyListing: undefined,
          zipUrl: undefined,
          mockupTemplate: row.mockup_template || undefined,
          upscaleOption: row.upscale_option || '2x',
          aiPrompt: row.ai_prompt || undefined,
          metadata: parseJsonObject(row.metadata, {}),
          createdAt: new Date(row.created_at),
        };

        const summary = {
          hasOriginalImage: row.has_original_image ?? false,
          hasUpscaledImage: row.has_upscaled_image ?? false,
          hasMockupImage: row.has_mockup_image ?? false,
          hasMockupImages: row.has_mockup_images ?? false,
          mockupCount: row.mockup_count ?? 0,
          hasResizedImages: row.has_resized_images ?? false,
          resizedCount: row.resized_count ?? 0,
          hasEtsyListing: row.has_etsy_listing ?? false,
        };

        return { ...base, ...summary } as Project;
      });

      convertedProjects.forEach((project) => {
        this.projects.set(project.id, project);
      });

      console.log(`⚡ Retrieved ${convertedProjects.length} projects (lightweight) in ${queryTime}ms for user ${userId}`);
      return convertedProjects;
    } finally {
      await sql.end();
    }
  }

  // Full project loading (includes all data) - used for individual project details
  private async loadProjectsFromDatabase(userId: string): Promise<Project[]> {
    const sql = createDbConnection();

    try {
      const rows = await sql`
        SELECT 
          id, user_id, title, status, thumbnail_url, original_image_url,
          upscaled_image_url, mockup_image_url, mockup_images, resized_images,
          etsy_listing, zip_url, created_at, upscale_option, mockup_template,
          ai_prompt, metadata,
          has_original_image, has_upscaled_image, has_mockup_image,
          has_mockup_images, mockup_count, has_resized_images, resized_count, has_etsy_listing
        FROM projects 
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 20
      `;

      const convertedProjects = rows.map((row: any) => transformDbProjectRow(row));

      convertedProjects.forEach((project) => {
        this.projects.set(project.id, project);
      });

      console.log('MemStorage: Retrieved ' + convertedProjects.length + ' projects (full) from database for user ' + userId);
      return convertedProjects;
    } finally {
      await sql.end();
    }
  }

  async deleteProject(id: string): Promise<boolean> {
    const project = this.projects.get(id);
    const sql = createDbConnection();

    try {
      const result = await sql`
        DELETE FROM projects
        WHERE id = ${id}
        RETURNING user_id
      `;

      const deleted = result.length > 0;
      if (deleted) {
        const userId = String(result[0].user_id);
        this.projects.delete(id);
        this.projectListFetchedAt.delete(userId);
      } else if (project) {
        this.projects.delete(id);
        this.projectListFetchedAt.delete(project.userId);
      }

      return deleted || !!project;
    } finally {
      await sql.end();
    }
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const existing = this.projects.get(id);
    if (!existing) {
      return undefined;
    }

    console.log(`📝 Updating project ${id} - uploading new images to storage if needed...`);

    // Upload any new base64 images to storage before updating database
    // CRITICAL: Never allow originalImageUrl to become null (database constraint)
    const originalImageUrl = updates.originalImageUrl !== undefined
      ? (updates.originalImageUrl 
          ? await uploadBase64ToStorage(updates.originalImageUrl, id, 'original')
          : existing.originalImageUrl) // Preserve existing if update is null/empty
      : existing.originalImageUrl;
    
    const upscaledImageUrl = updates.upscaledImageUrl !== undefined
      ? await uploadBase64ToStorage(updates.upscaledImageUrl || '', id, 'upscaled')
      : existing.upscaledImageUrl;
    
    const mockupImageUrl = updates.mockupImageUrl !== undefined
      ? await uploadBase64ToStorage(updates.mockupImageUrl || '', id, 'mockup')
      : existing.mockupImageUrl;
    
    const thumbnailUrl = updates.thumbnailUrl !== undefined
      ? await uploadBase64ToStorage(updates.thumbnailUrl || '', id, 'thumbnail')
      : existing.thumbnailUrl;

    // Upload mockup images if updated
    const mockupImages = updates.mockupImages !== undefined
      ? (updates.mockupImages && Object.keys(updates.mockupImages).length > 0
          ? await uploadImagesToStorage(updates.mockupImages, id, 'mockup')
          : null)
      : existing.mockupImages;

    // Upload resized images if updated
    const resizedImages = updates.resizedImages !== undefined
      ? (Array.isArray(updates.resizedImages) && updates.resizedImages.length > 0
          ? await uploadImagesToStorage(updates.resizedImages, id, 'resize')
          : [])
      : existing.resizedImages;

    const merged: ProjectBase = {
      ...existing,
      ...updates,
      // Preserve existing originalImageUrl if not provided in updates (critical for NOT NULL constraint)
      originalImageUrl: originalImageUrl || existing.originalImageUrl,
      upscaledImageUrl: upscaledImageUrl ?? null,
      mockupImageUrl: mockupImageUrl ?? null,
      mockupImages: mockupImages as Record<string, string> | null,
      resizedImages: resizedImages as Array<{size: string; url: string}>,
      etsyListing: updates.etsyListing ?? existing.etsyListing ?? null,
      mockupTemplate: updates.mockupTemplate ?? existing.mockupTemplate ?? null,
      upscaleOption: updates.upscaleOption ?? existing.upscaleOption ?? '2x',
      status: updates.status ?? existing.status ?? 'pending',
      zipUrl: updates.zipUrl ?? existing.zipUrl ?? null,
      thumbnailUrl: thumbnailUrl ?? null,
      aiPrompt: updates.aiPrompt ?? existing.aiPrompt ?? null,
      metadata: updates.metadata ?? existing.metadata ?? {},
    };
    
    // Final safety check: originalImageUrl must never be null
    if (!merged.originalImageUrl) {
      console.error(`⚠️ CRITICAL: originalImageUrl is null for project ${id}, preserving existing value`);
      merged.originalImageUrl = existing.originalImageUrl;
    }

    const summary = deriveProjectSummary(merged);
    const metadataWithSummary = applySummaryToMetadata(merged.metadata, summary);

    const updatedProject: Project = {
      ...existing,
      ...merged,
      ...summary,
      metadata: metadataWithSummary,
      createdAt: existing.createdAt,
    };

    this.projects.set(id, updatedProject);

    try {
      const sql = createDbConnection();
      
      // Final validation before database update
      if (!updatedProject.originalImageUrl) {
        throw new Error(`Cannot update project ${id}: originalImageUrl is required but is null/empty`);
      }

      await sql`
        UPDATE projects 
        SET 
          title = ${updatedProject.title || ''},
          original_image_url = ${updatedProject.originalImageUrl},
          upscaled_image_url = ${updatedProject.upscaledImageUrl || null},
          mockup_image_url = ${updatedProject.mockupImageUrl || null},
          mockup_images = ${JSON.stringify(updatedProject.mockupImages || {})},
          resized_images = ${JSON.stringify(updatedProject.resizedImages || [])},
          etsy_listing = ${updatedProject.etsyListing ? JSON.stringify(updatedProject.etsyListing) : null},
          mockup_template = ${updatedProject.mockupTemplate || null},
          upscale_option = ${updatedProject.upscaleOption || '2x'},
          status = ${updatedProject.status || 'pending'},
          zip_url = ${updatedProject.zipUrl || null},
          thumbnail_url = ${updatedProject.thumbnailUrl || null},
          ai_prompt = ${updatedProject.aiPrompt || null},
          metadata = ${JSON.stringify(updatedProject.metadata || {})},
          has_original_image = ${updatedProject.hasOriginalImage},
          has_upscaled_image = ${updatedProject.hasUpscaledImage},
          has_mockup_image = ${updatedProject.hasMockupImage},
          has_mockup_images = ${updatedProject.hasMockupImages},
          mockup_count = ${updatedProject.mockupCount},
          has_resized_images = ${updatedProject.hasResizedImages},
          resized_count = ${updatedProject.resizedCount},
          has_etsy_listing = ${updatedProject.hasEtsyListing}
        WHERE id = ${id}
      `;

      await sql.end();
      console.log('MemStorage: Updated project ' + id + ' in database');
    } catch (error) {
      console.error('MemStorage: Failed to update project ' + id + ' in database:', error);
    }

    return updatedProject;
  }

  async isPaymentProcessed(paymentReference: string): Promise<boolean> {
    return this.processedPayments.has(paymentReference);
  }

  async markPaymentProcessed(paymentReference: string, userId: string, creditsAllocated: number): Promise<void> {
    this.processedPayments.add(paymentReference);
  }

  async logCreditTransaction(userId: string, type: string, amount: number, description: string): Promise<void> {
    console.log(`💰 Credit Transaction - User: ${userId}, Type: ${type}, Amount: ${amount}, Description: ${description}`);
    
    await this.createCreditTransaction({
      userId,
      transactionType: type as 'earn' | 'spend' | 'refund' | 'purchase',
      amount,
      description,
      balanceAfter: this.users.get(userId)?.credits || 0,
      projectId: null
    });
  }

  async updateUserCreditsWithTransaction(userId: string, creditChange: number, transactionType: string, description: string, projectId?: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) {
      console.error(`❌ User ${userId} not found for credit transaction`);
      return false;
    }

    if (creditChange < 0 && user.credits + creditChange < 0) {
      console.warn(`⚠️ Insufficient credits for user ${userId}. Current: ${user.credits}, Required: ${Math.abs(creditChange)}`);
      return false;
    }

    user.credits += creditChange;
    this.users.set(userId, user);

    console.log(`💰 Updated credits for user ${userId}: ${user.credits - creditChange} → ${user.credits} (${creditChange >= 0 ? '+' : ''}${creditChange})`);

    await this.logCreditTransaction(userId, transactionType, creditChange, description);

    try {
      const sql = createDbConnection();

      await sql`
        UPDATE public.users 
        SET credits = ${user.credits}
        WHERE id = ${userId}
      `;

      await sql.end();
      console.log(`✅ Successfully synced credits to database for user ${userId}`);

    } catch (dbError) {
      console.warn(`⚠️ Failed to sync credits to database for user ${userId}:`, dbError);
    }

    return true;
  }

  async processWebhookPaymentAtomic(paymentReference: string, userId: string, creditsToAdd: number, transactionType: string): Promise<{success: boolean, alreadyProcessed: boolean}> {
    console.log(`🔒 Processing webhook payment atomically: ${paymentReference} for user ${userId}, credits: ${creditsToAdd}`);
    
    const sql = createDbConnection();
    
    try {
      // Use proper postgres transaction method
      const result = await sql.begin(async (sql) => {
        // Check if already processed (with SELECT FOR UPDATE to prevent race conditions)
        const existingPayment = await sql`
          SELECT payment_reference FROM processed_payments 
          WHERE payment_reference = ${paymentReference} 
          FOR UPDATE
        `;
        
        if (existingPayment.length > 0) {
          console.log(`⚠️ Payment ${paymentReference} already processed, skipping`);
          return { success: true, alreadyProcessed: true };
        }
        
        // Get current user credits
        const users = await sql`
          SELECT credits FROM public.users 
          WHERE id = ${userId}
          FOR UPDATE
        `;
        
        if (users.length === 0) {
          console.error(`❌ User ${userId} not found for payment ${paymentReference}`);
          throw new Error(`User ${userId} not found`);
        }
        
        const currentCredits = users[0].credits;
        const newCredits = currentCredits + creditsToAdd;
        
        // Update user credits
        await sql`
          UPDATE public.users 
          SET credits = ${newCredits}
          WHERE id = ${userId}
        `;
        
        // Mark payment as processed - unique constraint will prevent duplicates
        await sql`
          INSERT INTO processed_payments (payment_reference, user_id, credits_allocated, processed_at)
          VALUES (${paymentReference}, ${userId}, ${creditsToAdd}, NOW())
        `;
        
        // Log credit transaction
        const transactionId = crypto.randomUUID();
        await sql`
          INSERT INTO credit_transactions (
            id, user_id, amount, transaction_type, description, balance_after, created_at
          ) VALUES (
            ${transactionId}, ${userId}, ${creditsToAdd}, ${transactionType}, 
            ${'Webhook payment: ' + paymentReference}, ${newCredits}, NOW()
          )
        `;
        
        console.log(`✅ Atomically processed payment ${paymentReference}: ${currentCredits} → ${newCredits} credits for user ${userId}`);
        return { success: true, alreadyProcessed: false, currentCredits, newCredits };
      });
      
      await sql.end();
      
      // CRITICAL FIX: Clear memory cache and force fresh load from database
      // This ensures next API call gets updated credits
      this.users.delete(userId);
      console.log(`🔄 Cleared memory cache for user ${userId} - next API call will load fresh data from DB`);
      
      return { success: result.success, alreadyProcessed: result.alreadyProcessed };
      
    } catch (error) {
      // Handle unique constraint violations (duplicate payments)
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        // Unique constraint violation - payment already processed concurrently
        console.log(`⚠️ Payment ${paymentReference} already processed by concurrent transaction`);
        try {
          await sql.end();
        } catch (endError) {
          console.error('Failed to end connection after unique violation:', endError);
        }
        return { success: true, alreadyProcessed: true };
      }
      
      console.error(`❌ Failed to process payment ${paymentReference} atomically:`, error);
      try {
        await sql.end();
      } catch (endError) {
        console.error('Failed to end connection after error:', endError);
      }
      return { success: false, alreadyProcessed: false };
    }
  }

  async updateUserCredits(userId: string, credits: number): Promise<void> {
    try {
      const sql = createDbConnection();
      
      // Always update database first
      const result = await sql`
        UPDATE public.users 
        SET credits = ${credits}
        WHERE id = ${userId}
        RETURNING *
      `;
      
      await sql.end();
      
      if (result.length === 0) {
        console.error(`❌ User ${userId} not found in database for credit update`);
        return;
      }
      
      // Update memory cache if user exists there
      const user = this.users.get(userId);
      if (user) {
        user.credits = credits;
        this.users.set(userId, user);
      } else {
        // Load user from database to memory if not present
        const dbUser = result[0];
        const memoryUser: User = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          password: dbUser.password ?? '',
          avatar: dbUser.avatar ?? null,
          credits: dbUser.credits ?? 0,
          subscriptionStatus: dbUser.subscription_status || 'free',
          subscriptionPlan: dbUser.subscription_plan,
          subscriptionId: dbUser.subscription_id,
          subscriptionStartDate: dbUser.subscription_start_date ? new Date(dbUser.subscription_start_date) : null,
          subscriptionEndDate: dbUser.subscription_end_date ? new Date(dbUser.subscription_end_date) : null,
          createdAt: dbUser.created_at ? new Date(dbUser.created_at) : new Date()
        };
        this.users.set(userId, memoryUser);
      }
      
      console.log(`✅ Updated credits for user ${userId}: ${credits}`);
    } catch (dbError) {
      console.error(`❌ Failed to update credits for user ${userId}:`, dbError);
      throw dbError;
    }
  }

  async updateUserSubscription(userId: string, subscriptionData: {
    subscriptionStatus: string;
    subscriptionPlan?: string;
    subscriptionId?: string;
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date;
  }): Promise<void> {
    try {
      const sql = createDbConnection();
      
      // Always update database first
      const result = await sql`
        UPDATE public.users 
        SET 
          subscription_status = ${subscriptionData.subscriptionStatus},
          subscription_plan = ${subscriptionData.subscriptionPlan || null},
          subscription_id = ${subscriptionData.subscriptionId || null},
          subscription_start_date = ${subscriptionData.subscriptionStartDate || null},
          subscription_end_date = ${subscriptionData.subscriptionEndDate || null}
        WHERE id = ${userId}
        RETURNING *
      `;
      
      await sql.end();
      
      if (result.length === 0) {
        console.error(`❌ User ${userId} not found in database for subscription update`);
        return;
      }
      
      // Update memory cache
      const user = this.users.get(userId);
      if (user) {
        const updatedUser = { 
          ...user, 
          subscriptionStatus: subscriptionData.subscriptionStatus,
          subscriptionPlan: subscriptionData.subscriptionPlan || null,
          subscriptionId: subscriptionData.subscriptionId || null,
          subscriptionStartDate: subscriptionData.subscriptionStartDate || null,
          subscriptionEndDate: subscriptionData.subscriptionEndDate || null,
        };
        this.users.set(userId, updatedUser);
      } else {
        // Load user from database to memory if not present
        const dbUser = result[0];
        const memoryUser: User = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          password: dbUser.password ?? '',
          avatar: dbUser.avatar ?? null,
          credits: dbUser.credits ?? 0,
          subscriptionStatus: dbUser.subscription_status || 'free',
          subscriptionPlan: dbUser.subscription_plan,
          subscriptionId: dbUser.subscription_id,
          subscriptionStartDate: dbUser.subscription_start_date ? new Date(dbUser.subscription_start_date) : null,
          subscriptionEndDate: dbUser.subscription_end_date ? new Date(dbUser.subscription_end_date) : null,
          createdAt: dbUser.created_at ? new Date(dbUser.created_at) : new Date()
        };
        this.users.set(userId, memoryUser);
      }
      
      console.log(`✅ Updated subscription for user ${userId}: ${subscriptionData.subscriptionStatus}`);
    } catch (dbError) {
      console.error(`❌ Failed to update subscription for user ${userId}:`, dbError);
      throw dbError;
    }
  }

  async createCreditTransaction(transaction: Omit<CreditTransaction, 'id' | 'createdAt'>): Promise<CreditTransaction> {
    const id = crypto.randomUUID();
    const createdAt = new Date();
    
    const creditTransaction: CreditTransaction = {
      id,
      ...transaction,
      createdAt
    };
    
    // Store in memory
    this.creditTransactions.set(id, creditTransaction);
    
    // Persist to database
    try {
      const sql = createDbConnection();

      await sql`
        INSERT INTO credit_transactions (
          id, user_id, amount, transaction_type, description, balance_after, project_id, created_at
        ) VALUES (
          ${id}, ${transaction.userId}, ${transaction.amount}, ${transaction.transactionType}, 
          ${transaction.description}, ${transaction.balanceAfter}, ${transaction.projectId || null}, ${createdAt}
        )
      `;

      await sql.end();
      console.log(`✅ Successfully persisted credit transaction ${id} to database`);

    } catch (dbError) {
      console.warn(`⚠️ Failed to persist credit transaction ${id} to database:`, dbError);
    }
    
    return creditTransaction;
  }

  async getCreditTransactions(userId: string, forceDbLoad: boolean = false): Promise<CreditTransaction[]> {
    // Check memory cache first
    const memoryTransactions = Array.from(this.creditTransactions.values())
      .filter(transaction => transaction.userId === userId);
    
    // If we have cached transactions and not forcing DB load, return them
    if (memoryTransactions.length > 0 && !forceDbLoad) {
      return memoryTransactions.sort((a, b) => (b.createdAt || new Date()).getTime() - (a.createdAt || new Date()).getTime());
    }
    
    // Only load from database when specifically requested (like settings page)
    if (forceDbLoad) {
      try {
        const sql = createDbConnection();

        const dbTransactions = await sql`
          SELECT id, user_id, amount, transaction_type, description, balance_after, project_id, created_at
          FROM credit_transactions 
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
          LIMIT 50
        `;

        await sql.end();

        const convertedTransactions = dbTransactions.map((tx: any) => ({
          id: tx.id,
          userId: tx.user_id,
          amount: tx.amount,
          transactionType: tx.transaction_type as 'earn' | 'spend' | 'refund' | 'purchase',
          description: tx.description,
          balanceAfter: tx.balance_after,
          projectId: tx.project_id,
          createdAt: new Date(tx.created_at)
        }));

        // Cache in memory for future requests
        convertedTransactions.forEach(tx => {
          this.creditTransactions.set(tx.id, tx);
        });

        console.log(`✅ Retrieved ${convertedTransactions.length} credit transactions from database for user ${userId}`);
        return convertedTransactions;

      } catch (dbError) {
        console.warn(`⚠️ Failed to load credit transactions from database for user ${userId}:`, dbError);
      }
    }
    
    // Return memory cache (empty if no transactions exist)
    return memoryTransactions.sort((a, b) => (b.createdAt || new Date()).getTime() - (a.createdAt || new Date()).getTime());
  }

  async getContactMessages(): Promise<any[]> {
    return Array.from(this.contactMessages.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createContactMessage(message: any): Promise<any> {
    const id = crypto.randomUUID();
    const contactMessage = {
      id,
      ...message,
      createdAt: new Date().toISOString()
    };
    
    this.contactMessages.set(id, contactMessage);
    return contactMessage;
  }

  async createNewsletterSubscriber(subscriberData: InsertNewsletterSubscriber): Promise<NewsletterSubscriber> {
    const id = crypto.randomUUID();
    const createdAt = new Date();
    
    const subscriber: NewsletterSubscriber = {
      id,
      email: subscriberData.email,
      status: subscriberData.status ?? 'active',
      source: subscriberData.source ?? 'blog',
      createdAt,
      unsubscribedAt: null
    };
    
    this.newsletterSubscribers.set(id, subscriber);

    // Persist to database
    try {
      const sql = createDbConnection();

      await sql`
        INSERT INTO newsletter_subscribers (id, email, status, source, created_at)
        VALUES (${subscriber.id}, ${subscriber.email}, ${subscriber.status}, ${subscriber.source}, ${subscriber.createdAt})
      `;
      
      await sql.end();
      console.log(`✅ Newsletter subscriber ${subscriber.email} added to database`);
      
    } catch (dbError) {
      console.error(`⚠️ Failed to persist newsletter subscriber ${subscriber.email}:`, dbError);
    }
    
    return subscriber;
  }

  async getNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    const toTimestamp = (value: Date | null): number => (value instanceof Date ? value.getTime() : 0);

    return Array.from(this.newsletterSubscribers.values())
      .filter(sub => sub.status === 'active')
      .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt));
  }

  async unsubscribeNewsletter(email: string): Promise<boolean> {
    const subscriber = Array.from(this.newsletterSubscribers.values())
      .find(sub => sub.email === email);
    
    if (!subscriber) {
      return false;
    }

    const updatedSubscriber = {
      ...subscriber,
      status: 'unsubscribed' as const,
      unsubscribedAt: new Date()
    };
    
    this.newsletterSubscribers.set(subscriber.id, updatedSubscriber);

    // Persist to database
    try {
      const sql = createDbConnection();

      await sql`
        UPDATE newsletter_subscribers 
        SET status = 'unsubscribed', unsubscribed_at = ${updatedSubscriber.unsubscribedAt}
        WHERE email = ${email}
      `;
      
      await sql.end();
      console.log(`✅ Newsletter subscriber ${email} unsubscribed in database`);
      
    } catch (dbError) {
      console.error(`⚠️ Failed to unsubscribe ${email} in database:`, dbError);
    }

    return true;
  }

  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    this.passwordResetTokens.set(token, { userId, expiresAt });

    // Persist to database
    try {
      const sql = createDbConnection();

      await sql`
        INSERT INTO password_reset_tokens (token, user_id, expires_at, created_at)
        VALUES (${token}, ${userId}, ${expiresAt}, ${new Date()})
        ON CONFLICT (token) DO UPDATE SET
          user_id = ${userId},
          expires_at = ${expiresAt}
      `;
      
      await sql.end();
      console.log(`✅ Password reset token created for user ${userId}`);
      
    } catch (dbError) {
      console.error(`⚠️ Failed to create password reset token in database:`, dbError);
    }
  }

  async getPasswordResetToken(token: string): Promise<{ userId: string; expiresAt: Date } | undefined> {
    // Check memory first
    const memToken = this.passwordResetTokens.get(token);
    if (memToken) {
      return memToken;
    }

    // Try database
    try {
      const sql = createDbConnection();

      const tokens = await sql`
        SELECT user_id, expires_at 
        FROM password_reset_tokens 
        WHERE token = ${token}
        LIMIT 1
      `;

      await sql.end();

      if (tokens.length > 0) {
        const tokenData = {
          userId: tokens[0].user_id,
          expiresAt: new Date(tokens[0].expires_at)
        };
        this.passwordResetTokens.set(token, tokenData);
        return tokenData;
      }
    } catch (error) {
      console.warn(`⚠️ Database query failed for reset token:`, error);
    }

    return undefined;
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    this.passwordResetTokens.delete(token);

    // Delete from database
    try {
      const sql = createDbConnection();

      await sql`
        DELETE FROM password_reset_tokens 
        WHERE token = ${token}
      `;
      
      await sql.end();
      console.log(`✅ Password reset token deleted`);
      
    } catch (dbError) {
      console.error(`⚠️ Failed to delete password reset token from database:`, dbError);
    }
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.password = hashedPassword;
      this.users.set(userId, user);
    }

    // Update in database
    try {
      const sql = createDbConnection();

      await sql`
        UPDATE public.users 
        SET password = ${hashedPassword}
        WHERE id = ${userId}
      `;
      
      await sql.end();
      console.log(`✅ Password updated for user ${userId}`);
      
    } catch (dbError) {
      console.error(`⚠️ Failed to update password in database:`, dbError);
      throw new Error('Failed to update password');
    }
  }

  async updateUserLastLogin(userId: string): Promise<void> {
    const user = this.users.get(userId);
    const now = new Date();
    
    if (user) {
      user.lastLogin = now;
      this.users.set(userId, user);
    }

    // Update in database
    try {
      const sql = createDbConnection();

      await sql`
        UPDATE public.users 
        SET last_login = ${now.toISOString()}
        WHERE id = ${userId}
      `;
      
      await sql.end();
      
    } catch (dbError) {
      // Don't throw error - this is non-critical tracking
      console.error(`⚠️ Failed to update last_login in database:`, dbError);
    }
  }
}

export const storage = new MemStorage();
