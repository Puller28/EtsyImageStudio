import { type User, type InsertUser, type Project, type InsertProject, type CreditTransaction, type InsertCreditTransaction, type ContactMessage, type InsertContactMessage } from "@shared/schema";
import { users, projects, processedPayments, creditTransactions, contactMessages } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(userId: string, updates: Partial<InsertUser>): Promise<User>;
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
    
    // Add a demo user (password: "password123" - bcrypt hash)
    const demoUser: User = {
      id: "demo-user-1",
      email: "sarah@example.com",
      name: "Sarah M.",
      password: "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LFcxhNQx3yEqzl4E6", // "password123"
      avatar: "https://pixabay.com/get/ge5dfc7fb2d8c4be2d5a50f55c24114e5603b48aa392e8aac639cb21db396cb687be010f4599d05cb3f833a8e1e63a09b21980dd1e45f7123b97f17284bac3411_1280.jpg",
      credits: 47,
      subscriptionStatus: "free",
      subscriptionPlan: null,
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

  async updateUser(userId: string, updates: Partial<InsertUser>): Promise<User> {
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
      mockupImages: null, // Fix type issue
      id,
      status: "uploading",
      resizedImages: null,
      upscaledImageUrl: null,
      mockupImageUrl: null,
      etsyListing: null,
      zipUrl: null,
      createdAt: new Date(),
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

  async updateUser(userId: string, updates: Partial<InsertUser>): Promise<User> {
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
    return await db.select().from(projects).where(eq(projects.userId, userId));
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
      console.log('🔄 Attempting to use PostgreSQL database');
    } else {
      console.log('⚠️ No DATABASE_URL found, using in-memory storage');
      this.useFallback = true;
    }
  }

  private async executeWithFallback<T>(operation: (storage: IStorage) => Promise<T>): Promise<T> {
    if (this.useFallback) {
      return operation(this.fallbackStorage);
    }

    try {
      return await operation(this.primaryStorage);
    } catch (error: any) {
      if (!this.useFallback) {
        console.warn(`⚠️ Database operation failed, switching to in-memory storage: ${error.message}`);
        this.useFallback = true;
      }
      return operation(this.fallbackStorage);
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

  async updateUser(userId: string, updates: Partial<InsertUser>): Promise<User> {
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
}

// Use database storage with fallback to in-memory
console.log('🔄 Attempting to use PostgreSQL database with fallback capability');
const storage: IStorage = new RobustStorage();

export { storage };
