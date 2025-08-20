import { type User, type InsertUser, type Project, type InsertProject, type CreditTransaction, type InsertCreditTransaction, type ContactMessage, type InsertContactMessage } from "@shared/schema";
import { users, projects, processedPayments, creditTransactions, contactMessages } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
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

  // Project methods
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByUserId(userId: string): Promise<Project[]>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;

  // Payment tracking methods
  isPaymentProcessed(paymentReference: string): Promise<boolean>;
  markPaymentProcessed(paymentReference: string, userId: string, creditsAllocated: number): Promise<void>;

  // Credit transaction methods
  createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction>;
  getCreditTransactionsByUserId(userId: string): Promise<CreditTransaction[]>;
  updateUserCreditsWithTransaction(userId: string, amount: number, transactionType: string, description: string, projectId?: string): Promise<{ newBalance: number; transaction: CreditTransaction }>;
  logCreditTransaction(transaction: { userId: string; type: string; amount: number; description: string; balanceAfter: number }): Promise<CreditTransaction>;

  // Contact message methods
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  getContactMessages(): Promise<ContactMessage[]>;
  updateContactMessageStatus(id: string, status: string): Promise<void>;
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
    
    // Add a demo user (uses secure environment-based password)
    const demoUser: User = {
      id: "demo-user-1",
      email: "sarah@example.com",
      name: "Sarah M.",
      password: process.env.DEMO_USER_PASSWORD_HASH || "", // Secure hash from environment
      avatar: "https://pixabay.com/get/ge5dfc7fb2d8c4be2d5a50f55c24114e5603b48aa392e8aac639cb21db396cb687be010f4599d05cb3f833a8e1e63a09b21980dd1e45f7123b97f17284bac3411_1280.jpg",
      credits: 100,
      subscriptionStatus: "active",
      subscriptionPlan: "pro",
      subscriptionId: null,
      subscriptionStartDate: null,
      subscriptionEndDate: null,
      createdAt: new Date(),
    };
    this.users.set(demoUser.id, demoUser);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
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
    this.users.set(id, user);
    return user;
  }

  async updateUserCredits(userId: string, credits: number): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.credits = credits;
      this.users.set(userId, user);
    }
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
      mockupImages: null,
      id,
      status: "uploading",
      resizedImages: null,
      upscaledImageUrl: null,
      mockupImageUrl: null,
      etsyListing: null,
      zipUrl: null,
      thumbnailUrl: insertProject.thumbnailUrl || null,
      aiPrompt: insertProject.aiPrompt || null,
      metadata: insertProject.metadata || {},
      createdAt: new Date(),
      upscaleOption: insertProject.upscaleOption || "2x",
    };
    this.projects.set(id, project);
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

  async createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction> {
    const id = randomUUID();
    const fullTransaction: CreditTransaction = {
      ...transaction,
      id,
      projectId: transaction.projectId || null,
      createdAt: new Date(),
    };
    this.creditTransactions.set(id, fullTransaction);
    return fullTransaction;
  }

  async getCreditTransactionsByUserId(userId: string): Promise<CreditTransaction[]> {
    return Array.from(this.creditTransactions.values()).filter(t => t.userId === userId);
  }

  async updateUserCreditsWithTransaction(userId: string, amount: number, transactionType: string, description: string, projectId?: string): Promise<{ newBalance: number; transaction: CreditTransaction }> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const newBalance = Math.max(0, user.credits + amount);
    user.credits = newBalance;
    this.users.set(userId, user);
    
    const transaction = await this.createCreditTransaction({
      userId,
      amount,
      transactionType,
      description,
      balanceAfter: newBalance,
      projectId: projectId || null,
    });
    
    return { newBalance, transaction };
  }

  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const id = randomUUID();
    const contactMessage: ContactMessage = {
      ...message,
      id,
      status: "unread",
      createdAt: new Date(),
    };
    this.contactMessages.set(id, contactMessage);
    return contactMessage;
  }

  async getContactMessages(): Promise<ContactMessage[]> {
    return Array.from(this.contactMessages.values());
  }

  async updateContactMessageStatus(id: string, status: string): Promise<void> {
    const message = this.contactMessages.get(id);
    if (message) {
      message.status = status;
      this.contactMessages.set(id, message);
    }
  }

  async logCreditTransaction(transaction: { userId: string; type: string; amount: number; description: string; balanceAfter: number }): Promise<CreditTransaction> {
    return this.createCreditTransaction({
      userId: transaction.userId,
      amount: transaction.type === 'debit' ? -Math.abs(transaction.amount) : Math.abs(transaction.amount),
      transactionType: transaction.type,
      description: transaction.description,
      balanceAfter: transaction.balanceAfter,
      projectId: null,
    });
  }
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
      credits: 100
    }).returning();
    return user;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const [user] = await db.update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  async updateUserCredits(userId: string, credits: number): Promise<void> {
    await db.update(users)
      .set({ credits })
      .where(eq(users.id, userId));
  }

  async updateUserSubscription(userId: string, subscriptionData: {
    subscriptionStatus: string;
    subscriptionPlan?: string;
    subscriptionId?: string;
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date;
  }): Promise<void> {
    await db.update(users)
      .set({
        subscriptionStatus: subscriptionData.subscriptionStatus,
        subscriptionPlan: subscriptionData.subscriptionPlan,
        subscriptionId: subscriptionData.subscriptionId,
        subscriptionStartDate: subscriptionData.subscriptionStartDate,
        subscriptionEndDate: subscriptionData.subscriptionEndDate,
      })
      .where(eq(users.id, userId));
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    // Ensure proper typing for database insertion
    const projectData: any = {
      ...insertProject,
      resizedImages: insertProject.resizedImages || [],
    };
    const [project] = await db.insert(projects).values(projectData).returning();
    return project;
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    const startTime = Date.now();
    console.log(`🔍 Getting projects for user: ${userId}`);
    
    try {
      // Use direct postgres-js client for maximum performance and reliability
      const { db: pgClient } = await import("./db");
      
      // Get the underlying postgres client from drizzle
      const rawClient = (pgClient as any)._.session.client;
      
      // Execute raw SQL directly via postgres-js for best performance
      const result = await rawClient`
        SELECT id, user_id as "userId", title, original_image_url as "originalImageUrl", 
               upscaled_image_url as "upscaledImageUrl", mockup_image_url as "mockupImageUrl",
               mockup_images as "mockupImages", resized_images as "resizedImages",
               etsy_listing as "etsyListing", mockup_template as "mockupTemplate",
               upscale_option as "upscaleOption", status, zip_url as "zipUrl",
               created_at as "createdAt", thumbnail_url as "thumbnailUrl",
               ai_prompt as "aiPrompt", metadata
        FROM projects 
        WHERE user_id = ${userId}
        ORDER BY created_at DESC 
        LIMIT 20
      `;
      
      const duration = Date.now() - startTime;
      console.log(`✅ Direct postgres query completed in ${duration}ms, found ${result.length} projects`);
      
      // Transform results to match Project interface
      return result.map((row: any) => ({
        id: row.id,
        userId: row.userId,
        title: row.title || 'Untitled Project',
        originalImageUrl: row.originalImageUrl || '',
        upscaledImageUrl: row.upscaledImageUrl,
        mockupImageUrl: row.mockupImageUrl,
        mockupImages: row.mockupImages || {},
        resizedImages: row.resizedImages || [],
        etsyListing: row.etsyListing,
        mockupTemplate: row.mockupTemplate,
        upscaleOption: row.upscaleOption,
        status: row.status || 'completed',
        zipUrl: row.zipUrl,
        createdAt: new Date(row.createdAt),
        thumbnailUrl: row.thumbnailUrl || row.originalImageUrl,
        aiPrompt: row.aiPrompt,
        metadata: row.metadata || {}
      }));
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Direct postgres query failed after ${duration}ms:`, error);
      
      // Final fallback: return minimal essential data only
      try {
        console.log(`🔄 Attempting minimal Drizzle fallback...`);
        const minimal = await db.select({
          id: projects.id,
          userId: projects.userId,
          title: projects.title,
          status: projects.status,
          createdAt: projects.createdAt,
          originalImageUrl: projects.originalImageUrl,
          thumbnailUrl: projects.thumbnailUrl
        }).from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt)).limit(5);
        
        const fallbackDuration = Date.now() - startTime;
        console.log(`✅ Minimal fallback completed in ${fallbackDuration}ms, found ${minimal.length} projects`);
        
        // Convert to full Project objects with defaults
        return minimal.map(p => ({
          id: p.id,
          userId: p.userId,
          title: p.title || 'Untitled Project',
          originalImageUrl: p.originalImageUrl || '',
          upscaledImageUrl: null,
          mockupImageUrl: null,
          mockupImages: {},
          resizedImages: [],
          etsyListing: null,
          mockupTemplate: null,
          upscaleOption: "2x",
          status: p.status || 'completed',
          zipUrl: null,
          createdAt: p.createdAt || new Date(),
          thumbnailUrl: p.thumbnailUrl || p.originalImageUrl,
          aiPrompt: null,
          metadata: {}
        }));
      } catch (finalError) {
        console.error(`❌ All queries failed:`, finalError);
        return [];
      }
    }
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const [project] = await db.update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async isPaymentProcessed(paymentReference: string): Promise<boolean> {
    const [payment] = await db.select().from(processedPayments)
      .where(eq(processedPayments.paymentReference, paymentReference));
    return !!payment;
  }

  async markPaymentProcessed(paymentReference: string, userId: string, creditsAllocated: number): Promise<void> {
    await db.insert(processedPayments).values({
      paymentReference,
      userId,
      creditsAllocated,
    });
  }

  async createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction> {
    const [creditTransaction] = await db.insert(creditTransactions).values(transaction).returning();
    return creditTransaction;
  }

  async getCreditTransactionsByUserId(userId: string): Promise<CreditTransaction[]> {
    return await db.select().from(creditTransactions).where(eq(creditTransactions.userId, userId)).orderBy(creditTransactions.createdAt);
  }

  async updateUserCreditsWithTransaction(userId: string, amount: number, transactionType: string, description: string, projectId?: string): Promise<{ newBalance: number; transaction: CreditTransaction }> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const newBalance = Math.max(0, user.credits + amount);
    await this.updateUserCredits(userId, newBalance);
    
    const transaction = await this.createCreditTransaction({
      userId,
      amount,
      transactionType,
      description,
      balanceAfter: newBalance,
      projectId: projectId || null,
    });
    
    return { newBalance, transaction };
  }

  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const [contactMessage] = await db.insert(contactMessages).values(message).returning();
    return contactMessage;
  }

  async getContactMessages(): Promise<ContactMessage[]> {
    return await db.select().from(contactMessages);
  }

  async updateContactMessageStatus(id: string, status: string): Promise<void> {
    await db.update(contactMessages)
      .set({ status })
      .where(eq(contactMessages.id, id));
  }

  async logCreditTransaction(transaction: { userId: string; type: string; amount: number; description: string; balanceAfter: number }): Promise<CreditTransaction> {
    return this.createCreditTransaction({
      userId: transaction.userId,
      amount: transaction.type === 'debit' ? -Math.abs(transaction.amount) : Math.abs(transaction.amount),
      transactionType: transaction.type,
      description: transaction.description,
      balanceAfter: transaction.balanceAfter,
      projectId: null,
    });
  }
}

// Robust storage with automatic fallback to in-memory when database fails
class RobustStorage implements IStorage {
  private primaryStorage: IStorage;
  private fallbackStorage: IStorage;
  private useFallback = false;

  constructor() {
    this.fallbackStorage = new MemStorage();
    this.primaryStorage = process.env.DATABASE_URL ? new DatabaseStorage() : this.fallbackStorage;
    
    if (process.env.DATABASE_URL) {
      console.log('🔄 Attempting to use PostgreSQL database with timeout protection');
      // Test database connection immediately
      this.testConnection();
    } else {
      console.log('⚠️ No DATABASE_URL found, using in-memory storage');
      this.useFallback = true;
    }
  }

  private async testConnection() {
    try {
      console.log('🔍 Testing database connection...');
      const testResult = await Promise.race([
        this.primaryStorage.getUser('test-connection-user'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection test timeout')), 5000))
      ]);
      console.log('✅ Database connection test successful');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('⚠️ Database connection test failed, will use fallback for all operations:', errorMessage);
      this.useFallback = true;
    }
  }

  private async executeWithFallback<T>(operation: (storage: IStorage) => Promise<T>): Promise<T> {
    const startTime = Date.now();
    const operationName = operation.toString().slice(0, 50) + '...';
    
    if (this.useFallback) {
      console.log(`🔄 Using fallback storage for operation`);
      const result = await operation(this.fallbackStorage);
      console.log(`✅ Fallback operation completed in ${Date.now() - startTime}ms`);
      return result;
    }

    console.log(`🔄 Executing primary storage operation`);
    
    try {
      // Add timeout to prevent hanging operations
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Database operation timeout after 15 seconds')), 15000);
      });
      
      const result = await Promise.race([
        operation(this.primaryStorage),
        timeoutPromise
      ]);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Primary storage operation completed in ${duration}ms`);
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.warn(`❌ Primary storage failed after ${duration}ms: ${error.message}`);
      
      if (!this.useFallback) {
        console.warn(`⚠️ Database operation failed, switching to in-memory storage: ${error.message}`);
        this.useFallback = true;
      }
      
      console.log(`🔄 Falling back to memory storage`);
      const fallbackResult = await operation(this.fallbackStorage);
      console.log(`✅ Fallback completed in ${Date.now() - startTime}ms`);
      return fallbackResult;
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.executeWithFallback(storage => storage.getUser(id));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.executeWithFallback(storage => storage.getUserByEmail(email));
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.executeWithFallback(storage => storage.createUser(user));
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    return this.executeWithFallback(storage => storage.updateUser(userId, updates));
  }

  async updateUserCredits(userId: string, credits: number): Promise<void> {
    return this.executeWithFallback(storage => storage.updateUserCredits(userId, credits));
  }

  async updateUserSubscription(userId: string, subscriptionData: {
    subscriptionStatus: string;
    subscriptionPlan?: string;
    subscriptionId?: string;
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date;
  }): Promise<void> {
    return this.executeWithFallback(storage => storage.updateUserSubscription(userId, subscriptionData));
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    return this.executeWithFallback(storage => storage.createProject(insertProject));
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    return this.executeWithFallback(storage => storage.getProjectsByUserId(userId));
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.executeWithFallback(storage => storage.getProject(id));
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    return this.executeWithFallback(storage => storage.updateProject(id, updates));
  }

  async isPaymentProcessed(paymentReference: string): Promise<boolean> {
    return this.executeWithFallback(storage => storage.isPaymentProcessed(paymentReference));
  }

  async markPaymentProcessed(paymentReference: string, userId: string, creditsAllocated: number): Promise<void> {
    return this.executeWithFallback(storage => storage.markPaymentProcessed(paymentReference, userId, creditsAllocated));
  }

  async createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction> {
    return this.executeWithFallback(storage => storage.createCreditTransaction(transaction));
  }

  async getCreditTransactionsByUserId(userId: string): Promise<CreditTransaction[]> {
    return this.executeWithFallback(storage => storage.getCreditTransactionsByUserId(userId));
  }

  async updateUserCreditsWithTransaction(userId: string, amount: number, transactionType: string, description: string, projectId?: string): Promise<{ newBalance: number; transaction: CreditTransaction }> {
    return this.executeWithFallback(storage => storage.updateUserCreditsWithTransaction(userId, amount, transactionType, description, projectId));
  }

  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    return this.executeWithFallback(storage => storage.createContactMessage(message));
  }

  async getContactMessages(): Promise<ContactMessage[]> {
    return this.executeWithFallback(storage => storage.getContactMessages());
  }

  async updateContactMessageStatus(id: string, status: string): Promise<void> {
    return this.executeWithFallback(storage => storage.updateContactMessageStatus(id, status));
  }

  async logCreditTransaction(transaction: { userId: string; type: string; amount: number; description: string; balanceAfter: number }): Promise<CreditTransaction> {
    return this.executeWithFallback(storage => storage.logCreditTransaction(transaction));
  }
}

// Use database storage with fallback to in-memory
console.log('🔄 Attempting to use PostgreSQL database with fallback capability');
const storage: IStorage = new RobustStorage();

export { storage };
