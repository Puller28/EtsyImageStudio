// Backup for recovery - minimal working version
import { randomUUID } from "crypto";
import type { User, Project, InsertUser, InsertProject, CreditTransaction, InsertCreditTransaction, ContactMessage, InsertContactMessage } from "../shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(userId: string, updates: Partial<User>): Promise<User>;
  updateUserCredits(userId: string, credits: number): Promise<void>;
  updateUserSubscription(userId: string, subscriptionData: {
    subscriptionStatus: string;
    subscriptionPlan?: string;
    subscriptionId?: string;
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date;
  }): Promise<void>;

  // Projects
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByUserId(userId: string): Promise<Project[]>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;

  // Payment processing
  isPaymentProcessed(paymentReference: string): Promise<boolean>;
  markPaymentProcessed(paymentReference: string, userId: string, creditsAllocated: number): Promise<void>;

  // Credit transactions
  createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction>;
  getCreditTransactionsByUserId(userId: string): Promise<CreditTransaction[]>;

  // Contact messages
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  getAllContactMessages(): Promise<ContactMessage[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private projects: Map<string, Project>;
  private processedPayments: Set<string>;
  private creditTransactions: Map<string, CreditTransaction>;
  private contactMessages: Map<string, ContactMessage>;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.processedPayments = new Set();
    this.creditTransactions = new Map();
    this.contactMessages = new Map();
    
    // Load real data from database immediately (non-blocking for projects)
    this.loadRealData();
  }

  private async loadRealData() {
    // Load users synchronously (this works reliably)
    await this.loadUsers();
    
    // Load projects asynchronously with persistent retry
    this.ensureProjectsLoaded();
  }

  private async loadUsers() {
    try {
      console.log('🔄 Loading real user data into memory storage...');
      
      const directDb = await import("./direct-db");
      const sql = directDb.sql;
      
      const users = await sql`SELECT * FROM public.users LIMIT 50`;
      console.log(`📥 Loaded ${users.length} users into memory`);
      
      users.forEach((user: any) => {
        this.users.set(user.id, {
          id: user.id,
          email: user.email,
          name: user.name,
          password: user.password,
          avatar: user.avatar,
          credits: user.credits || 0,
          subscriptionStatus: user.subscription_status || 'free',
          subscriptionPlan: user.subscription_plan,
          subscriptionId: user.subscription_id,
          subscriptionStartDate: user.subscription_start_date,
          subscriptionEndDate: user.subscription_end_date,
          createdAt: new Date(user.created_at)
        });
      });
    } catch (error) {
      console.warn('⚠️ Failed to load users:', error);
    }
  }

  private async ensureProjectsLoaded() {
    const maxRetries = 10;
    let retryCount = 0;
    
    while (retryCount < maxRetries && this.projects.size === 0) {
      try {
        await this.loadProjectsFromDatabase();
        if (this.projects.size > 0) {
          console.log(`✅ Successfully loaded projects on attempt ${retryCount + 1}`);
          return;
        }
      } catch (error) {
        console.warn(`⚠️ Project load attempt ${retryCount + 1} failed:`, (error as Error).message);
      }
      
      retryCount++;
      // Exponential backoff: 2s, 4s, 8s, 16s, etc., capped at 30s
      const delay = Math.min(2000 * Math.pow(2, retryCount - 1), 30000);
      console.log(`🔄 Retrying project load in ${delay/1000}s (attempt ${retryCount}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    console.error(`❌ Failed to load projects after ${maxRetries} attempts`);
  }

  private async loadProjectsFromDatabase() {
    // Emergency fallback to direct API calls when memory loading fails
    console.log('⚡ Using direct database queries instead of memory loading...');
    return; // Skip memory loading, use direct queries in API calls

    try {
      console.log('🔗 Creating fresh DB connection for projects...');
      
      // Simple, fast query without complex operations
      const projects = await sql`SELECT * FROM projects ORDER BY created_at DESC LIMIT 200`;
      console.log(`📋 Loaded ${projects.length} projects into memory`);
      
      projects.forEach((project: any) => {
        this.projects.set(project.id, {
          id: project.id,
          userId: project.user_id,
          title: project.title,
          originalImageUrl: project.original_image_url,
          upscaledImageUrl: project.upscaled_image_url,
          mockupImageUrl: project.mockup_image_url,
          mockupImages: typeof project.mockup_images === 'string' ? JSON.parse(project.mockup_images) : (project.mockup_images || {}),
          resizedImages: typeof project.resized_images === 'string' ? JSON.parse(project.resized_images) : (project.resized_images || []),
          etsyListing: typeof project.etsy_listing === 'string' ? JSON.parse(project.etsy_listing) : project.etsy_listing,
          mockupTemplate: project.mockup_template,
          upscaleOption: project.upscale_option || '2x',
          status: project.status || 'uploading',
          zipUrl: project.zip_url,
          thumbnailUrl: project.thumbnail_url,
          aiPrompt: project.ai_prompt,
          metadata: typeof project.metadata === 'string' ? JSON.parse(project.metadata) : (project.metadata || {}),
          createdAt: new Date(project.created_at)
        });
      });

    } catch (error) {
      throw error;
    } finally {
      // Always close the connection
      await sql.end();
    }
  }



  async getUser(id: string): Promise<User | undefined> {
    let user = this.users.get(id);
    
    if (user) {
      try {
        const directDb = await import("./direct-db");
        const sql = directDb.sql;
        const [dbUser] = await sql`SELECT u.id, u.email, u.name, u.avatar, u.credits, u.subscription_status, u.subscription_plan, u.subscription_id, u.subscription_start_date, u.subscription_end_date, u.created_at FROM public.users u WHERE u.id = ${id}`;
        
        if (dbUser) {
          const refreshedUser = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            password: user.password, // Keep existing password from memory
            avatar: dbUser.avatar,
            credits: dbUser.credits || 0,
            subscriptionStatus: dbUser.subscription_status || 'free',
            subscriptionPlan: dbUser.subscription_plan,
            subscriptionId: dbUser.subscription_id,
            subscriptionStartDate: dbUser.subscription_start_date,
            subscriptionEndDate: dbUser.subscription_end_date,
            createdAt: new Date(dbUser.created_at)
          };
          this.users.set(id, refreshedUser);
          console.log(`🔄 Refreshed user ${id} from DB - Credits: ${refreshedUser.credits}`);
          return refreshedUser;
        }
      } catch (error) {
        console.warn('⚠️ Failed to refresh user from DB, using memory data:', error);
      }
    }
    
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      avatar: insertUser.avatar || null,
      id,
      credits: 100,
      subscriptionStatus: "free",
      subscriptionPlan: null,
      subscriptionId: null,
      subscriptionStartDate: null,
      subscriptionEndDate: null,
      createdAt: new Date(),
    };
    
    // FORCED PUBLIC SCHEMA - Multiple connection attempts
    console.log(`💾 Forcing connection to public.users table for ${user.email}...`);
    
    let attempts = [
      // Attempt 1: Direct connection to public schema
      async () => {
        const postgres = (await import('postgres')).default;
        const sql = postgres(process.env.DATABASE_URL!, {
          ssl: 'require',
          prepare: false,
          transform: { undefined: null }
        });
        

        
        await sql`
          INSERT INTO users (
            id, email, name, password, avatar, credits, 
            subscription_status, subscription_plan, subscription_id,
            subscription_start_date, subscription_end_date, created_at
          ) VALUES (
            ${user.id}, ${user.email}, ${user.name}, ${user.password}, ${user.avatar}, ${user.credits},
            ${user.subscriptionStatus}, ${user.subscriptionPlan}, ${user.subscriptionId},
            ${user.subscriptionStartDate}, ${user.subscriptionEndDate}, ${user.createdAt}
          )
        `;
        
        await sql.end();
        return 'onconnect search_path';
      },
      
      // Attempt 2: Explicit public.users in query
      async () => {
        const postgres = (await import('postgres')).default;
        const sql = postgres(process.env.DATABASE_URL!, {
          ssl: 'require',
          prepare: false,
          transform: { undefined: null }
        });
        
        await sql`
          INSERT INTO public.users (
            id, email, name, password, avatar, credits, 
            subscription_status, subscription_plan, subscription_id,
            subscription_start_date, subscription_end_date, created_at
          ) VALUES (
            ${user.id}, ${user.email}, ${user.name}, ${user.password}, ${user.avatar}, ${user.credits},
            ${user.subscriptionStatus}, ${user.subscriptionPlan}, ${user.subscriptionId},
            ${user.subscriptionStartDate}, ${user.subscriptionEndDate}, ${user.createdAt}
          )
        `;
        
        await sql.end();
        return 'explicit public.users';
      }
    ];
    
    let lastError: Error | null = null;
    
    for (let i = 0; i < attempts.length; i++) {
      try {
        const method = await attempts[i]();
        console.log(`✅ SUCCESS: User ${user.email} persisted using ${method}`);
        
        // Save to memory after successful database persistence
        this.users.set(id, user);
        console.log(`🧠 User ${user.email} saved to memory after DB success`);
        return user;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`⚠️ Attempt ${i + 1} failed: ${lastError.message}`);
      }
    }
    
    throw new Error(`All connection attempts failed: ${lastError?.message || 'Unknown error'}`);
    
    return user;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const updatedUser = { ...user, ...updates };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUserCredits(userId: string, credits: number): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.credits = credits;
      this.users.set(userId, user);
    }
  }

  async updateUserSubscription(userId: string, subscriptionData: {
    subscriptionStatus: string;
    subscriptionPlan?: string;
    subscriptionId?: string;
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date;
  }): Promise<void> {
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
    }
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const project: Project = {
      ...insertProject,
      mockupTemplate: insertProject.mockupTemplate || null,
      mockupImages: insertProject.mockupImages || {},
      id,
      status: insertProject.status || "uploading",
      resizedImages: insertProject.resizedImages || [],
      upscaledImageUrl: insertProject.upscaledImageUrl || null,
      mockupImageUrl: insertProject.mockupImageUrl || null,
      etsyListing: insertProject.etsyListing || null,
      zipUrl: insertProject.zipUrl || null,
      thumbnailUrl: insertProject.thumbnailUrl || null,
      aiPrompt: insertProject.aiPrompt || null,
      metadata: insertProject.metadata || {},
      createdAt: new Date(),
      upscaleOption: insertProject.upscaleOption || "2x",
    };
    
    // Save to memory for fast access
    this.projects.set(id, project);
    
    // PERSIST TO DATABASE WITH USER CHECK
    try {
      const directDb = await import("./direct-db");
      const sql = directDb.sql;
      
      // First ensure the user exists in the database
      const [existingUser] = await sql`SELECT id FROM public.users WHERE id = ${project.userId}`;
      if (!existingUser) {
        console.warn(`⚠️ User ${project.userId} not found in database, skipping project persistence`);
        return project; // Return project but don't persist to DB
      }
      
      console.log(`💾 Persisting project ${id} to database...`);
      
      await sql`
        INSERT INTO projects (
          id, user_id, title, original_image_url, upscaled_image_url, 
          mockup_image_url, mockup_images, resized_images, etsy_listing,
          mockup_template, upscale_option, status, zip_url, thumbnail_url,
          ai_prompt, metadata, created_at
        ) VALUES (
          ${project.id}, ${project.userId}, ${project.title}, ${project.originalImageUrl},
          ${project.upscaledImageUrl}, ${project.mockupImageUrl}, ${JSON.stringify(project.mockupImages)},
          ${JSON.stringify(project.resizedImages)}, ${JSON.stringify(project.etsyListing)},
          ${project.mockupTemplate}, ${project.upscaleOption}, ${project.status}, ${project.zipUrl},
          ${project.thumbnailUrl}, ${project.aiPrompt}, ${JSON.stringify(project.metadata)}, ${project.createdAt}
        )
      `;
      
      console.log(`✅ Successfully persisted project ${id} to database`);
      
    } catch (dbError) {
      console.error(`⚠️ Failed to persist project ${id} to database:`, dbError);
      // Continue anyway - project is still in memory
    }
    
    return project;
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    // First, try memory
    const memoryProjects = Array.from(this.projects.values()).filter(project => project.userId === userId);
    
    // If memory has projects or projects are still loading, return memory results
    if (memoryProjects.length > 0 || this.projects.size > 0) {
      return memoryProjects;
    }
    
    // If memory is empty, try direct database query as fallback
    try {
      console.log(`🔍 Memory empty, querying database for user ${userId} projects...`);
      
      // Use the same reliable connection pattern
      const postgres = (await import('postgres')).default;
      const sql = postgres(process.env.DATABASE_URL!, {
        ssl: 'require',
        max: 1,
        idle_timeout: 1, // Extremely fast cleanup
        connect_timeout: 3, // Ultra-short connection timeout
        max_lifetime: 5, // Very short lifetime
        prepare: false,
        transform: { undefined: null },
        onnotice: () => {},
        fetch_types: false,
        // Production emergency settings
        statement_timeout: 10000 // 10 second statement timeout
      });

      try {
        const projects = await sql`
          SELECT * FROM projects 
          WHERE user_id = ${userId} 
          ORDER BY created_at DESC 
          LIMIT 50
        `;
        
        console.log(`📋 Found ${projects.length} projects in database for user ${userId}`);
        
        // Convert and store in memory for future use
        const convertedProjects = projects.map((project: any) => ({
          id: project.id,
          userId: project.user_id,
          title: project.title,
          originalImageUrl: project.original_image_url,
          upscaledImageUrl: project.upscaled_image_url,
          mockupImageUrl: project.mockup_image_url,
          mockupImages: typeof project.mockup_images === 'string' ? JSON.parse(project.mockup_images) : (project.mockup_images || {}),
          resizedImages: typeof project.resized_images === 'string' ? JSON.parse(project.resized_images) : (project.resized_images || []),
          etsyListing: typeof project.etsy_listing === 'string' ? JSON.parse(project.etsy_listing) : project.etsy_listing,
          mockupTemplate: project.mockup_template,
          upscaleOption: project.upscale_option || '2x',
          status: project.status || 'uploading',
          zipUrl: project.zip_url,
          thumbnailUrl: project.thumbnail_url,
          aiPrompt: project.ai_prompt,
          metadata: typeof project.metadata === 'string' ? JSON.parse(project.metadata) : (project.metadata || {}),
          createdAt: new Date(project.created_at)
        }));
        
        // Store in memory for future use
        convertedProjects.forEach(project => {
          this.projects.set(project.id, project);
        });
        
        return convertedProjects;
        
      } finally {
        await sql.end();
      }
      
    } catch (error) {
      console.warn(`⚠️ Failed to query database for user ${userId} projects:`, error);
      return memoryProjects; // Return empty array if both memory and DB fail
    }
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) {
      return undefined;
    }
    
    const updatedProject = { ...project, ...updates };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async isPaymentProcessed(paymentReference: string): Promise<boolean> {
    return this.processedPayments.has(paymentReference);
  }

  async markPaymentProcessed(paymentReference: string, userId: string, creditsAllocated: number): Promise<void> {
    this.processedPayments.add(paymentReference);
  }

  async logCreditTransaction(userId: string, type: string, amount: number, description: string): Promise<void> {
    // Log to console for debugging
    console.log(`💰 Credit Transaction - User: ${userId}, Type: ${type}, Amount: ${amount}, Description: ${description}`);
    
    // Also create a credit transaction record for audit trail
    await this.createCreditTransaction({
      userId,
      transactionType: type as 'earn' | 'spend' | 'refund' | 'purchase',
      amount,
      description,
      balanceAfter: this.users.get(userId)?.credits || 0,
    });
  }

  async updateUserCreditsWithTransaction(userId: string, creditChange: number, transactionType: string, description: string, projectId?: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) {
      console.error(`❌ User ${userId} not found for credit transaction`);
      return false;
    }

    // Check if user has enough credits for deductions
    if (creditChange < 0 && user.credits + creditChange < 0) {
      console.warn(`⚠️ Insufficient credits for user ${userId}. Current: ${user.credits}, Required: ${Math.abs(creditChange)}`);
      return false;
    }

    // Update credits in memory
    user.credits += creditChange;
    this.users.set(userId, user);

    // CRITICAL: Update database immediately to prevent refresh overwrites
    try {
      const directDb = await import("./direct-db");
      const sql = directDb.sql;
      
      await sql`
        UPDATE public.users 
        SET credits = ${user.credits} 
        WHERE id = ${userId}
      `;
      
      console.log(`💾 Updated user ${userId} credits in database: ${user.credits}`);
      
    } catch (dbError) {
      console.error(`⚠️ Failed to update credits in database for user ${userId}:`, dbError);
      // Revert memory change if DB update fails
      user.credits -= creditChange;
      this.users.set(userId, user);
      return false;
    }

    // Log the transaction with proper parameters
    await this.logCreditTransaction(userId, transactionType, creditChange, description);

    // Also create detailed audit trail with projectId if provided
    if (projectId) {
      await this.createCreditTransaction({
        userId,
        transactionType: transactionType as 'earn' | 'spend' | 'refund' | 'purchase',
        amount: creditChange,
        description,
        balanceAfter: user.credits,
        projectId
      });
    }

    console.log(`✅ Credit update successful - User: ${userId}, New Balance: ${user.credits}`);
    return true;
  }

  async createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction> {
    const id = randomUUID();
    const fullTransaction: CreditTransaction = {
      ...transaction,
      id,
      createdAt: new Date(),
      projectId: transaction.projectId || null,
    };
    
    this.creditTransactions.set(id, fullTransaction);
    return fullTransaction;
  }

  async getCreditTransactionsByUserId(userId: string): Promise<CreditTransaction[]> {
    return Array.from(this.creditTransactions.values())
      .filter(transaction => transaction.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async createContactMessage(insertMessage: InsertContactMessage): Promise<ContactMessage> {
    const id = randomUUID();
    const message: ContactMessage = {
      ...insertMessage,
      id,
      createdAt: new Date(),
      status: "unread",
    };
    
    this.contactMessages.set(id, message);
    return message;
  }

  async getAllContactMessages(): Promise<ContactMessage[]> {
    return Array.from(this.contactMessages.values())
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }
}

export const storage = new MemStorage();