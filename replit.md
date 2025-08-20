# Etsy Art & Image Upscaler Pro

## Overview
Etsy Art & Image Upscaler Pro is a comprehensive AI-powered web application designed for digital artists and Etsy sellers to automate their complete artwork workflow. The platform streamlines everything from AI art generation and professional image upscaling to marketplace-ready assets. Key capabilities include AI image creation, advanced upscaling up to 4x resolution, print format resizing, professional mockup generation, and AI-powered Etsy SEO content creation. Users can generate AI artwork or upload existing images to receive a complete package of optimized images and marketing content ready for Etsy listing. The vision is to empower digital artists with automation, enabling them to scale their businesses and focus on creativity, perfectly suited for deployment at imageupscaler.app.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes
- **Enhanced Plan Differentiation (August 20, 2025)**: Implemented meaningful limits and upgrades: Free users limited to 5 mockup sets (25 mockups total) with 2x upscaling only and basic Etsy listings. Pro users get unlimited mockups, 4x upscaling, and complete Etsy listings with tags. Business users get commercial rights and bulk processing. This creates clear upgrade incentives and value propositions.
- **Updated Pricing Plans (August 20, 2025)**: Updated all subscription plan descriptions to reflect unified mockup pricing. All plans now include "Automated mockup generation" as a standard feature with natural scaling based on credit allocation per plan.
- **Automatic Template Discovery System (August 20, 2025)**: Implemented dynamic filesystem scanning for template discovery. The system now automatically detects new templates added to the `./templates` directory structure without requiring code changes. Templates are discovered by scanning room folders, validating manifest.json files, and checking for background images. New templates automatically appear on the website template selector once added to the filesystem.
- **Local Template API Integration (August 20, 2025)**: Successfully integrated user's complete local template API code directly into Express server using Python subprocess execution. The system now uses exact OpenCV homography transformation with parameters: margin_px=0, feather_px=-1, opacity=-1, fit=cover. This eliminated external API dependency issues and provides reliable mockup generation with proper perspective transformation for complex templates like bedroom_02.
- **Template-Based Mockup System (August 20, 2025)**: Completely redesigned mockup generation to use a template-based corner-point mapping system. Users now select up to 5 templates from different room categories (living_room, bedroom, study) and artwork is placed using Sharp image processing with 'cover' fit mode for full frame coverage. Reduced credit cost from 5 to 3 credits per mockup set due to improved efficiency and cost-effectiveness over AI outpainting.
- **Critical Mockup Quality Fix (August 17, 2025)**: Reverted to proven working Render API (`https://mockup-api-cv83.onrender.com`) for perfect artwork preservation. OpenAI's image editing API was modifying faces/artwork even with masking, so we restored the external API that was confirmed to preserve artwork pixels exactly as-is. Both single and template mockup generation now use proven working API for authentic artwork quality.
- **Client-Side File Size Validation (August 16, 2025)**: Implemented 5MB file size limits on all image upload components with user-friendly error messages. Both drag-and-drop and file input uploads now prevent oversized files and show clear error messages with actual file size vs. limit.
- **Production Deployment Configuration (August 16, 2025)**: Updated Paystack plan IDs to production codes for live deployment. Pro Plan: PLN_0yglvnu9bd129yz, Business Plan: PLN_5tvhdoebxsxhddg. Ready for live payment processing with production Paystack keys.
- **Website Rebranding (August 16, 2025)**: Rebranded from "EtsyArt Pro" to "Etsy Art & Image Upscaler Pro" for imageupscaler.app deployment. Updated all branding across navigation, titles, descriptions, and marketing copy to emphasize the dual focus on Etsy optimization and professional image upscaling capabilities.
- **Complete Contact Form System**: Implemented full contact form functionality with database storage, API endpoints, server logging, and admin access via /api/contact-messages endpoint. Replaced simulation with real message storage.
- **Updated Pricing Structure (August 16, 2025)**: Removed mockup generation from free plan due to high costs (~$3 per set). Mockups now require paid subscription (Pro/Business plans only).
- **Revised Subscription Plans**: Pro plan reduced from $29/500 credits to $19.95/300 credits for better conversion. Business plan adjusted to $49/800 credits.
- **Realigned Credit Top-ups (August 16, 2025)**: Restructured one-time credit packages to encourage subscription adoption. New pricing: 50 credits (R114), 100 credits (R209), 200 credits (R380), 400 credits (R684). Top-ups now priced higher per credit than subscriptions to drive monthly plan conversion.
- **Credit Transaction Audit Trail**: Implemented comprehensive transaction tracking with database table and user interface for transparency.

