import { User, Project, CreditTransaction } from "../shared/schema";
import crypto from "crypto";
import postgres from 'postgres';

// Robust database connection for production stability
function createDbConnection() {
  return postgres(process.env.DATABASE_URL!, {
    ssl: 'require',
    max: 5, // Allow more connections for stability
    idle_timeout: 20, // 20 second idle timeout
    connect_timeout: 30, // 30 second connection timeout
    prepare: false,
    transform: { undefined: null },
    onnotice: () => {}, // Suppress notices
    fetch_types: false // Disable type fetching for speed
  });
}

export interface IStorage {
  // User management
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Project management
  createProject(project: Omit<Project, 'id' | 'createdAt'>): Promise<Project>;
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByUserId(userId: string): Promise<Project[]>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;

  // Credit management
  updateUserCreditsWithTransaction(userId: string, creditChange: number, transactionType: string, description: string, projectId?: string): Promise<boolean>;
  logCreditTransaction(userId: string, type: string, amount: number, description: string): Promise<void>;
  createCreditTransaction(transaction: Omit<CreditTransaction, 'id' | 'createdAt'>): Promise<CreditTransaction>;
  getCreditTransactions(userId: string): Promise<CreditTransaction[]>;

  // Payment management
  isPaymentProcessed(paymentReference: string): Promise<boolean>;
  markPaymentProcessed(paymentReference: string, userId: string, creditsAllocated: number): Promise<void>;

  // Contact management
  getContactMessages(): Promise<any[]>;
  createContactMessage(message: any): Promise<any>;
}

