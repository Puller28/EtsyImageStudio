# Migration Guide: Moving from Replit to Other Development Environments

This guide will help you move your Etsy Art & Image Upscaler Pro application from Replit to run in other IDEs like VS Code, WebStorm, or other development environments.

## Prerequisites

Before starting, ensure you have these installed on your local machine:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** package manager (comes with Node.js)
- **PostgreSQL** database (local or cloud-hosted)
- **Git** for version control

## Step 1: Download Your Code

### From Replit:
1. Open your Replit project
2. Click the three dots menu (⋯) in the file explorer
3. Select "Download as ZIP" 
4. Extract the ZIP file to your desired local directory

### Alternative via Git:
```bash
git clone https://github.com/yourusername/your-repo-name.git
cd your-repo-name
```

## Step 2: Environment Setup

### 2.1 Create Environment Variables File
Create a `.env` file in your project root with the following variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/your_database_name
PGHOST=localhost
PGPORT=5432
PGUSER=your_username
PGPASSWORD=your_password
PGDATABASE=your_database_name

# JWT Secret (generate a strong random string)
JWT_SECRET=your_jwt_secret_here

# API Keys (you'll need to obtain these)
OPENAI_API_KEY=your_openai_api_key
SEGMIND_API_KEY=your_segmind_api_key

# Payment Processing
PAYSTACK_SECRET_KEY=your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=your_paystack_public_key

# External Services
RUNPOD_API_KEY=your_runpod_api_key
RUNPOD_ENDPOINT=your_runpod_endpoint

# Production Settings
NODE_ENV=development
PORT=5000
```

### 2.2 Secure Your Environment File
Add `.env` to your `.gitignore` file to prevent committing sensitive data:

```bash
echo ".env" >> .gitignore
```

## Step 3: Database Setup

### Option A: Local PostgreSQL
1. Install PostgreSQL locally
2. Create a new database:
```sql
CREATE DATABASE etsy_art_upscaler;
```
3. Update your `.env` file with local database credentials

### Option B: Cloud Database (Recommended)
Use a cloud PostgreSQL service like:
- **Supabase** (free tier available)
- **Railway** 
- **PlanetScale**
- **Neon**

## Step 4: Install Dependencies

```bash
# Install all project dependencies
npm install

# Install development dependencies
npm install --save-dev
```

### 4.1 Remove Replit-Specific Dependencies
Edit your `package.json` and remove these Replit-specific packages:

```json
{
  "devDependencies": {
    // Remove these lines:
    "@replit/vite-plugin-cartographer": "^0.2.8",
    "@replit/vite-plugin-runtime-error-modal": "^0.0.3"
  }
}
```

Then run:
```bash
npm install
```

## Step 5: Update Configuration Files

### 5.1 Update Vite Configuration
Edit `vite.config.ts` and remove Replit-specific plugins:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    // Remove Replit-specific plugins
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
      "@assets": path.resolve(__dirname, "./attached_assets"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist/client",
  },
});
```

### 5.2 Update Server Configuration
Edit `server/index.ts` to remove Replit-specific code and update for local development:

```typescript
// Remove any Replit-specific imports or authentication
// Update port configuration to use environment variables

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
```

## Step 6: Database Migration

### 6.1 Run Database Migrations
```bash
# Push database schema
npm run db:push

# Alternative: Generate and run migrations
npx drizzle-kit generate
npx drizzle-kit migrate
```

## Step 7: Update Package.json Scripts

Update your `package.json` scripts for local development:

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "NODE_ENV=development tsx server/index.ts",
    "dev:client": "vite",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

Install concurrently for running both server and client:
```bash
npm install --save-dev concurrently
```

## Step 8: File Storage Updates

### 8.1 Remove Object Storage Dependencies
If you were using Replit's object storage, you'll need to:

1. **Remove object storage code** from `server/objectStorage.ts`
2. **Replace with local file storage** or cloud storage (AWS S3, Cloudinary, etc.)
3. **Update upload endpoints** to handle local file storage

### 8.2 Local File Storage Setup
Create a simple local file storage service:

```typescript
// server/localStorage.ts
import path from 'path';
import fs from 'fs/promises';

export class LocalStorage {
  private uploadsDir = path.join(process.cwd(), 'uploads');

  async ensureUploadsDir() {
    try {
      await fs.access(this.uploadsDir);
    } catch {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    }
  }

  async saveFile(buffer: Buffer, filename: string): Promise<string> {
    await this.ensureUploadsDir();
    const filePath = path.join(this.uploadsDir, filename);
    await fs.writeFile(filePath, buffer);
    return `/uploads/${filename}`;
  }
}
```

## Step 9: Start Development

### 9.1 Start the Application
```bash
# Start both frontend and backend
npm run dev

# Or start separately:
# Terminal 1: Backend
npm run dev:server

# Terminal 2: Frontend  
npm run dev:client
```

### 9.2 Verify Everything Works
1. Open `http://localhost:3000` in your browser
2. Test user registration/login
3. Test image uploads and processing
4. Check database connections

## Step 10: Production Deployment

### For Vercel/Netlify (Frontend + Serverless):
1. Deploy frontend to Vercel
2. Deploy API routes as serverless functions
3. Use cloud database (Supabase, PlanetScale)

### For VPS/Cloud Server:
1. Use PM2 for process management
2. Set up Nginx as reverse proxy
3. Configure SSL certificates
4. Set up database backups

## Common Issues & Solutions

### Issue 1: Database Connection Errors
**Solution:** Verify your database credentials and ensure the database server is running.

### Issue 2: Missing Environment Variables
**Solution:** Double-check your `.env` file and ensure all required variables are set.

### Issue 3: Port Conflicts
**Solution:** Change ports in your configuration files if 3000 or 5000 are already in use.

### Issue 4: Build Errors
**Solution:** Clear node_modules and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue 5: File Upload Issues
**Solution:** Ensure upload directories exist and have proper permissions:
```bash
mkdir -p uploads
chmod 755 uploads
```

## VS Code Recommended Extensions

Install these extensions for the best development experience:

- **ES7+ React/Redux/React-Native snippets**
- **Prettier - Code formatter**
- **ESLint**
- **Auto Rename Tag**
- **Bracket Pair Colorizer**
- **GitLens**
- **Thunder Client** (for API testing)

## Additional Notes

### API Keys Required:
You'll need to obtain these API keys:
- **OpenAI API Key** - For AI content generation
- **Segmind API Key** - For image upscaling
- **Paystack API Keys** - For payment processing
- **RunPod API Key** - For ComfyUI workflows

### Performance Considerations:
- Use a cloud database for better performance
- Consider using Redis for session storage
- Implement proper caching strategies
- Use CDN for static assets

### Security:
- Always use HTTPS in production
- Keep dependencies updated
- Use proper CORS configuration
- Implement rate limiting
- Use secure session configuration

This migration guide should help you successfully move your application from Replit to any other development environment. If you encounter issues, check the logs for specific error messages and ensure all environment variables are properly configured.