## System Architecture

### Frontend Architecture
The frontend uses a modern React-based architecture with TypeScript, built on Vite. It leverages Radix UI components with shadcn/ui for consistent UI, TanStack Query for server state management, Wouter for routing, Tailwind CSS for styling with custom design tokens, and React Hook Form with Zod for type-safe form validation.

### Backend Architecture
The backend is an Express.js-based REST API with TypeScript, optimized for Replit Autoscale. It features structured route handlers and middleware, Multer for file uploads, a modular service architecture for processing, and non-blocking startup with health check endpoints (`/healthz`, `/`, `/status`). Background task architecture using `asyncio.create_task()` ensures server responsiveness.

### Data Storage Solutions
The application utilizes a hybrid storage approach with automatic failover. Supabase PostgreSQL with Drizzle ORM serves as primary storage, with an automatic fallback to in-memory storage if database connections fail. User and project entities use JSONB fields for flexible metadata. The `RobustStorage` class ensures application functionality during database issues.

### Authentication and Authorization
The system uses JWT-based authentication for user registration, login, and secure token management. It includes a comprehensive subscription management system integrated with Paystack, managing credit allocation, and preventing credit duplication. User-scoped data access and project ownership validation are implemented.

### Core Technical Implementations
- **AI Art Generation**: Integration with Imagen 3 through Segmind API.
- **Image Processing**: Sharp library for resizing and format conversion, and Canvas API for programmatic mockup creation.
- **Mockup Generation**: Uses a template-based system via an external Render-hosted API, allowing selection from various room templates. Images over 1MB are automatically compressed before mockup generation.
- **AI Content Generation**: OpenAI GPT-4o for automated Etsy listing content.
- **Payment Processing**: Paystack integration for ZAR payments, credit package purchases, and subscription management.
- **Credit Transaction Tracking**: Comprehensive audit trail system for all credit usage with detailed transaction history, types, and balances.
- **Template-Based Mockup Generation**: Hybrid system using local template API with corner-point mapping for precise artwork placement, falling back to Render API for reliability. Users select up to 5 templates from categorized rooms, and artwork is inserted using homography transformation for professional results. Credit cost reduced to 3 credits per mockup set for better affordability.
- **ComfyUI Integration**: RunPod serverless ComfyUI 5.2.0 is integrated for specific AI tasks, featuring an async-first architecture with retry logic and error handling. It supports custom ComfyUI workflows for tasks like `LatentComposite` for preserving artwork in mockups.
- **Streamlined Mockup Interface**: Sequential mockup generation is now the default with a simplified single "Generate" button. Template selection removed from dashboard and replaced with direct flow to new mockup generation system.

## External Dependencies

### Core Services
- **Segmind API**: Used for AI-powered image upscaling (Real-ESRGAN models) and Imagen 3 integration for AI art generation.
- **OpenAI API**: Provides GPT-4o for AI-powered Etsy SEO content generation.
- **Supabase**: Hosts the PostgreSQL database for production data storage.
- **Paystack**: Payment gateway for handling subscriptions and credit purchases.
- **RunPod**: Serverless platform for ComfyUI 5.2.0 execution, used for complex AI workflows and mockup generation.
- **Render-hosted Mockup API**: External API for template-based mockup generation at `https://mockup-api-cv83.onrender.com`. Note: May experience downtime on free tier.

### Development Tools
- **Vite**: Build tool for fast development and optimized production builds.
- **TypeScript**: Ensures static type checking across the application.
- **Drizzle ORM & Drizzle Kit**: For type-safe database operations and schema management.

### Libraries & Frameworks
- **Express.js**: Backend web application framework.
- **React**: Frontend JavaScript library for building user interfaces.
- **Multer**: Middleware for handling multipart/form-data.
- **Sharp**: High-performance Node.js image processing library.
- **Canvas**: HTML5 Canvas API for programmatic image manipulation.
- **JSZip**: Client-side library for creating and reading .zip files.
- **Radix UI**: Unstyled, accessible component primitives for React.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.