class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private projects = new Map<string, Project>();
  private creditTransactions = new Map<string, CreditTransaction>();
  private processedPayments = new Set<string>();
  private contactMessages = new Map<string, any>();

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
    
    this.users.set(id, user);

    // Persist to database
    try {
      const sql = createDbConnection();

      await sql`
        INSERT INTO public.users (id, email, name, password, credits, subscription_status, subscription_plan, created_at)
        VALUES (${user.id}, ${user.email}, ${user.name || user.email.split('@')[0]}, ${user.password}, ${user.credits || 100}, ${'free'}, ${null}, ${user.createdAt})
      `;
      
      await sql.end();
      console.log(`✅ Persisted user ${user.email} to database`);
      
    } catch (dbError) {
      console.error(`⚠️ Failed to persist user ${user.email} to database:`, dbError);
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

  async createProject(projectData: Omit<Project, 'id' | 'createdAt'>): Promise<Project> {
    const id = crypto.randomUUID();
    const createdAt = new Date();
    
    const project: Project = {
      id,
      ...projectData,
      createdAt
    };
    
    console.log(`💾 MemStorage: Creating project "${project.title}" with ID ${id}`);
    this.projects.set(id, project);
    console.log(`💾 MemStorage: Project stored in memory, total projects: ${this.projects.size}`);

    // Persist to database
    try {
      console.log(`💾 Database: Attempting to save project ${id} to database`);
      const sql = createDbConnection();

      await sql`
        INSERT INTO projects (
          id, user_id, title, original_image_url, upscaled_image_url, 
          mockup_image_url, mockup_images, resized_images, etsy_listing,
          mockup_template, upscale_option, status, zip_url, thumbnail_url,
          ai_prompt, metadata, created_at
        ) VALUES (
          ${project.id}, ${project.userId}, ${project.title || ''}, ${project.originalImageUrl || null},
          ${project.upscaledImageUrl || null}, ${project.mockupImageUrl || null}, ${JSON.stringify(project.mockupImages || [])},
          ${JSON.stringify(project.resizedImages || [])}, ${JSON.stringify(project.etsyListing || {})},
          ${project.mockupTemplate || null}, ${project.upscaleOption || '2x'}, ${project.status || 'pending'}, ${project.zipUrl || null},
          ${project.thumbnailUrl || null}, ${project.aiPrompt || null}, ${JSON.stringify(project.metadata || {})}, ${project.createdAt}
        )
      `;
      
      await sql.end();
      console.log(`💾 Database: Project ${id} successfully saved to database`);
      
    } catch (dbError) {
      console.error(`💾 Database: Failed to persist project ${id} to database:`, dbError);
    }
    
    return project;
  }

  async getProject(id: string): Promise<Project | undefined> {
    console.log(`🔍 MemStorage: Looking for project ${id}`);
    console.log(`🔍 MemStorage: Have ${this.projects.size} projects in memory`);
    console.log(`🔍 MemStorage: Memory project IDs:`, Array.from(this.projects.keys()));
    
    // Check memory cache first
    const cachedProject = this.projects.get(id);
    if (cachedProject) {
      console.log(`✅ MemStorage: Found project ${id} in memory cache`);
      return cachedProject;
    }
    
    console.log(`❌ MemStorage: Project ${id} NOT found in memory, checking database...`);

    // Try to load from database if not in memory
    try {
      const sql = createDbConnection();

      const projects = await sql`
        SELECT 
          id, user_id, title, original_image_url, upscaled_image_url,
          mockup_image_url, mockup_images, resized_images, etsy_listing,
          mockup_template, upscale_option, status, zip_url, thumbnail_url,
          ai_prompt, metadata, created_at
        FROM projects 
        WHERE id = ${id}
        LIMIT 1
      `;
      
      await sql.end();
      
      if (projects.length > 0) {
        const project = projects[0];
        const convertedProject: Project = {
          id: project.id,
          userId: project.user_id,
          title: project.title,
          originalImageUrl: project.original_image_url,
          upscaledImageUrl: project.upscaled_image_url,
          mockupImageUrl: project.mockup_image_url,
          mockupImages: (() => {
            try {
              const mockupData = project.mockup_images;
              if (typeof mockupData === 'string') {
                const parsed = JSON.parse(mockupData);
                return Array.isArray(parsed) ? {} : (parsed || {});
              }
              return Array.isArray(mockupData) ? {} : (mockupData || {});
            } catch (e) {
              console.warn('Failed to parse mockupImages in getProject:', project.mockup_images);
              return {};
            }
          })(),
          resizedImages: project.resized_images || [],
          etsyListing: (() => {
            try {
              return typeof project.etsy_listing === 'string' ? JSON.parse(project.etsy_listing) : project.etsy_listing || {};
            } catch (error) {
              console.warn('Failed to parse etsyListing in getProject:', project.etsy_listing);
              return {};
            }
          })(),
          mockupTemplate: project.mockup_template,
          upscaleOption: project.upscale_option,
          status: project.status,
          zipUrl: project.zip_url,
          thumbnailUrl: project.thumbnail_url,
          aiPrompt: project.ai_prompt,
          metadata: project.metadata || {},
          createdAt: new Date(project.created_at)
        };
        
        // Cache for future requests
        this.projects.set(convertedProject.id, convertedProject);
        return convertedProject;
      }
    } catch (error) {
      console.warn(`⚠️ Failed to load project ${id} from database:`, error);
    }

    return undefined;
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    // Load projects with optimized data (excluding large images for performance)
    console.log(`🔄 Loading projects list for user ${userId} (optimized query)`);
    
    try {
      const projects = await this.loadProjectsListFromDatabase(userId);
      
      // DON'T cache optimized results - they're incomplete and would break individual project views
      // Individual projects need full data via getProject() method
      
      return projects;
      
    } catch (error) {
      console.log(`⚠️ Database query failed for user ${userId}, returning empty array:`, error.message);
      return [];
    }
  }
  
  // Optimized loading for project lists (excludes large image data)
  private async loadProjectsListFromDatabase(userId: string): Promise<Project[]> {
    const sql = createDbConnection();

    try {
      // Ultra-fast query - no large data fields at all
      const projects = await sql`
        SELECT 
          id, user_id, title, status, thumbnail_url, zip_url, created_at, 
          upscale_option, mockup_template, ai_prompt,
          NULL as original_image_url,
          NULL as upscaled_image_url, 
          NULL as mockup_image_url,
          '{}' as mockup_images,
          '[]' as resized_images,
          CASE WHEN etsy_listing IS NOT NULL AND etsy_listing != '{}' THEN '{}' ELSE '{}' END as etsy_listing,
          COALESCE(metadata, '{}') as metadata
        FROM projects 
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 20
      `;
      
      const convertedProjects = projects.map((project: any) => ({
        id: project.id,
        userId: project.user_id,
        title: project.title || 'Untitled Project',
        originalImageUrl: project.original_image_url, // Truncated for thumbnail use
        upscaledImageUrl: project.upscaled_image_url,
        mockupImageUrl: project.mockup_image_url,
        mockupImages: {},
        resizedImages: [],
        etsyListing: {},
        mockupTemplate: project.mockup_template,
        upscaleOption: project.upscale_option || '2x',
        status: project.status || 'pending',
        zipUrl: project.zip_url,
        thumbnailUrl: project.thumbnail_url,
        aiPrompt: project.ai_prompt,
        metadata: project.metadata || {},
        createdAt: new Date(project.created_at)
      }));
      
      console.log(`✅ Retrieved ${convertedProjects.length} projects (optimized) for user ${userId}`);
      return convertedProjects;
      
    } finally {
      await sql.end();
    }
  }

  // Full project loading (includes all data) - used for individual project details
  private async loadProjectsFromDatabase(userId: string): Promise<Project[]> {
    const sql = createDbConnection();

    try {
      // Load complete project data with optimized JSON handling
      const projects = await sql`
        SELECT 
          id, user_id, title, status, thumbnail_url, original_image_url, 
          upscaled_image_url, mockup_image_url, 
          COALESCE(mockup_images, '{}') as mockup_images,
          COALESCE(resized_images, '[]') as resized_images,
          COALESCE(etsy_listing, '{}') as etsy_listing,
          zip_url, created_at, upscale_option, mockup_template, 
          ai_prompt, COALESCE(metadata, '{}') as metadata
        FROM projects 
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 20
      `;
      
      const convertedProjects = projects.map((project: any) => ({
        id: project.id,
        userId: project.user_id,
        title: project.title || 'Untitled Project',
        originalImageUrl: project.original_image_url,
        upscaledImageUrl: project.upscaled_image_url,
        mockupImageUrl: project.mockup_image_url,
        mockupImages: project.mockup_images || {},
        resizedImages: project.resized_images || [],
        etsyListing: project.etsy_listing || {},
        mockupTemplate: project.mockup_template,
        upscaleOption: project.upscale_option || '2x',
        status: project.status || 'pending',
        zipUrl: project.zip_url,
        thumbnailUrl: project.thumbnail_url,
        aiPrompt: project.ai_prompt,
        metadata: project.metadata || {},
        createdAt: new Date(project.created_at)
      }));
      
      // Debug the converted projects before caching
      console.log(`🔍 PRODUCTION Raw DB projects:`, projects.length);
      console.log(`🔍 PRODUCTION Converted projects:`, convertedProjects.length);
      if (convertedProjects.length > 0) {
        console.log(`🔍 PRODUCTION First converted project:`, {
          id: convertedProjects[0].id,
          title: convertedProjects[0].title,
          status: convertedProjects[0].status,
          createdAt: convertedProjects[0].createdAt
        });
      }
      
      // Cache in memory for future requests
      convertedProjects.forEach(project => {
        this.projects.set(project.id, project);
      });
      
      console.log(`✅ Retrieved ${convertedProjects.length} projects from database for user ${userId}`);
      return convertedProjects;
      
    } finally {
      await sql.end();
    }
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) {
      return undefined;
    }
    
    const updatedProject = { ...project, ...updates };
    this.projects.set(id, updatedProject);
    
    // Persist to database
    try {
      const sql = createDbConnection();
      
      await sql`
        UPDATE projects 
        SET 
          title = ${updatedProject.title || ''},
          upscaled_image_url = ${updatedProject.upscaledImageUrl || null},
          mockup_image_url = ${updatedProject.mockupImageUrl || null},
          mockup_images = ${JSON.stringify(updatedProject.mockupImages || {})},
          resized_images = ${JSON.stringify(updatedProject.resizedImages || [])},
          etsy_listing = ${JSON.stringify(updatedProject.etsyListing || {})},
          mockup_template = ${updatedProject.mockupTemplate || null},
          upscale_option = ${updatedProject.upscaleOption || '2x'},
          status = ${updatedProject.status || 'pending'},
          zip_url = ${updatedProject.zipUrl || null},
          thumbnail_url = ${updatedProject.thumbnailUrl || null},
          ai_prompt = ${updatedProject.aiPrompt || null},
          metadata = ${JSON.stringify(updatedProject.metadata || {})}
        WHERE id = ${id}
      `;
      
      await sql.end();
      console.log(`✅ Successfully updated project ${id} in database`);
      
    } catch (dbError) {
      console.error(`⚠️ Failed to update project ${id} in database:`, dbError);
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
      return memoryTransactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
    return memoryTransactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
}

export const storage = new MemStorage();