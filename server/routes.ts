import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import FormData from "form-data";
import axios from "axios";
import { Readable } from "stream";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { insertProjectSchema, insertUserSchema, insertContactMessageSchema, type Project } from "@shared/schema";
import { generateEtsyListing } from "./services/openai";
import { segmindService } from "./services/segmind";
import { aiArtGeneratorService } from "./services/ai-art-generator";
import { fallbackUpscale, base64ToBuffer, bufferToBase64 } from "./services/image-upscaler-fallback";
import { resizeImageToFormats } from "./services/image-processor";
import { generateMockupsForCategory } from "./services/mockup-templates";
import { generateProjectZip } from "./services/zip-generator";
import { AuthService, authenticateToken, optionalAuth, type AuthenticatedRequest } from "./auth";
import { comfyUIService } from "./services/comfyui-service";
import { spawn } from "child_process";

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

  // Proxy route for FastAPI template mockup generation
  app.post('/api/generate-template-mockups', upload.single('file'), async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Create FormData to forward to FastAPI
      const FormDataNode = (await import('form-data')).default;
      const formData = new FormDataNode();
      
      // Forward the uploaded file
      if (req.file) {
        formData.append('file', req.file.buffer, {
          filename: req.file.originalname || 'artwork.jpg',
          contentType: req.file.mimetype || 'image/jpeg'
        });
      }
      
      // Forward other form fields
      for (const [key, value] of Object.entries(req.body)) {
        formData.append(key, value as string);
      }

      // Forward to FastAPI service
      const response = await axios.post('http://127.0.0.1:8001/generate-template-mockups', formData, {
        headers: {
          'Authorization': authHeader,
          ...formData.getHeaders()
        },
        timeout: 300000, // 5 minutes
        validateStatus: () => true // Don't throw on non-2xx status codes
      });

      res.status(response.status).json(response.data);
      
    } catch (error) {
      console.error('❌ Proxy error:', error);
      res.status(500).json({ error: 'Template mockup service unavailable' });
    }
  });

  // Deduct credits from user account with transaction tracking
  app.post("/api/deduct-credits", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { credits, description = "Credit deduction" } = req.body;
      
      if (!credits || credits <= 0) {
        return res.status(400).json({ error: "Invalid credits amount" });
      }
      
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (user.credits < credits) {
        return res.status(400).json({ 
          error: `Insufficient credits. Required: ${credits}, Available: ${user.credits}` 
        });
      }
      
      // Use transaction-aware method for credit deduction
      const result = await storage.updateUserCreditsWithTransaction(
        req.userId!, 
        -credits, 
        "deduction", 
        description
      );
      
      console.log(`💳 Deducted ${credits} credits. User ${req.userId} new balance: ${result.newBalance}`);
      
      res.json({ 
        success: true, 
        creditsDeducted: credits,
        newBalance: result.newBalance 
      });
    } catch (error) {
      console.error("Error deducting credits:", error);
      res.status(500).json({ error: "Failed to deduct credits" });
    }
  });

  // Get credit transaction history
  app.get("/api/credit-transactions", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const transactions = await storage.getCreditTransactionsByUserId(req.userId);
      res.json(transactions);
    } catch (error) {
      console.error("Failed to get credit transactions:", error);
      res.status(500).json({ error: "Failed to get transaction history" });
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

  // Debug endpoint to manually activate subscription
  app.post("/api/debug/activate-subscription", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { planId = "pro_monthly" } = req.body;
      
      const { SubscriptionService } = await import("./subscription");
      await SubscriptionService.activateSubscription(req.userId, {
        planId: planId,
        subscriptionId: `manual-${Date.now()}`,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      });
      
      console.log(`🔧 DEBUG: Manually activated ${planId} subscription for user ${req.userId}`);
      
      res.json({ 
        success: true, 
        message: `Manually activated ${planId} subscription`,
        userId: req.userId 
      });
    } catch (error) {
      console.error("Debug subscription activation error:", error);
      res.status(500).json({ error: "Failed to activate subscription" });
    }
  });

  // Debug endpoint to simulate webhook with proper subscription data
  app.post("/api/debug/simulate-webhook", async (req, res) => {
    try {
      const { userId, reference = "test-ref", planId = "pro_monthly" } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "userId required" });
      }

      // Simulate a proper Paystack webhook payload with subscription data
      const mockWebhookPayload = {
        event: "charge.success",
        data: {
          reference: reference,
          metadata: {
            planId: planId,
            credits: "300",
            userId: userId,
          },
          subscription: {
            subscription_code: `SUB_${Date.now()}`,
            next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        }
      };

      // Process through the same logic as the webhook
      const { SubscriptionService } = await import("./subscription");
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { reference: ref, metadata, subscription } = mockWebhookPayload.data;
      
      // Activate subscription
      await SubscriptionService.activateSubscription(metadata.userId, {
        planId: metadata.planId,
        subscriptionId: subscription.subscription_code,
        startDate: new Date(),
        endDate: new Date(subscription.next_payment_date),
      });

      // Add credits
      const creditsToAdd = parseInt(metadata.credits);
      const newCredits = user.credits + creditsToAdd;
      await storage.updateUserCredits(metadata.userId, newCredits);
      
      console.log(`🔧 DEBUG: Simulated webhook activation for user ${userId}`);
      
      res.json({ 
        success: true, 
        message: "Webhook simulation completed",
        subscriptionActivated: true,
        creditsAdded: creditsToAdd,
        newCreditBalance: newCredits
      });
    } catch (error) {
      console.error("Debug webhook simulation error:", error);
      res.status(500).json({ error: "Webhook simulation failed" });
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
              password: "demo-password-hash", // Add required password field
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

  // Paystack webhook endpoint verification (GET)
  app.get("/api/webhook/paystack", (req, res) => {
    res.status(200).json({ 
      message: "Paystack webhook endpoint is active",
      url: "https://imageupscaler.app/api/webhook/paystack",
      methods: ["POST"],
      events: ["charge.success", "subscription.disable"],
      timestamp: new Date().toISOString()
    });
  });

  // Paystack webhook endpoint - matches production webhook URL configuration
  app.post("/api/webhook/paystack", async (req, res) => {
    console.log(`🔔 WEBHOOK START: ${new Date().toISOString()}`);
    console.log(`🔔 Request body keys:`, Object.keys(req.body || {}));
    console.log(`🔔 Event type:`, req.body?.event);
    
    try {
      console.log(`🔔 Webhook received: ${req.body?.event || 'unknown'} - ${new Date().toISOString()}`);
      
      const { PaystackService } = await import("./paystack");
      const { SubscriptionService } = await import("./subscription");
      const secret = process.env.PAYSTACK_SECRET_KEY;
      
      if (!secret) {
        console.error("🔔 Webhook error: No Paystack secret key configured");
        return res.status(500).json({ error: "Paystack secret key not configured" });
      }

      // Verify webhook signature
      const crypto = await import('crypto');
      const hash = crypto.createHmac('sha512', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      const providedSignature = req.headers['x-paystack-signature'];
      if (hash !== providedSignature) {
        console.error("🔔 Webhook signature mismatch:", { 
          calculated: hash.substring(0, 20) + '...', 
          provided: providedSignature?.toString().substring(0, 20) + '...' 
        });
        return res.status(400).json({ error: "Invalid signature" });
      }

      const event = req.body;
      console.log(`🔔 Webhook signature verified for event: ${event.event}`);
      
      if (event.event === 'charge.success') {
        const { reference, metadata, subscription } = event.data;
        console.log(`🔔 Processing charge.success webhook:`, {
          reference,
          hasMetadata: !!metadata,
          hasSubscription: !!subscription,
          planId: metadata?.planId,
          userId: metadata?.userId,
          subscriptionCode: subscription?.subscription_code
        });
      }
      
      if (event.event === 'charge.success') {
        const { reference, metadata, subscription } = event.data;
        
        if (metadata && metadata.userId) {
          // Get current user
          const user = await storage.getUser(metadata.userId);
          if (user) {
            // Handle subscription activation - check for both recurring and one-time subscription payments
            if (metadata.planId && (metadata.planId.includes('monthly') || metadata.planId.includes('yearly'))) {
              let subscriptionId = reference; // Use payment reference as fallback
              let endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days
              
              // If it's a recurring subscription with subscription_code, use that
              if (subscription && subscription.subscription_code) {
                subscriptionId = subscription.subscription_code;
                endDate = subscription.next_payment_date ? new Date(subscription.next_payment_date) : endDate;
              }
              
              await SubscriptionService.activateSubscription(metadata.userId, {
                planId: metadata.planId,
                subscriptionId: subscriptionId,
                startDate: new Date(),
                endDate: endDate,
              });
              console.log(`✅ Webhook: Activated subscription ${metadata.planId} for user ${metadata.userId} (${subscription?.subscription_code ? 'recurring' : 'one-time'})`);
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

  // Contact form submission endpoint
  app.post("/api/contact", async (req, res) => {
    try {
      const contactData = insertContactMessageSchema.parse(req.body);
      
      // Store the message in the database
      const contactMessage = await storage.createContactMessage(contactData);
      
      console.log(`📧 New contact message received from: ${contactData.email} - Subject: ${contactData.subject}`);
      
      // TODO: Add email notification service here if needed
      // await sendEmailNotification(contactData);
      
      res.status(201).json({ 
        success: true, 
        message: "Message sent successfully! We'll get back to you shortly.",
        id: contactMessage.id 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid form data", 
          details: error.errors 
        });
      }
      
      console.error("Contact form submission error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Get contact messages (admin only)
  app.get("/api/contact-messages", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // For now, allow any authenticated user to see messages
      // In production, you might want to restrict this to admin users
      const messages = await storage.getContactMessages();
      res.json(messages);
    } catch (error) {
      console.error("Failed to get contact messages:", error);
      res.status(500).json({ error: "Failed to get messages" });
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

      const { artworkTitle, styleKeywords, upscaleOption } = req.body;
      
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

        artworkTitle: artworkTitle || "Untitled Artwork",
        styleKeywords: styleKeywords || "digital art"
      });

      const project = await storage.createProject(projectData);
      
      // Deduct credits based on upscale option with transaction record
      await storage.updateUserCreditsWithTransaction(req.userId, -creditsRequired, 'Image Upscaling', `${upscaleOption} image upscaling`);
      console.log(`💳 Deducted ${creditsRequired} credits for ${upscaleOption} upscaling from user ${req.userId}`);
      
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

  // Generate Etsy listing for project
  app.post("/api/projects/:id/generate-listing", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Check if user owns the project
      if (project.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if user has enough credits
      const user = await storage.getUser(userId);
      if (!user || user.credits < 1) {
        return res.status(402).json({ error: "Insufficient credits. Need 1 credit for Etsy listing generation." });
      }

      // Deduct 1 credit and create transaction
      await storage.updateUserCreditsWithTransaction(
        userId, 
        -1, 
        "deduction", 
        "Etsy Listing Generation", 
        project.id
      );

      const { artworkTitle, styleKeywords } = req.body;
      const listing = await generateEtsyListing(artworkTitle, styleKeywords);
      
      await storage.updateProject(project.id, { etsyListing: listing });
      
      res.json(listing);
    } catch (error) {
      console.error("Failed to generate listing:", error);
      res.status(500).json({ error: "Failed to generate listing" });
    }
  });

  // Generate standalone Etsy listing (independent of any project)
  app.post("/api/generate-listing", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      console.log("🎯 Etsy listing generation started");
      const userId = req.userId!;
      if (!userId) {
        console.log("❌ No userId found");
        return res.status(401).json({ error: "Unauthorized" });
      }
      console.log("✅ UserId:", userId);

      // Check if user has enough credits
      const user = await storage.getUser(userId);
      console.log("👤 User lookup:", { found: !!user, credits: user?.credits });
      if (!user || user.credits < 1) {
        return res.status(402).json({ error: "Insufficient credits. Need 1 credit for Etsy listing generation." });
      }

      // Deduct 1 credit and create transaction
      console.log("💳 Deducting credits...");
      await storage.updateUserCreditsWithTransaction(
        userId, 
        -1, 
        "deduction", 
        "Standalone Etsy Listing Generation"
      );
      console.log("✅ Credits deducted successfully");

      const { artworkTitle, styleKeywords } = req.body;
      console.log("📝 Request data:", { artworkTitle, styleKeywords });
      
      console.log("🤖 Calling generateEtsyListing...");
      const listing = await generateEtsyListing(artworkTitle, styleKeywords);
      console.log("✅ Listing generated successfully:", listing);
      
      res.json(listing);
    } catch (error) {
      console.error("❌ FULL ERROR DETAILS:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown error type',
        cause: error instanceof Error ? error.cause : undefined
      });
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
  app.get("/api/projects/:id/download-zip", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project || project.status !== "completed") {
        return res.status(404).json({ error: "Project not ready for download" });
      }

      // Track download activity (informational only - no credits deducted)
      if (req.userId) {
        try {
          await storage.updateUserCreditsWithTransaction(req.userId, 0, 'Project Download', `Downloaded ${project.title || 'project'}`);
        } catch (error) {
          console.warn('Failed to record download transaction:', error);
        }
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
      
      // Deduct 2 credits for AI art generation with transaction record
      await storage.updateUserCreditsWithTransaction(req.userId!, -2, 'AI Art Generation', 'Generated AI artwork');
      console.log(`💳 Deducted 2 credits for AI art generation. User ${req.userId}`);
      
      // Create a project to preserve the AI-generated image since user paid for it
      const projectId = Math.random().toString(36).substring(2, 15);
      const project = {
        userId: req.userId!,
        title: `ai-generated-artwork`,
        originalImageUrl: `data:image/jpeg;base64,${base64Image}`,
        artworkTitle: `AI Generated - ${prompt.slice(0, 30)}${prompt.length > 30 ? '...' : ''}`, // Required field
        styleKeywords: category || 'ai-generated, digital art', // Required field
        status: 'ai-generated', // New status for AI-generated images
        upscaleOption: '2x', // Required field with default value
        thumbnailUrl: `data:image/jpeg;base64,${base64Image}`, // Use full image as thumbnail
        aiPrompt: optimizedPrompt, // Store the prompt used
        metadata: {
          category: category || 'general',
          originalPrompt: prompt,
          aspectRatio: aspectRatio || '1:1'
        }
      };
      
      await storage.createProject(project);
      console.log(`📁 Created project ${projectId} for AI-generated artwork`);
      
      res.json({ 
        image: base64Image,
        prompt: optimizedPrompt,
        projectId: projectId // Return project ID so frontend can reference it
      });
      
    } catch (error) {
      console.error("AI art generation error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate artwork" 
      });
    }
  });

  // Test pink area mockup generation endpoint
  app.post("/api/test-pink-mockup", upload.fields([
    { name: "mockup", maxCount: 1 }, 
    { name: "artwork", maxCount: 1 }
  ]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (!files.mockup || !files.artwork) {
        return res.status(400).json({ 
          error: "Both mockup template and artwork images are required" 
        });
      }

      const mockupBuffer = files.mockup[0].buffer;
      const artworkBuffer = files.artwork[0].buffer;

      console.log('🌸 Testing pink area mockup generation...');
      
      // Import the pink area mockup service
      const { generatePinkAreaMockup, testPinkAreaDetection } = await import('./services/pink-area-mockup');
      
      // First, test pink area detection
      const detectionResult = await testPinkAreaDetection(mockupBuffer);
      console.log('🌸 Pink area detection result:', {
        areasFound: detectionResult.areas.length,
        totalPixels: detectionResult.totalPixels,
        largestArea: detectionResult.largestArea ? {
          x: detectionResult.largestArea.x,
          y: detectionResult.largestArea.y,
          width: detectionResult.largestArea.width,
          height: detectionResult.largestArea.height
        } : null
      });

      if (detectionResult.areas.length === 0) {
        return res.status(400).json({
          error: "No pink areas detected in mockup template. Please ensure the template has pink-colored areas where images should be placed.",
          detected: {
            areas: 0,
            totalPixels: 0
          }
        });
      }

      // Generate the mockup with pink area replacement
      const mockupResult = await generatePinkAreaMockup(mockupBuffer, artworkBuffer);
      
      // Convert to base64 for response
      const base64Result = mockupResult.toString('base64');
      
      res.json({
        success: true,
        mockup: `data:image/jpeg;base64,${base64Result}`,
        detection: {
          areas: detectionResult.areas.length,
          totalPixels: detectionResult.totalPixels,
          largestArea: detectionResult.largestArea ? {
            x: detectionResult.largestArea.x,
            y: detectionResult.largestArea.y,
            width: detectionResult.largestArea.width,
            height: detectionResult.largestArea.height,
            pixels: detectionResult.largestArea.pixels.length
          } : null
        }
      });

    } catch (error) {
      console.error("Pink area mockup test error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate pink area mockup" 
      });
    }
  });

  // Test pink area detection only (without generating mockup)
  app.post("/api/test-pink-detection", upload.single("mockup"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Mockup template image is required" });
      }

      console.log('🌸 Testing pink area detection only...');
      
      const { testPinkAreaDetection } = await import('./services/pink-area-mockup');
      const result = await testPinkAreaDetection(req.file.buffer);
      
      res.json({
        success: true,
        areas: result.areas.map(area => ({
          x: area.x,
          y: area.y,
          width: area.width,
          height: area.height,
          pixelCount: area.pixels.length
        })),
        totalAreas: result.areas.length,
        totalPixels: result.totalPixels,
        largestArea: result.largestArea ? {
          x: result.largestArea.x,
          y: result.largestArea.y,
          width: result.largestArea.width,
          height: result.largestArea.height,
          pixelCount: result.largestArea.pixels.length
        } : null
      });

    } catch (error) {
      console.error("Pink area detection test error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to detect pink areas" 
      });
    }
  });

  // Coordinate-based placement testing endpoint
  app.post("/api/improved-pink-placement", upload.fields([
    { name: "mockup", maxCount: 1 }, 
    { name: "artwork", maxCount: 1 }
  ]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (!files.mockup || !files.artwork) {
        return res.status(400).json({ 
          error: "Both mockup template and artwork images are required" 
        });
      }

      console.log('📍 Testing coordinate-based placement (replacing improved method)...');
      
      // Parse custom coordinates from request body if provided
      let coordinates;
      if (req.body.coordinates) {
        try {
          coordinates = JSON.parse(req.body.coordinates);
          console.log('📍 Using custom coordinates:', coordinates);
        } catch (error) {
          console.log('📍 Invalid coordinates provided, using defaults');
        }
      }
      
      const { CoordinateBasedPlacer } = await import('./services/coordinate-based-placement');
      const placer = new CoordinateBasedPlacer();
      
      const result = await placer.generateCoordinateMockup(
        files.mockup[0].buffer,
        files.artwork[0].buffer,
        coordinates // Will use defaults if undefined
      );
      
      // Format response to match expected structure
      res.json({
        success: result.success,
        mockup: result.mockup,
        detection: {
          method: result.placement.method,
          areas: 1,
          totalPixels: result.placement.artworkSize.width * result.placement.artworkSize.height,
          largestArea: {
            x: result.placement.artworkPosition.x,
            y: result.placement.artworkPosition.y,
            width: result.placement.artworkSize.width,
            height: result.placement.artworkSize.height,
            pixels: result.placement.artworkSize.width * result.placement.artworkSize.height
          }
        }
      });
      
    } catch (error) {
      console.error('📍 Coordinate-based placement failed:', error);
      res.status(500).json({ 
        error: 'Failed to generate coordinate-based placement',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Coordinate-based artwork placement endpoint
  app.post("/api/coordinate-placement", upload.fields([
    { name: "mockup", maxCount: 1 }, 
    { name: "artwork", maxCount: 1 }
  ]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (!files.mockup || !files.artwork) {
        return res.status(400).json({ 
          error: "Both mockup template and artwork images are required" 
        });
      }

      console.log('📍 Testing coordinate-based placement...');
      
      // Use default coordinates from CoordinateBasedPlacer class
      const { CoordinateBasedPlacer } = await import('./services/coordinate-based-placement');
      const placer = new CoordinateBasedPlacer();
      
      const result = await placer.generateCoordinateMockup(
        files.mockup[0].buffer,
        files.artwork[0].buffer
        // No coordinates passed - will use updated defaults
      );
      
      res.json(result);
      
    } catch (error) {
      console.error('📍 Coordinate placement failed:', error);
      res.status(500).json({ 
        error: 'Failed to generate coordinate-based placement',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ComfyUI mockup generation endpoint
  app.post("/api/comfyui-mockup", optionalAuth, upload.fields([
    { name: "artwork", maxCount: 1 },
    { name: "mockupTemplate", maxCount: 1 }
  ]), async (req: AuthenticatedRequest, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (!files.artwork) {
        return res.status(400).json({ 
          error: "Artwork image is required" 
        });
      }

      // Check if user is authenticated for credit deduction
      if (!req.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      console.log('🎨 Starting ComfyUI mockup generation...');
      
      // Test connection first
      const connectionTest = await comfyUIService.testConnection();
      if (!connectionTest.success) {
        return res.status(503).json({
          error: "ComfyUI service unavailable",
          details: connectionTest.error,
          suggestion: "Please ensure your RunPod ComfyUI instance is running and accessible"
        });
      }

      console.log('🎨 ComfyUI connection successful:', connectionTest.info);

      // Prepare input for ComfyUI
      const comfyInput = {
        artworkImage: files.artwork[0].buffer,
        mockupTemplate: files.mockupTemplate ? files.mockupTemplate[0].buffer : undefined,
        prompt: req.body.prompt || "Create a professional product mockup",
        strength: parseFloat(req.body.strength) || 0.8,
        steps: parseInt(req.body.steps) || 20
      };

      // Generate mockup
      const result = await comfyUIService.generateMockup(comfyInput);
      
      if (result.success && result.mockupBuffer) {
        // Convert to base64 for response
        const mockupBase64 = result.mockupBuffer.toString('base64');
        
        res.json({
          success: true,
          mockup: `data:image/jpeg;base64,${mockupBase64}`,
          jobId: result.jobId,
          info: {
            method: 'ComfyUI Workflow',
            processingTime: 'Variable (AI generation)',
            workflowUrl: result.mockupUrl
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || "ComfyUI generation failed",
          jobId: result.jobId
        });
      }
      
    } catch (error) {
      console.error('🎨 ComfyUI endpoint error:', error);
      res.status(500).json({ 
        error: 'ComfyUI mockup generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ComfyUI test connection endpoint
  app.get("/api/comfyui-status", async (req, res) => {
    try {
      const result = await comfyUIService.testConnection();
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      });
    }
  });

  // ComfyUI FastAPI proxy endpoints
  app.get("/api/comfyui/healthz", async (req, res) => {
    try {
      // Use dynamic port detection - try 8001 first, then check other common ports
      const fastApiPort = process.env.FASTAPI_PORT || 8001;
      const fastApiUrl = `http://127.0.0.1:${fastApiPort}/healthz`;
      
      console.log(`🔗 Attempting to connect to FastAPI at ${fastApiUrl}`);
      const response = await fetch(fastApiUrl);
      const data = await response.json();
      console.log('✅ FastAPI response:', data);
      res.json(data);
    } catch (error) {
      console.error('❌ FastAPI connection error:', error);
      res.status(503).json({ error: "FastAPI service unavailable", details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Single mockup generation endpoint for sequential processing - Requires paid plan
  // Get available templates - automatically discover from filesystem
  app.get("/api/templates", async (req, res) => {
    try {
      const templateRoot = './templates';
      
      // Check if templates directory exists
      if (!fs.existsSync(templateRoot)) {
        return res.status(404).json({ 
          error: 'Templates directory not found',
          template_root: templateRoot 
        });
      }

      const templatesData = {
        template_root: templateRoot,
        exists: true,
        rooms: {} as Record<string, any[]>
      };

      // Scan all room directories
      const roomDirs = fs.readdirSync(templateRoot, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const roomName of roomDirs) {
        const roomPath = path.join(templateRoot, roomName);
        templatesData.rooms[roomName] = [];

        // Scan all template directories within the room
        const templateDirs = fs.readdirSync(roomPath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);

        for (const templateId of templateDirs) {
          const templatePath = path.join(roomPath, templateId);
          const manifestPath = path.join(templatePath, 'manifest.json');

          try {
            // Check if manifest exists
            if (!fs.existsSync(manifestPath)) {
              console.warn(`Template ${roomName}/${templateId} missing manifest.json - skipping`);
              continue;
            }

            // Read and parse manifest
            const manifestContent = fs.readFileSync(manifestPath, 'utf8');
            const manifest = JSON.parse(manifestContent);

            // Check if background image exists
            const bgPath = path.join(templatePath, manifest.background);
            const bgExists = fs.existsSync(bgPath);

            if (!bgExists) {
              console.warn(`Template ${roomName}/${templateId} missing background image: ${manifest.background} - skipping`);
              continue;
            }

            // Get image dimensions if available
            let width = 1024, height = 1024; // defaults
            try {
              const sharp = await import('sharp');
              const imageMetadata = await sharp.default(bgPath).metadata();
              width = imageMetadata.width || 1024;
              height = imageMetadata.height || 1024;
            } catch (e) {
              console.warn(`Could not read image metadata for ${roomName}/${templateId}`);
            }

            // Build template info
            const templateInfo = {
              id: templateId,
              room: roomName,
              name: manifest.name || `${roomName.replace('_', ' ')} ${templateId.replace('_', ' ')}`,
              manifest_present: true,
              bg_present: bgExists,
              preview_url: `/api/templates/preview/${roomName}/${templateId}`,
              corners: manifest.corners || [[100, 100], [400, 100], [400, 400], [100, 400]],
              width,
              height,
              ...(manifest.description && { description: manifest.description }),
              ...(manifest.tags && { tags: manifest.tags })
            };

            templatesData.rooms[roomName].push(templateInfo);

          } catch (error) {
            console.error(`Error processing template ${roomName}/${templateId}:`, error);
            continue;
          }
        }

        // Sort templates within each room by id
        templatesData.rooms[roomName].sort((a, b) => a.id.localeCompare(b.id));
      }

      console.log(`📂 Discovered ${Object.keys(templatesData.rooms).length} room categories with templates:`, 
        Object.entries(templatesData.rooms).map(([room, templates]) => `${room}: ${templates.length}`).join(', '));

      res.json(templatesData);

    } catch (error) {
      console.error('Template discovery error:', error);
      res.status(500).json({ error: 'Failed to discover templates' });
    }
  });

  // Serve template preview images
  app.get("/api/templates/preview/:room/:templateId", (req, res) => {
    try {
      const { room, templateId } = req.params;
      
      const templatePath = path.join('./templates', room, templateId);
      const manifestPath = path.join(templatePath, 'manifest.json');
      
      if (!fs.existsSync(manifestPath)) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestContent);
      const bgFile = manifest.background || '';
      const bgPath = path.join(templatePath, bgFile);
      
      if (!fs.existsSync(bgPath)) {
        return res.status(404).json({ error: "Background image not found" });
      }
      
      res.sendFile(path.resolve(bgPath));
    } catch (error) {
      console.error("Template preview error:", error);
      res.status(500).json({ error: "Failed to serve template preview" });
    }
  });

  // Apply artwork to selected templates
  app.post("/api/apply-templates", authenticateToken, upload.single("file"), async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Parse selected templates from request first
      const selectedTemplates = JSON.parse(req.body.templates || "[]");
      
      // Get user and check subscription status
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Free users get unlimited mockups (limited only by credits), paid users get premium service
      const isFreeUser = !user.subscriptionPlan || user.subscriptionPlan === 'free' || user.subscriptionStatus !== 'active';
      const creditCost = isFreeUser ? 1 : 3; // Free users pay 1 credit per mockup, paid users pay 3 for premium service
      const maxTemplates = 5; // All users can select up to 5 templates

      // Check template limit (same for all users)
      if (selectedTemplates.length > maxTemplates) {
        return res.status(400).json({ 
          error: `Template limit exceeded`, 
          message: `Maximum ${maxTemplates} templates allowed`,
          maxTemplates
        });
      }

      // Check if user has enough credits
      const totalCreditsNeeded = creditCost * selectedTemplates.length;
      if (user.credits < totalCreditsNeeded) {
        return res.status(402).json({ 
          error: "Insufficient credits", 
          message: isFreeUser 
            ? `Free mockup generation costs ${creditCost} credit each. You need ${totalCreditsNeeded} credits for ${selectedTemplates.length} mockups.`
            : `Template mockup generation costs ${creditCost} credits each. You need ${totalCreditsNeeded} credits for ${selectedTemplates.length} mockups.`,
          creditsNeeded: totalCreditsNeeded,
          currentCredits: user.credits,
          creditCost: creditCost
        });
      }
      if (!Array.isArray(selectedTemplates) || selectedTemplates.length === 0) {
        return res.status(400).json({ error: "No templates selected" });
      }

      // Template limit is now checked above based on user plan

      const templateApiPort = process.env.TEMPLATE_API_PORT || 8003;
      const mockups: Array<{ template: { room: string; id: string; name: string }; image_data: string }> = [];

      // Generate mockup for each selected template
      for (const template of selectedTemplates) {
        try {
          console.log(`🎨 Generating mockup for ${template.room}/${template.id}`);
          
          // Use Python subprocess to call your exact template API logic
          try {
            
            console.log(`Processing mockup for ${template.room}/${template.id} with parameters: margin_px=0, feather_px=-1, opacity=-1, fit=cover`);

            // Create temporary file for artwork
            const tempArtworkPath = path.join(process.cwd(), `temp_artwork_${Date.now()}.jpg`);
            fs.writeFileSync(tempArtworkPath, req.file.buffer);

            // Call Python script with your exact logic
            const pythonResult = await new Promise<any>((resolve, reject) => {
              const python = spawn('python3', ['-c', `
import sys, json, io, os, math, hashlib, base64
from pathlib import Path
import numpy as np
import cv2
from PIL import Image, ImageOps

# Your exact helper functions
def _load_manifest(room, template_id):
    template_root = Path("./templates")
    room_dir = template_root / room
    if not room_dir.exists():
        raise Exception(f"Room folder not found: {room_dir}")
    tdir = room_dir / template_id
    if not tdir.exists():
        raise Exception(f"Template '{template_id}' not found under {room_dir}")
    
    mpath = tdir / "manifest.json"
    if not mpath.exists():
        raise Exception(f"manifest.json missing in {tdir}")
    
    try:
        manifest = json.loads(mpath.read_text())
    except Exception as e:
        raise Exception(f"manifest.json not valid JSON: {e}")
    
    bg_name = manifest.get("background")
    if not bg_name:
        raise Exception("manifest.json missing 'background'")
    bg_path = tdir / bg_name
    if not bg_path.exists():
        raise Exception(f"Background not found: {bg_path}")
    
    corners = manifest.get("corners")
    if not (isinstance(corners, list) and len(corners) == 4):
        raise Exception("manifest.json 'corners' must be 4 points [TL,TR,BR,BL]")
    
    return manifest, bg_path

def _fit_size(src_w, src_h, dst_w, dst_h, mode):
    r_src = src_w / src_h
    r_dst = dst_w / dst_h
    if mode == "cover":
        if r_src < r_dst:
            w = dst_w; h = int(round(w / r_src))
        else:
            h = dst_h; w = int(round(h * r_src))
    else:
        if r_src > r_dst:
            w = dst_w; h = int(round(w / r_src))
        else:
            h = dst_h; w = int(round(h * r_src))
    return w, h

def _pil_to_np(img):
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    arr = np.array(img)
    bgr = cv2.cvtColor(arr, cv2.COLOR_RGBA2BGRA)
    return bgr

def _np_to_pil(arr):
    rgba = cv2.cvtColor(arr, cv2.COLOR_BGRA2RGBA)
    return Image.fromarray(rgba)

def _polygon_mask(shape_hw, polygon, feather_px):
    h, w = shape_hw
    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.fillConvexPoly(mask, polygon.astype(np.int32), 255)
    if feather_px and feather_px > 0:
        k = max(1, int(round(feather_px)) | 1)
        mask = cv2.GaussianBlur(mask, (k, k), 0)
    return mask

def _blend(bg_bgra, fg_bgra, mask, mode, opacity):
    opacity = max(0.0, min(1.0, float(opacity)))
    a = (mask.astype(np.float32) / 255.0) * opacity
    a3 = np.dstack([a, a, a, a])
    
    if mode == "multiply":
        bg_rgb = bg_bgra[..., :3].astype(np.float32) / 255.0
        fg_rgb = fg_bgra[..., :3].astype(np.float32) / 255.0
        mul_rgb = bg_rgb * fg_rgb
        out_rgb = mul_rgb * a[..., None] + bg_rgb * (1.0 - a[..., None])
        out_a = np.clip(bg_bgra[..., 3].astype(np.float32)/255.0 + a - bg_bgra[..., 3].astype(np.float32)/255.0 * a, 0, 1)
        out = np.dstack([np.clip(out_rgb*255,0,255).astype(np.uint8), (out_a*255).astype(np.uint8)])
        return out
    
    fg = fg_bgra.astype(np.float32)
    bg = bg_bgra.astype(np.float32)
    out = (fg * a3 + bg * (1.0 - a3)).astype(np.uint8)
    return out

# Main processing function
def process_mockup(artwork_path, room, template_id):
    try:
        manifest, bg_path = _load_manifest(room, template_id)
        
        with Image.open(bg_path) as P:
            bg = P.convert("RGBA")
        
        bg_w, bg_h = bg.size
        corners = manifest["corners"]
        TL, TR, BR, BL = [tuple(map(float, p)) for p in corners]
        
        with Image.open(artwork_path) as art_img:
            art = art_img.convert("RGBA")
            art = ImageOps.exif_transpose(art)
        
        dst_w = math.dist(TL, TR)
        dst_h = math.dist(TL, BL)
        
        mx = 0  # margin_px = 0
        dst_quad = np.array([TL, TR, BR, BL], dtype=np.float32)
        
        aw, ah = art.size
        sw, sh = _fit_size(aw, ah, int(round(dst_w))-2*mx, int(round(dst_h))-2*mx, "cover")
        
        art_resized = art.resize((max(1,sw), max(1,sh)), Image.LANCZOS)
        
        canvas_w = int(round(dst_w))
        canvas_h = int(round(dst_h))
        art_canvas = Image.new("RGBA", (canvas_w, canvas_h), (0,0,0,0))
        ox = (canvas_w - sw)//2
        oy = (canvas_h - sh)//2
        ox = max(0, ox + (mx if sw <= canvas_w-2*mx else 0))
        oy = max(0, oy + (mx if sh <= canvas_h-2*mx else 0))
        art_canvas.paste(art_resized, (ox, oy), art_resized)
        
        src_quad = np.array([[0,0],[canvas_w,0],[canvas_w,canvas_h],[0,canvas_h]], dtype=np.float32)
        H, ok = cv2.findHomography(src_quad, dst_quad, method=0)
        
        bg_bgra = _pil_to_np(bg)
        art_bgra = _pil_to_np(art_canvas)
        warped = cv2.warpPerspective(art_bgra, H, (bg_w, bg_h), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_TRANSPARENT)
        
        feather_px = manifest.get("feather_px", 0)
        quad_mask = _polygon_mask((bg_h, bg_w), dst_quad, feather_px)
        opacity_val = manifest.get("blend", {}).get("opacity", 1.0)
        blend_mode = manifest.get("blend", {}).get("mode", "normal").lower()
        
        composed = _blend(bg_bgra, warped, quad_mask, blend_mode, opacity_val)
        out_img = _np_to_pil(composed)
        
        buf = io.BytesIO()
        out_img.save(buf, "PNG")
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        
        result = {"image_b64": b64, "w": bg_w, "h": bg_h}
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))

# Execute
if len(sys.argv) >= 4:
    process_mockup(sys.argv[1], sys.argv[2], sys.argv[3])
else:
    process_mockup("${tempArtworkPath}", "${template.room}", "${template.id}")
`]);

              let output = '';
              let error = '';

              python.stdout.on('data', (data: any) => {
                output += data.toString();
              });

              python.stderr.on('data', (data: any) => {
                error += data.toString();
              });

              python.on('close', (code: any) => {
                // Clean up temp file
                try {
                  fs.unlinkSync(tempArtworkPath);
                } catch (e) {
                  // Ignore cleanup errors
                }

                if (code !== 0) {
                  reject(new Error(`Python process failed: ${error}`));
                  return;
                }

                try {
                  const result = JSON.parse(output.trim());
                  resolve(result);
                } catch (e) {
                  reject(new Error(`Failed to parse Python output: ${output}`));
                }
              });
            });

            if (pythonResult?.error) {
              throw new Error(pythonResult.error);
            }

            if (pythonResult?.image_b64) {
              mockups.push({
                template: {
                  room: template.room,
                  id: template.id,
                  name: template.name || `${template.room}_${template.id}`
                },
                image_data: `data:image/png;base64,${pythonResult.image_b64}`
              });
              console.log(`✅ Generated mockup via Python processor for ${template.room}/${template.id}`);
            } else {
              console.error(`No image_b64 returned for ${template.room}/${template.id}`);
            }
            
          } catch (processorError: any) {
            console.error(`Python processor failed for ${template.room}/${template.id}:`, processorError.message);
          }
          
        } catch (templateError) {
          console.error(`Error generating template ${template.room}/${template.id}:`, templateError);
        }
      }

      if (mockups.length === 0) {
        return res.status(500).json({ error: "Failed to generate any mockups" });
      }

      // Deduct credits and log transaction
      const actualCreditsUsed = creditCost * mockups.length;
      await storage.updateUser(userId, { 
        credits: user.credits - actualCreditsUsed 
      });

      // Log the transaction
      await storage.logCreditTransaction({
        userId,
        type: 'debit',
        amount: actualCreditsUsed,
        description: isFreeUser 
          ? `Free mockup generation (${mockups.length} templates × ${creditCost} credit each)`
          : `Premium mockup generation (${mockups.length} templates × ${creditCost} credits each)`,
        balanceAfter: user.credits - actualCreditsUsed
      });

      res.json({
        mockups,
        total_generated: mockups.length,
        credits_used: actualCreditsUsed,
        remaining_credits: user.credits - actualCreditsUsed,
        plan_type: isFreeUser ? 'free' : 'paid',
        note: isFreeUser 
          ? "Free users get unlimited mockups at 1 credit each (limited only by your 100 monthly credits). Upgrade to Pro for premium templates!"
          : "Generated with premium template-based system for perfect artwork preservation"
      });

    } catch (error) {
      console.error("Template mockup generation error:", error);
      if (axios.isAxiosError(error) && error.response) {
        res.status(error.response.status).json({ error: error.response.data });
      } else {
        res.status(500).json({ 
          error: error instanceof Error ? error.message : "Template mockup generation failed" 
        });
      }
    }
  });



  app.post("/api/comfyui/generate", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      // Use form-data package for proper multipart handling
      const formData = new FormData();
      
      // Append buffer directly - form-data handles buffer-to-stream conversion internally
      formData.append('file', req.file.buffer, {
        filename: req.file.originalname || 'artwork.jpg',
        contentType: req.file.mimetype || 'image/jpeg',
        knownLength: req.file.buffer.length
      });
      
      // Add other form fields with defaults
      const formFields = {
        prompt: req.body.prompt || 'Modern bedroom with framed artwork on wall',
        negative: req.body.negative || 'blurry, low detail, distorted',
        canvas_w: req.body.canvas_w || '1024',
        canvas_h: req.body.canvas_h || '1024', 
        art_w: req.body.art_w || '512',
        art_h: req.body.art_h || '512',
        pos_x: req.body.pos_x || '256',
        pos_y: req.body.pos_y || '256',
        steps: req.body.steps || '20',
        cfg: req.body.cfg || '6.5',
        seed: req.body.seed || '1234567',
        poll_seconds: req.body.poll_seconds || '60'
      };

      Object.entries(formFields).forEach(([key, value]) => {
        formData.append(key, value);
      });

      const fastApiPort = process.env.FASTAPI_PORT || 8001;
      
      // Use axios for proper form-data handling
      const response = await axios.post(`http://127.0.0.1:${fastApiPort}/generate`, formData, {
        headers: formData.getHeaders(),
        timeout: 120000 // 2 minute timeout for AI processing
      });

      const data = response.data;
      
      // Transform FastAPI response to frontend format
      if (data.result && data.result.status === 'COMPLETED') {
        // Extract image data from RunPod response
        const output = data.result.output;
        if (output && output.images && output.images.length > 0) {
          const imageData = output.images[0];
          const base64Data = imageData.data;
          
          // Convert to proper data URL format
          const dataUrl = `data:image/png;base64,${base64Data}`;
          
          res.json({
            success: true,
            mockup: dataUrl,
            jobId: data.job_id,
            info: {
              method: "RunPod ComfyUI",
              processingTime: "Generated successfully",
              filename: imageData.filename || "bedroom_mockup.png"
            }
          });
        } else {
          res.json({
            success: false,
            error: "No image data in completed result",
            jobId: data.job_id
          });
        }
      } else if (data.result && data.result.status === 'FAILED') {
        res.json({
          success: false,
          error: data.result.error || "ComfyUI generation failed",
          jobId: data.job_id
        });
      } else {
        res.json({
          success: false,
          error: "Unexpected response format from ComfyUI service",
          details: data
        });
      }
    } catch (error) {
      console.error("ComfyUI generate proxy error:", error);
      res.status(500).json({ 
        error: "Failed to proxy request to ComfyUI service",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/comfyui/batch", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      // Use form-data package for proper multipart handling  
      const formData = new FormData();
      
      // Append buffer directly - form-data handles buffer-to-stream conversion internally
      formData.append('file', req.file.buffer, {
        filename: req.file.originalname || 'artwork.jpg',
        contentType: req.file.mimetype || 'image/jpeg',
        knownLength: req.file.buffer.length
      });
      
      // Add other form fields with defaults
      const formFields = {
        canvas_w: req.body.canvas_w || '1024',
        canvas_h: req.body.canvas_h || '1024', 
        art_w: req.body.art_w || '512',
        art_h: req.body.art_h || '512',
        pos_x: req.body.pos_x || '256',
        pos_y: req.body.pos_y || '256',
        steps: req.body.steps || '20',
        cfg: req.body.cfg || '6.5',
        seed: req.body.seed || '1234567',
        poll_seconds: req.body.poll_seconds || '90',
        prompts: req.body.prompts || ''
      };

      Object.entries(formFields).forEach(([key, value]) => {
        formData.append(key, value);
      });

      const fastApiPort = process.env.FASTAPI_PORT || 8001;
      
      // Use axios for proper form-data handling
      const response = await axios.post(`http://127.0.0.1:${fastApiPort}/batch`, formData, {
        headers: formData.getHeaders(),
        timeout: 180000 // 3 minute timeout for batch processing
      });

      res.json(response.data);
    } catch (error) {
      console.error("ComfyUI batch proxy error:", error);
      res.status(500).json({ 
        error: "Failed to proxy batch request to ComfyUI service",
        details: error instanceof Error ? error.message : 'Unknown error'
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
    
    // Update project with processed assets
    await storage.updateProject(project.id, {
      upscaledImageUrl,
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
