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
    
    // Load real data from database immediately (blocking)
    this.loadRealData();
  }

  private async loadRealData() {
    try {
      console.log('🔄 Loading real user data into memory storage...');
      
      // Try direct SQL execution with multiple approaches
      let sql: any;
      try {
        const directDb = await import("./direct-db");
        sql = directDb.sql;
      } catch {
        console.log('🔄 Direct db failed, trying main db...');
        const mainDb = await import("./db");
        sql = (mainDb.db as any)._.session.client;
      }
      
      // Load users first (this worked before)
      try {
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
      } catch (userError) {
        console.warn('⚠️ Failed to load users:', userError);
      }
      
    } catch (error) {
      console.error('⚠️ Failed to load data from database:', error);
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
    
    // Save to memory for fast access
    this.users.set(id, user);
    
    // ALSO PERSIST TO DATABASE using Drizzle ORM with explicit schema targeting
    try {
      const { db } = await import("./db");
      const { users } = await import("@shared/schema");
      const { sql } = await import("drizzle-orm");
      
      console.log(`💾 Persisting user ${user.email} to database with Drizzle...`);
      
      // Debug: Check which tables exist before insert
      const tableCheck = await db.execute(sql`
        SELECT schemaname, tablename FROM pg_tables WHERE tablename = 'users' ORDER BY schemaname
      `);
      console.log(`🔍 Available user tables:`, tableCheck.map(t => `${t.schemaname}.${t.tablename}`));
      
      // Force connection to use explicit schema
      await db.execute(sql`SET search_path TO public, extensions, drizzle`);
      console.log(`🔧 Forced search path to public schema`);
      
      // Use raw SQL with explicit schema targeting as last resort
      await db.execute(sql`
        INSERT INTO public.users (
          id, email, name, password, avatar, credits, 
          subscription_status, subscription_plan, subscription_id,
          subscription_start_date, subscription_end_date, created_at
        ) VALUES (
          ${user.id}, ${user.email}, ${user.name}, ${user.password}, ${user.avatar}, ${user.credits},
          ${user.subscriptionStatus}, ${user.subscriptionPlan}, ${user.subscriptionId},
          ${user.subscriptionStartDate}, ${user.subscriptionEndDate}, ${user.createdAt}
        )
      `);
      
      console.log(`✅ Successfully persisted user ${user.email} to database with Drizzle`);
      
    } catch (dbError) {
      console.error(`⚠️ Failed to persist user ${user.email} to database:`, dbError);
      // Continue anyway - user is still in memory and can use the app
    }
    
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
      resizedImages: insertProject.resizedImages || [] as string[],
      upscaledImageUrl: insertProject.upscaledImageUrl || null,
      mockupImageUrl: insertProject.mockupImageUrl || null,
      etsyListing: insertProject.etsyListing || null as { title: string; tags: string[]; description: string; } | null,
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
    return Array.from(this.projects.values()).filter(project => project.userId === userId);
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
      type: type as 'earn' | 'spend' | 'refund' | 'purchase',
      amount,
      description,
      balanceAfter: this.users.get(userId)?.credits || 0,
    });
  }

  async updateUserCreditsWithTransaction(userId: string, creditChange: number, transactionType: string, description: string): Promise<boolean> {
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

    // Update credits
    user.credits += creditChange;
    this.users.set(userId, user);

    // Log the transaction
    await this.logCreditTransaction(userId, transactionType, creditChange, description);

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