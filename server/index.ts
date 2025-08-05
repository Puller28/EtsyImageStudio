import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db";
import { sql } from "drizzle-orm";

// Global state for application readiness
let isDbReady = false;
let isAppReady = false;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check endpoint for Autoscale readiness
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    database: isDbReady ? "ready" : "initializing",
    application: isAppReady ? "ready" : "starting",
    timestamp: new Date().toISOString()
  });
});

// Simple readiness endpoint for load balancers
app.get("/ready", (req, res) => {
  if (isAppReady) {
    res.status(200).json({ status: "ready" });
  } else {
    res.status(503).json({ status: "not ready" });
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Async function for database initialization (non-blocking)
async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database tables...');
    
    // Set timeout for database operations to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database initialization timeout')), 30000);
    });
    
    const initPromise = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          avatar TEXT,
          credits INTEGER NOT NULL DEFAULT 100,
          created_at TIMESTAMP DEFAULT now()
        )
      `);
      
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS projects (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR NOT NULL REFERENCES users(id),
          title TEXT NOT NULL,
          original_image_url TEXT NOT NULL,
          upscaled_image_url TEXT,
          mockup_image_url TEXT,
          mockup_images JSONB,
          resized_images JSONB DEFAULT '[]'::jsonb,
          etsy_listing JSONB,
          mockup_template TEXT,
          upscale_option TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'uploading',
          zip_url TEXT,
          created_at TIMESTAMP DEFAULT now()
        )
      `);
      
      // Add processed_payments table for payment idempotency
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS processed_payments (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          payment_reference TEXT NOT NULL UNIQUE,
          user_id VARCHAR NOT NULL REFERENCES users(id),
          credits_allocated INTEGER NOT NULL,
          processed_at TIMESTAMP DEFAULT now()
        )
      `);
      
      // Add subscription columns to users table if they don't exist
      await db.execute(sql`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free';
      `);
      await db.execute(sql`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT;
      `);
      await db.execute(sql`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id TEXT;
      `);
      await db.execute(sql`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP;
      `);
      await db.execute(sql`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP;
      `);
    })();
    
    await Promise.race([initPromise, timeoutPromise]);
    
    isDbReady = true;
    console.log('✅ Database tables initialized successfully');
  } catch (error: any) {
    console.error('❌ Database initialization failed:', error.message);
    console.log('⚠️  Application will continue with limited functionality');
    // Don't set isDbReady to true, but don't crash the app
  }
}

(async () => {

  // Start database initialization in the background (non-blocking)
  initializeDatabase().catch(err => {
    console.error('Database initialization failed:', err);
  });

  // Register routes immediately (don't wait for database)
  const server = await registerRoutes(app);

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Setup Vite or static file serving
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Mark application as ready for health checks
  isAppReady = true;

  // Start server immediately (don't wait for database)
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    console.log(`🚀 Application ready on port ${port}`);
    console.log(`📋 Health check available at http://localhost:${port}/health`);
  });
})();
