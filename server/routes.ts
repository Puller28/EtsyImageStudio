import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { z } from "zod";
import { storage } from "./storage";
import { insertProjectSchema, insertUserSchema } from "@shared/schema";
import { generateEtsyListing } from "./services/openai";
import { segmindService } from "./services/segmind";
import { aiArtGeneratorService } from "./services/ai-art-generator";
import { fallbackUpscale, base64ToBuffer, bufferToBase64 } from "./services/image-upscaler-fallback";
import { resizeImageToFormats } from "./services/image-processor";
import { generateMockupsForCategory } from "./services/mockup-templates";
import { generateProjectZip } from "./services/zip-generator";
import { AuthService, authenticateToken, optionalAuth, type AuthenticatedRequest } from "./auth";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login({ email, password });
      
      if (!result) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const { password } = req.body;
      
      const result = await AuthService.register({
        ...userData,
        password
      });
      
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid user data", details: error.errors });
      }
      if (error instanceof Error && error.message === "User already exists with this email") {
        return res.status(409).json({ error: error.message });
      }
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Get current user (with optional auth)
  app.get("/api/user", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(req.user);
    } catch (error) {
      console.error("Error getting user:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Refresh token endpoint for production authentication issues
  app.post("/api/refresh-auth", async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }
      
      // Get user from storage
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Generate fresh token
      const { AuthService } = await import("./auth");
      const token = AuthService.generateToken(user.id);
      
      console.log('🔄 Generated fresh token for user:', user.id);
      
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          credits: user.credits,
          avatar: user.avatar
        }
      });
    } catch (error) {
      console.error("Error refreshing auth:", error);
      res.status(500).json({ error: "Failed to refresh authentication" });
    }
  });

  // Paystack connectivity test endpoint
  app.get("/api/debug/paystack-status", async (req, res) => {
    try {
      const hasSecretKey = !!process.env.PAYSTACK_SECRET_KEY;
      const keyType = hasSecretKey 
        ? (process.env.PAYSTACK_SECRET_KEY?.startsWith('sk_test_') ? 'test' : 'live')
        : 'missing';
      
      let apiTest = null;
      if (hasSecretKey) {
        try {
          const response = await fetch('https://api.paystack.co/transaction', {
            headers: {
              'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              'Content-Type': 'application/json'
            }
          });
          apiTest = {
            status: response.status,
            ok: response.ok,
            accessible: response.status !== 401 && response.status !== 403
          };
        } catch (error: any) {
          apiTest = { error: error.message };
        }
      }
      
      res.json({
        environment: process.env.NODE_ENV || 'development',
        paystack: {
          hasSecretKey,
          keyType,
          apiTest
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Debug endpoint for token validation (development only)
  app.post("/api/debug/validate-token", async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: "Not found" });
    }
    
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: "Token required" });
      }
      
      const { AuthService } = await import("./auth");
      const decoded = AuthService.verifyToken(token);
      
      res.json({
        valid: !!decoded,
        decoded: decoded || null,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: "Token validation failed" });
    }
  });

  // Update user profile
  app.patch("/api/user/profile", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const { name, email } = req.body;
      const updatedUser = await storage.updateUser(req.userId, { name, email });
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Credit packages endpoint
  app.get("/api/credit-packages", async (req, res) => {
    try {
      const { PaystackService } = await import("./paystack");
      const packages = PaystackService.getAllCreditPackages();
      res.json(packages);
    } catch (error) {
      console.error("Error getting credit packages:", error);
      res.status(500).json({ error: "Failed to get credit packages" });
    }
  });

  // All plans endpoint (credit packages + subscriptions)
  app.get("/api/all-plans", async (req, res) => {
    try {
      const { PaystackService } = await import("./paystack");
      const plans = PaystackService.getAllPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error getting all plans:", error);
      res.status(500).json({ error: "Failed to get plans" });
    }
  });

  // Purchase credits endpoint
  app.post("/api/purchase-credits", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Strict validation: reject demo user for credit purchases to prevent payment issues
      if (!req.userId || !req.user || req.userId === 'demo-user-1') {
        console.warn('🔍 Credit purchase attempted without proper authentication or with demo user');
        console.warn('🔍 Request headers:', JSON.stringify(req.headers, null, 2));
        return res.status(401).json({ 
          error: "Authentication required", 
          message: "Please ensure you are properly logged in to purchase credits. Demo users cannot purchase credits."
        });
      }

      const { packageId } = req.body;
      const { PaystackService } = await import("./paystack");
      
      const creditPackage = PaystackService.getCreditPackage(packageId);
      if (!creditPackage) {
        return res.status(400).json({ error: "Invalid credit package" });
      }

      const paymentData = {
        email: req.user.email,
        amount: creditPackage.zarPrice, // Amount in kobo (ZAR cents)
        currency: 'ZAR' as const,
        metadata: {
          creditPackageId: packageId,
          credits: creditPackage.credits,
          userId: req.userId!, // Non-null assertion since authenticateToken ensures this exists
        },
        callback_url: `${req.protocol}://${req.get('host')}/payment-callback`,
      };

      const result = await PaystackService.initializePayment(paymentData);
      
      if (result.success) {
        res.json(result.data);
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error("Error purchasing credits:", error);
      res.status(500).json({ error: "Failed to initiate payment" });
    }
  });

  // Verify payment endpoint
  app.get("/api/verify-payment/:reference", async (req, res) => {
    try {
      const { reference } = req.params;
      console.log('🔍 Payment verification request for reference:', reference);
      
      if (!reference || typeof reference !== 'string') {
        return res.status(400).json({ success: false, error: "Invalid reference parameter" });
      }
      
      const { PaystackService } = await import("./paystack");
      
      const verification = await PaystackService.verifyPayment(reference);
      console.log('🔍 Paystack verification result:', { 
        success: verification.success, 
        hasData: !!verification.data,
        error: verification.error 
      });
      
      if (verification.success && verification.data) {
        const { metadata } = verification.data;
        console.log('🔍 Payment metadata:', metadata);
        
        if (metadata && typeof metadata === 'object' && 'userId' in metadata && 'credits' in metadata) {
          let user = await storage.getUser(metadata.userId);
          
          // Handle demo user case - create fallback user if not found
          if (!user && metadata.userId === 'demo-user-1') {
            console.log('🔍 Creating fallback demo user for payment processing');
            user = {
              id: 'demo-user-1',
              email: "sarah@example.com",
              name: "Sarah M.",
              avatar: "https://pixabay.com/get/ge5dfc7fb2d8c4be2d5a50f55c24114e5603b48aa392e8aac639cb21db396cb687be010f4599d05cb3f833a8e1e63a09b21980dd1e45f7123b97f17284bac3411_1280.jpg",
              credits: 47,
              subscriptionStatus: "free",
              subscriptionPlan: null,
              subscriptionId: null,
              subscriptionStartDate: null,
              subscriptionEndDate: null,
              createdAt: new Date(),
            };
          }
          if (user) {
            // Add credits to user account (with idempotency check)
            const creditsToAdd = parseInt(metadata.credits) || 0;
            
            // Check if payment has already been processed to prevent double crediting
            const isProcessed = await storage.isPaymentProcessed(reference);
            if (isProcessed) {
              console.log(`⚠️ Payment ${reference} already processed, skipping credit allocation`);
            } else {
              const newCredits = user.credits + creditsToAdd;
              
              try {
                await storage.updateUserCredits(user.id, newCredits);
                await storage.markPaymentProcessed(reference, user.id, creditsToAdd);
                console.log(`✅ Added ${creditsToAdd} credits to user ${user.id} (first time processing ${reference})`);
              } catch (error) {
                console.warn('Failed to update user credits, payment processed but credits not added:', error);
              }
            }
            
            res.json({
              success: true,
              credits: creditsToAdd,
              message: `${creditsToAdd} credits added successfully`,
              note: "Payment verified and processed"
            });
          } else {
            console.warn('🔍 User not found for payment:', metadata.userId);
            res.status(404).json({ success: false, error: "User not found" });
          }
        } else {
          console.warn('🔍 Invalid payment metadata:', metadata);
          res.status(400).json({ success: false, error: "Invalid payment metadata" });
        }
      } else {
        console.warn('🔍 Payment verification failed:', verification.error);
        res.json({
          success: false,
          error: verification.error || "Payment verification failed"
        });
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ success: false, error: "Payment verification failed" });
    }
  });

  // Subscribe to plan endpoint - Use optionalAuth with strict validation for better production compatibility
  app.post("/api/subscribe", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Debug authentication status
      console.log('🔍 Subscribe Debug:', {
        hasUserId: !!req.userId,
        hasUser: !!req.user,
        userId: req.userId,
        userEmail: req.user?.email,
        isDemoUser: req.userId === 'demo-user-1'
      });

      // Strict validation: reject demo user for subscription to prevent payment issues
      if (!req.userId || !req.user || req.userId === 'demo-user-1') {
        console.warn('🔍 Subscription attempted without proper authentication or with demo user');
        console.warn('🔍 Request headers:', JSON.stringify(req.headers, null, 2));
        return res.status(401).json({ 
          error: "Authentication required", 
          message: "Please ensure you are properly logged in to subscribe to a plan. Demo users cannot purchase subscriptions."
        });
      }

      const { planId } = req.body;
      const { PaystackService } = await import("./paystack");
      
      const subscriptionPlan = PaystackService.getSubscriptionPlan(planId);
      if (!subscriptionPlan) {
        return res.status(400).json({ error: "Invalid subscription plan" });
      }

      // Use the Paystack plan code from the subscription plan
      // You need to create these plans in your Paystack dashboard first
      const planCode = subscriptionPlan.paystackPlanCode;
      
      if (!planCode) {
        return res.status(400).json({ 
          error: "Subscription plan not configured. Please create the plan in Paystack dashboard first." 
        });
      }

      const subscriptionData = {
        email: req.user.email,
        planCode,
        amount: subscriptionPlan.zarPrice, // Amount in kobo (ZAR cents)
        metadata: {
          planId: planId,
          credits: subscriptionPlan.credits,
          userId: req.userId!, // Non-null assertion since authenticateToken ensures this exists
        },
        callback_url: `${req.protocol}://${req.get('host')}/payment-callback`,
      };

      const result = await PaystackService.initializeSubscription(subscriptionData);
      
      if (result.success) {
        res.json(result.data);
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error("Error subscribing to plan:", error);
      res.status(500).json({ error: "Failed to initiate subscription" });
    }
  });

  // Paystack webhook endpoint
  app.post("/api/paystack-webhook", async (req, res) => {
    try {
      const { PaystackService } = await import("./paystack");
      const { SubscriptionService } = await import("./subscription");
      const secret = process.env.PAYSTACK_SECRET_KEY;
      
      if (!secret) {
        return res.status(500).json({ error: "Paystack secret key not configured" });
      }

      // Verify webhook signature
      const crypto = await import('crypto');
      const hash = crypto.createHmac('sha512', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (hash !== req.headers['x-paystack-signature']) {
        return res.status(400).json({ error: "Invalid signature" });
      }

      const event = req.body;
      
      if (event.event === 'charge.success') {
        const { reference, metadata, subscription } = event.data;
        
        if (metadata && metadata.userId) {
          // Get current user
          const user = await storage.getUser(metadata.userId);
          if (user) {
            // Handle subscription activation
            if (subscription && subscription.subscription_code && metadata.planId) {
              await SubscriptionService.activateSubscription(metadata.userId, {
                planId: metadata.planId,
                subscriptionId: subscription.subscription_code,
                startDate: new Date(),
                endDate: subscription.next_payment_date ? new Date(subscription.next_payment_date) : undefined,
              });
              console.log(`✅ Webhook: Activated subscription ${metadata.planId} for user ${metadata.userId}`);
            }
            
            // Add credits to user account (with idempotency check)
            if (metadata.credits) {
              // Check if payment has already been processed to prevent double crediting
              const isProcessed = await storage.isPaymentProcessed(reference);
              if (isProcessed) {
                console.log(`⚠️ Webhook: Payment ${reference} already processed, skipping credit allocation`);
              } else {
                const creditsToAdd = parseInt(metadata.credits);
                const newCredits = user.credits + creditsToAdd;
                
                await storage.updateUserCredits(metadata.userId, newCredits);
                await storage.markPaymentProcessed(reference, metadata.userId, creditsToAdd);
                console.log(`✅ Webhook: Added ${creditsToAdd} credits to user ${metadata.userId} via ${reference} (first time processing)`);
              }
            }
          }
        }
      }
      
      // Handle subscription cancellation
      if (event.event === 'subscription.disable') {
        const { subscription_code, customer } = event.data;
        
        // Find user by subscription ID and update status
        // Note: This is a simplified approach - in production you'd want to store subscription mappings
        console.log(`📋 Webhook: Subscription ${subscription_code} disabled for customer ${customer.email}`);
      }
      
      res.status(200).json({ status: 'success' });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // Get subscription status endpoint
  app.get("/api/subscription-status", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { SubscriptionService } = await import("./subscription");
      const status = await SubscriptionService.getSubscriptionStatus(req.userId);
      
      res.json(status);
    } catch (error) {
      console.error("Error getting subscription status:", error);
      res.status(500).json({ error: "Failed to get subscription status" });
    }
  });

  // Cancel subscription endpoint
  app.post("/api/cancel-subscription", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId || !req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUser(req.userId);
      if (!user || !user.subscriptionId) {
        return res.status(400).json({ error: "No active subscription found" });
      }

      const { SubscriptionService } = await import("./subscription");
      const result = await SubscriptionService.cancelSubscription(req.userId, user.subscriptionId);
      
      if (result.success) {
        res.json({ message: result.message });
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  // Test payment verification endpoint (for development)
  app.post("/api/test-payment-verification", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId || !req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { reference } = req.body;
      
      if (!reference) {
        return res.status(400).json({ error: "Payment reference required" });
      }

      const { PaystackService } = await import("./paystack");
      const verification = await PaystackService.verifyPayment(reference);
      
      if (verification.success && verification.data) {
        const { metadata } = verification.data;
        
        if (metadata && metadata.userId && metadata.credits) {
          // Get current user credits
          const user = await storage.getUser(metadata.userId);
          if (user) {
            // Add credits to user account
            const newCredits = user.credits + parseInt(metadata.credits);
            await storage.updateUserCredits(metadata.userId, newCredits);
            
            return res.json({
              success: true,
              credits: parseInt(metadata.credits),
              message: `Added ${metadata.credits} credits to your account`
            });
          }
        }
      }
      
      res.json({
        success: false,
        error: "Payment verification failed or invalid payment data"
      });
    } catch (error) {
      console.error("Test verification error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // Get user projects
  app.get("/api/projects", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const projects = await storage.getProjectsByUserId(req.userId);
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
  app.post("/api/projects", optionalAuth, upload.single("image"), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      if (!req.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { artworkTitle, styleKeywords, upscaleOption, mockupTemplate } = req.body;
      
      // Check user credits before project creation
      const user = await storage.getUser(req.userId);
      const creditsRequired = (upscaleOption === '4x') ? 2 : 1;
      
      if (!user || user.credits < creditsRequired) {
        return res.status(400).json({ 
          error: `Insufficient credits. ${upscaleOption} upscaling requires ${creditsRequired} credit${creditsRequired > 1 ? 's' : ''}. Please purchase more credits.`
        });
      }
      
      const projectData = insertProjectSchema.parse({
        userId: req.userId,
        title: artworkTitle || "Untitled Artwork",
        originalImageUrl: `data:image/jpeg;base64,${req.file.buffer.toString('base64')}`,
        upscaleOption: upscaleOption || "2x",
        mockupTemplate: mockupTemplate || "living-room",
        artworkTitle: artworkTitle || "Untitled Artwork",
        styleKeywords: styleKeywords || "digital art"
      });

      const project = await storage.createProject(projectData);
      
      // Deduct credits based on upscale option (2x = 1 credit, 4x = 2 credits)
      const newCredits = Math.max(0, user.credits - creditsRequired);
      await storage.updateUserCredits(req.userId, newCredits);
      console.log(`💳 Deducted ${creditsRequired} credits for ${upscaleOption} upscaling from user ${req.userId}. New balance: ${newCredits}`);
      
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid project data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create project" });
      }
    }
  });

  // Process project (upscale, resize, mockup, SEO) - REAL PROCESSING
  app.post("/api/projects/:id/process", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      console.log(`🔧 Starting REAL processing for project: ${project.id}`);
      
      // Update status to processing
      await storage.updateProject(project.id, { status: "processing" });
      
      // Start real processing in background
      processProjectAsync(project).catch(error => {
        console.error(`🔧❌ Background processing failed for ${project.id}:`, error);
      });
      
      res.json({ message: "Real processing started" });
      
    } catch (error) {
      console.error("🔧❌ Failed to start real processing:", error);
      await storage.updateProject(req.params.id, { status: "failed" });
      res.status(500).json({ error: "Failed to process project" });
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

  // Reset stuck project status (debug endpoint)
  app.post("/api/projects/:id/reset", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Mark as completed with dummy data for stuck projects
      await storage.updateProject(project.id, {
        status: "completed",
        zipUrl: "data:application/zip;base64,UEsDBAoAAAAAAItJJVkAAAAAAAAAAAAAAAAJAAAAbW9ja3VwLmpwZw==",
        mockupImageUrl: project.upscaledImageUrl || project.originalImageUrl,
        resizedImages: [project.originalImageUrl, project.originalImageUrl, project.originalImageUrl, project.originalImageUrl, project.originalImageUrl]
      });

      const updatedProject = await storage.getProject(project.id);
      res.json(updatedProject);
    } catch (error) {
      res.status(500).json({ error: "Failed to reset project" });
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

  // Generate and download ZIP file with actual assets
  app.get("/api/projects/:id/download-zip", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project || project.status !== "completed") {
        return res.status(404).json({ error: "Project not ready for download" });
      }

      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Add project files to ZIP
      if (project.originalImageUrl && project.originalImageUrl.startsWith('data:image/')) {
        const base64Data = project.originalImageUrl.split(',')[1];
        zip.file("original-image.jpg", base64Data, { base64: true });
      }

      // Add upscaled image
      if (project.upscaledImageUrl && project.upscaledImageUrl.startsWith('data:image/')) {
        const base64Data = project.upscaledImageUrl.split(',')[1];
        zip.file("upscaled-image.jpg", base64Data, { base64: true });
      }

      // Add print format sizes
      const printFormats = ["4x5-8x10.jpg", "3x4-18x24.jpg", "2x3-12x18.jpg", "11x14.jpg", "A4-ISO.jpg"];
      printFormats.forEach((filename, index) => {
        if (project.resizedImages?.[index] && project.resizedImages[index].startsWith('data:image/')) {
          const base64Data = project.resizedImages[index].split(',')[1];
          zip.file(`print-formats/${filename}`, base64Data, { base64: true });
        }
      });

      // Add mockup images
      if (project.mockupImages) {
        Object.entries(project.mockupImages).forEach(([key, url], index) => {
          if (url && typeof url === 'string' && url.startsWith('data:image/')) {
            const base64Data = url.split(',')[1];
            zip.file(`mockups/mockup-${index + 1}.jpg`, base64Data, { base64: true });
          }
        });
      }

      // Add Etsy listing content if available
      if (project.etsyListing) {
        zip.file("etsy-listing.txt", 
          `TITLE: ${project.etsyListing.title}\n\n` +
          `TAGS: ${project.etsyListing.tags.join(', ')}\n\n` +
          `DESCRIPTION:\n${project.etsyListing.description}`
        );
      }

      // Generate ZIP file
      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${project.title || 'project'}.zip"`);
      res.send(zipBuffer);

    } catch (error) {
      console.error("ZIP generation error:", error);
      res.status(500).json({ error: "Failed to generate ZIP file" });
    }
  });

  // AI Art Generation endpoint  
  app.post("/api/generate-art", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Check user credits first (AI generation costs 2 credits)
      const user = await storage.getUser(req.userId!);
      if (!user || user.credits < 2) {
        return res.status(400).json({ 
          error: user && user.credits === 1 
            ? "Insufficient credits. AI art generation requires 2 credits." 
            : "Insufficient credits. AI art generation requires 2 credits. Please purchase more credits."
        });
      }

      const { prompt, negativePrompt, aspectRatio, category } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      console.log('Starting AI art generation with prompt:', prompt);
      
      // Generate optimized prompt for Etsy
      const optimizedPrompt = aiArtGeneratorService.generateEtsyPrompt(prompt, category);
      
      // Generate artwork using Imagen 3
      const base64Image = await aiArtGeneratorService.generateArtwork({
        prompt: optimizedPrompt,
        negativePrompt,
        aspectRatio: aspectRatio as '1:1' | '3:4' | '4:3' | '9:16' | '16:9',
      });
      
      console.log('AI art generation completed successfully');
      
      // Deduct 2 credits for AI art generation
      const newCredits = Math.max(0, user.credits - 2);
      await storage.updateUserCredits(req.userId!, newCredits);
      console.log(`💳 Deducted 2 credits for AI art generation. User ${req.userId} new balance: ${newCredits}`);
      
      res.json({ 
        image: base64Image,
        prompt: optimizedPrompt
      });
      
    } catch (error) {
      console.error("AI art generation error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate artwork" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function processProjectAsync(project: any) {
  const startTime = Date.now();
  
  console.log(`🔧 processProjectAsync called for project: ${project.id}`);
  console.log(`🔧 Project data:`, JSON.stringify(project, null, 2));
  
  try {
    console.log('🔧 Starting real image processing for:', project.id);
    
    // Import processing services
    const { SegmindService } = await import('./services/segmind');
    const { resizeImageToFormats } = await import('./services/image-processor');
    const { generateMockupsForCategory, getTemplatesForCategory } = await import('./services/mockup-templates');
    
    // Convert base64 image to buffer for processing
    const base64Data = project.originalImageUrl.split(',')[1];
    const originalBuffer = Buffer.from(base64Data, 'base64');
    
    // Step 1: Upscale image using Segmind or fallback
    console.log('Step 1: Upscaling image...');
    let upscaledImageUrl = project.originalImageUrl;
    
    try {
      if (process.env.SEGMIND_API_KEY) {
        const segmind = new SegmindService(process.env.SEGMIND_API_KEY);
        const upscaleOption = project.upscaleOption || '2x';
        const scale = upscaleOption === '4x' ? 4 : 2;
        
        const upscaledBase64 = await segmind.upscaleImage({
          scale,
          image: base64Data
        });
        
        upscaledImageUrl = `data:image/jpeg;base64,${upscaledBase64}`;
        console.log('✅ Image upscaled successfully with Segmind');
      } else {
        console.log('⚠️ Segmind API key not found, using fallback upscaler');
        throw new Error('No Segmind API key');
      }
    } catch (error) {
      console.error('❌ Segmind upscaling failed, trying fallback:', error);
      try {
        const { fallbackUpscale } = await import('./services/image-upscaler-fallback');
        const upscaleOption = project.upscaleOption || '2x';
        const scale = upscaleOption === '4x' ? 4 : 2;
        
        const upscaledBuffer = await fallbackUpscale(originalBuffer, scale);
        upscaledImageUrl = `data:image/jpeg;base64,${upscaledBuffer.toString('base64')}`;
        console.log('✅ Image upscaled successfully with fallback');
      } catch (fallbackError) {
        console.error('❌ Fallback upscaling also failed, using original:', fallbackError);
      }
    }
    
    // Step 2: Create print format sizes
    console.log('Step 2: Creating print formats...');
    const upscaledBuffer = Buffer.from(upscaledImageUrl.split(',')[1], 'base64');
    const resizedFormats = await resizeImageToFormats(upscaledBuffer);
    
    const resizedImages = Object.values(resizedFormats).map(buffer => 
      `data:image/jpeg;base64,${buffer.toString('base64')}`
    );
    
    console.log('✅ Created', resizedImages.length, 'print formats');
    
    // Step 3: Generate mockups
    console.log('Step 3: Generating mockups...');
    const mockupTemplate = project.mockupTemplate || 'living-room';
    
    const mockupImages: { [key: string]: string } = {};
    
    try {
      // Generate mockups for the selected template category
      const mockupBuffers = await generateMockupsForCategory(upscaledBuffer, mockupTemplate);
      
      for (const [mockupId, buffer] of Object.entries(mockupBuffers)) {
        mockupImages[mockupId] = `data:image/jpeg;base64,${buffer.toString('base64')}`;
      }
      
      console.log('✅ Generated', Object.keys(mockupImages).length, 'mockups');
    } catch (error) {
      console.error('❌ Mockup generation failed:', error);
      // Use upscaled image as fallback for mockups
      const templates = getTemplatesForCategory(mockupTemplate);
      for (let i = 0; i < Math.min(5, templates.length); i++) {
        const template = templates[i];
        mockupImages[template.id] = upscaledImageUrl;
      }
    }
    
    // Update project with processed assets
    await storage.updateProject(project.id, {
      upscaledImageUrl,
      mockupImageUrl: Object.values(mockupImages)[0] || upscaledImageUrl,
      mockupImages,
      resizedImages,
      zipUrl: `/api/projects/${project.id}/download-zip`,
      status: "completed"
    });

    const processingTime = Date.now() - startTime;
    console.log(`✅ Real processing completed successfully for project: ${project.id} in ${processingTime}ms`);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`🔧❌ Processing failed for project ${project.id} after ${processingTime}ms:`, error);
    console.error("🔧❌ Error details:", (error as Error).stack);
    console.error("🔧❌ Error type:", typeof error);
    console.error("🔧❌ Error message:", (error as Error).message);
    await storage.updateProject(project.id, { status: "failed" });
  }
}
