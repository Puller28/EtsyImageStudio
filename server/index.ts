import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { spawn, ChildProcess } from "child_process";

// Global state for application readiness
let isDbReady = false;
let isAppReady = false;
let fastApiProcess: ChildProcess | null = null;
let fastApiReady = false;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check endpoint for Autoscale readiness
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    database: isDbReady ? "ready" : "initializing",
    application: isAppReady ? "ready" : "starting",
    fastapi: fastApiReady ? "ready" : "starting",
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
      
      // Add new columns to projects table for AI-generated images
      await db.execute(sql`
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
      `);
      await db.execute(sql`
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS ai_prompt TEXT;
      `);
      await db.execute(sql`
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
      `);
      await db.execute(sql`
        ALTER TABLE projects ALTER COLUMN upscale_option SET DEFAULT '2x';
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

// FastAPI Process Management (conditional for deployment)
async function startFastApiServer() {
  return new Promise<void>((resolve, reject) => {
    // Skip FastAPI in production deployment to avoid port conflicts
    // Check for production environment using multiple indicators
    const isProduction = process.env.NODE_ENV === 'production' || 
                        process.env.REPLIT_DEPLOYMENT === '1' ||
                        process.env.REPL_DEPLOYMENT === '1' ||
                        !process.env.REPLIT_DEV_DOMAIN;
    
    if (isProduction) {
      console.log('🚀 Skipping FastAPI server in production deployment');
      console.log('🔍 Production Environment Detected:', {
        NODE_ENV: process.env.NODE_ENV,
        REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT,
        REPL_DEPLOYMENT: process.env.REPL_DEPLOYMENT,
        has_REPLIT_DEV_DOMAIN: !!process.env.REPLIT_DEV_DOMAIN
      });
      fastApiReady = false;
      resolve();
      return;
    }
    
    console.log('🚀 Starting FastAPI server...');
    
    const env = { ...process.env };
    env.PORT = '8001';
    env.MOCK_MODE = 'false'; // Enable real RunPod with fixed workflow
    
    fastApiProcess = spawn('uvicorn', [
      'app:app',
      '--host', '0.0.0.0', 
      '--port', '8001',
      '--workers', '1',
      '--no-access-log'
    ], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

    if (fastApiProcess.stdout) {
      fastApiProcess.stdout.on('data', (data) => {
        const message = data.toString().trim();
        if (message.includes('Uvicorn running on') || message.includes('Application startup complete')) {
          fastApiReady = true;
          console.log('✅ FastAPI server ready on port 8001');
          resolve();
        }
        if (message) console.log(`[FastAPI] ${message}`);
      });
    }

    if (fastApiProcess.stderr) {
      fastApiProcess.stderr.on('data', (data) => {
        const message = data.toString().trim();
        if (message) console.error(`[FastAPI Error] ${message}`);
      });
    }

    fastApiProcess.on('exit', (code, signal) => {
      fastApiReady = false;
      console.log(`⚠️  FastAPI process exited with code ${code}, signal ${signal}`);
      
      // Auto-restart after 2 seconds if it wasn't killed intentionally
      if (code !== 0 && signal !== 'SIGTERM') {
        setTimeout(() => {
          console.log('🔄 Restarting FastAPI server...');
          startFastApiServer().catch(console.error);
        }, 2000);
      }
    });

    fastApiProcess.on('error', (error) => {
      console.error('❌ FastAPI process error:', error.message);
      fastApiReady = false;
      reject(error);
    });

    // Timeout if server doesn't start within 30 seconds
    setTimeout(() => {
      if (!fastApiReady) {
        console.log('⚠️  FastAPI startup timeout, continuing anyway...');
        resolve();
      }
    }, 30000);
  });
}

// Cleanup function
function cleanup() {
  console.log('🛑 Shutting down FastAPI server...');
  if (fastApiProcess && !fastApiProcess.killed) {
    fastApiProcess.kill('SIGTERM');
    fastApiProcess = null;
    fastApiReady = false;
  }
}

// Handle process cleanup
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

(async () => {

  // Start database initialization in the background (non-blocking)
  initializeDatabase().catch(err => {
    console.error('Database initialization failed:', err);
  });

  // Start FastAPI server in the background (non-blocking)
  startFastApiServer().catch(err => {
    console.error('FastAPI server startup failed:', err);
  });

  // Add canonical URL redirect middleware (www -> non-www)
  app.use((req, res, next) => {
    const host = req.get('host');
    
    // Only apply redirects in production or when host matches imageupscaler.app
    if (host && (host.startsWith('www.imageupscaler.app') || 
                host.startsWith('www.') && host.includes('imageupscaler'))) {
      const canonicalHost = host.replace('www.', '');
      const canonicalUrl = `https://${canonicalHost}${req.url}`;
      
      console.log(`🔀 Redirecting www.${canonicalHost} to ${canonicalHost}`);
      return res.redirect(301, canonicalUrl);
    }
    
    // Set canonical URL header for all requests
    if (host && host.includes('imageupscaler')) {
      const canonicalHost = host.replace('www.', '');
      const canonicalUrl = `https://${canonicalHost}${req.path}`;
      res.set('Link', `<${canonicalUrl}>; rel="canonical"`);
    }
    
    next();
  });

  // Register routes immediately (don't wait for database or FastAPI)
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
    // Add cache-busting middleware for production
    app.use((req, res, next) => {
      if (req.url.includes('.js') || req.url.includes('.css') || req.url.includes('.html')) {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
      }
      next();
    });
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
