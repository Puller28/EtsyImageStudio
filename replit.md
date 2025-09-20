# Etsy Art & Image Upscaler Pro

## Overview
Etsy Art & Image Upscaler Pro is a comprehensive AI-powered web application designed for digital artists and Etsy sellers to automate their complete artwork workflow. The platform streamlines everything from AI art generation and professional image upscaling to marketplace-ready assets. Key capabilities include AI image creation, advanced upscaling up to 4x resolution, print format resizing, professional mockup generation, and AI-powered Etsy SEO content creation. Users can generate AI artwork or upload existing images to receive a complete package of optimized images and marketing content ready for Etsy listing. The vision is to empower digital artists with automation, enabling them to scale their businesses and focus on creativity, perfectly suited for deployment at imageupscaler.app.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes

### 2025-09-20 - Critical Production Bug Fixes (URGENT)
**RESOLVED: ALL customer payments were failing due to missing storage interface methods**

**Critical Issues Fixed:**
- **Missing Storage Methods**: Added `updateUserCredits()` and `updateUserSubscription()` methods that were causing runtime errors "storage.updateUserCredits is not a function"
- **Race Conditions**: Implemented atomic webhook payment processing with database transactions to prevent duplicate credits and ensure idempotency
- **Memory Cache Dependencies**: Fixed storage methods to persist to database even when users aren't loaded in memory (critical for webhook workers)
- **JWT Authentication**: Resolved JWT corruption issues affecting user login through system restart and storage fixes
- **Database Column Mapping**: Fixed column name mismatches between storage methods and database schema
- **Unique Constraint Handling**: Added proper error handling for concurrent webhook processing with PostgreSQL unique constraints

**Technical Implementation:**
- Added `processWebhookPaymentAtomic()` method for bulletproof payment processing
- Database-first persistence pattern with memory cache sync
- Transaction safety with SELECT FOR UPDATE and proper rollback handling
- Unique constraint violations handled gracefully (PostgreSQL error code 23505)
- All webhook handlers updated to use atomic processing methods

**Production Status**: ✅ ALL SYSTEMS OPERATIONAL - Customer payments now processing correctly

## System Architecture

### Frontend Architecture
The frontend uses a modern React-based architecture with TypeScript, built on Vite. It leverages Radix UI components with shadcn/ui for consistent UI, TanStack Query for server state management, Wouter for routing, Tailwind CSS for styling with custom design tokens, and React Hook Form with Zod for type-safe form validation.

### Backend Architecture
The backend is an Express.js-based REST API with TypeScript, optimized for Replit Autoscale. It features structured route handlers and middleware, Multer for file uploads, a modular service architecture for processing, and non-blocking startup with health check endpoints. Background task architecture ensures server responsiveness. Production deployment includes intelligent FastAPI service detection that automatically disables the secondary server to prevent port conflicts during Replit Autoscale deployment.

### Data Storage Solutions
The application utilizes a hybrid storage approach with automatic failover. Supabase PostgreSQL with Drizzle ORM serves as primary storage, with an automatic fallover to in-memory storage if database connections fail. User and project entities use JSONB fields for flexible metadata. Database connection timeout issues have been resolved with standardized connection management using proper timeout settings (20s idle, 30s connect, 30s statement) across all connection points.

### Authentication and Authorization
The system uses JWT-based authentication for user registration, login, and secure token management. It includes a comprehensive subscription management system integrated with Paystack, managing credit allocation, and preventing credit duplication. User-scoped data access and project ownership validation are implemented. New users receive 100 starting credits upon registration with explicit credit allocation in the registration flow. Free plans are correctly marked as active status, enabling full platform access.

### Core Technical Implementations
- **AI Art Generation**: Integration with Imagen 3.
- **Image Processing**: Sharp library for resizing and format conversion, and Canvas API for programmatic mockup creation. Images over 1MB are automatically compressed before mockup generation.
- **Mockup Generation**: Uses a template-based system via an external API and a local template API with corner-point mapping for precise artwork placement. Users select up to 5 templates from categorized rooms, and artwork is inserted using homography transformation.
- **AI Content Generation**: OpenAI GPT-4o for automated Etsy listing content.
- **Payment Processing**: Paystack integration for ZAR payments, credit package purchases, and subscription management.
- **Credit Transaction Tracking**: Comprehensive audit trail system for all credit usage with detailed transaction history, types, and balances. Credit costs are aligned for AI generation, upscaling, Etsy listings, and mockup generation.
- **ComfyUI Integration**: RunPod serverless ComfyUI 5.2.0 is integrated for specific AI tasks, featuring an async-first architecture with retry logic and error handling. It supports custom ComfyUI workflows for tasks like `LatentComposite`.
- **Streamlined Mockup Interface**: Sequential mockup generation is the default with a simplified single "Generate" button. Template selection is integrated into the workflow rather than a separate dashboard step.
- **Enhanced Project Display**: Project cards show visual content indicators (📸 Original, 🔍 Upscaled, 🖼️ Mockups, 📏 Print Sizes, 📝 Etsy SEO) to clearly communicate what assets each project contains, improving project organization and user understanding.
- **SEO Infrastructure**: Production-ready SEO implementation with sitemap.xml and robots.txt endpoints serving proper XML and text content with appropriate security blocking and search engine optimization for imageupscaler.app domain. Comprehensive canonical URL fix implemented via HTTP Link headers to override incorrect HTML canonicals, ensuring proper self-referencing for all routes. Server-rendered navigation links in HTML for crawler visibility, resolving "0 outgoing links" issues. Complete internal linking strategy with contextual cross-references between all pages, blog articles, and static content. Fixed Ahrefs detection issues through both HTTP headers and raw HTML anchor tags. IndexNow API integration for instant search engine notifications with API key (7f8a2c9b4e1d6f3a8c5b9e2d4f7a1c8e) and verification file for immediate indexing of new content.
- **Newsletter Subscription System**: Complete email capture system with database storage, duplicate checking, user feedback via toast notifications, and API endpoints for subscription management. Integrated newsletter signup form on blog page for content marketing and lead generation.

## External Dependencies

### Core Services
- **Segmind API**: Used for AI-powered image upscaling (Real-ESRGAN models) and Imagen 3 integration for AI art generation.
- **OpenAI API**: Provides GPT-4o for AI-powered Etsy SEO content generation.
- **Supabase**: Hosts the PostgreSQL database for production data storage.
- **Paystack**: Payment gateway for handling subscriptions and credit purchases.
- **RunPod**: Serverless platform for ComfyUI 5.2.0 execution, used for complex AI workflows and mockup generation.
- **Render-hosted Mockup API**: External API for template-based mockup generation at `https://mockup-api-cv83.onrender.com`.

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