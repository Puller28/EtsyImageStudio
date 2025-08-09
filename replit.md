# EtsyArt Pro

## Overview

EtsyArt Pro is a comprehensive web application designed specifically for Etsy AI art sellers to automate their digital art workflow. The platform streamlines the entire process from AI art generation to marketplace-ready assets, including AI image creation with Imagen 3, image upscaling, print format resizing, mockup generation, and AI-powered Etsy SEO content creation. Users can generate AI artwork or upload existing images and receive a complete package of optimized images and marketing content ready for Etsy listing.

## Recent Changes (January 2025)

✅ **Authentication System Fully Operational** - JWT-based authentication with user registration, login, and secure token management working across all endpoints
✅ **AI Art Generation Active** - Imagen 3 integration through Segmind API producing professional 300 DPI images (2 credits per generation)  
✅ **Credit System Functional** - Users receive 100 credits on registration, tracked accurately across all operations
✅ **Database Reliability** - Robust storage system with automatic fallback to in-memory storage preventing application crashes
✅ **Backend API Complete** - All endpoints tested and operational including user management, project handling, and AI services
✅ **Paystack Payment Integration** - Complete ZAR payment processing with USD display prices, credit package system, and automatic credit allocation
✅ **Settings Page Functional** - User profile management, credit tracking, and account management interface working correctly
✅ **Deployment Optimization Complete** - Server startup optimized for Autoscale with health check endpoints, non-blocking database initialization, and faster startup times
✅ **Payment Verification Fixed** - Resolved paystack-api library bug by implementing direct HTTP API calls, added demo user fallback handling for seamless payment processing
✅ **Authentication Security Enhanced** - Strengthened payment endpoint security by requiring strict authentication, preventing demo user fallback for subscription and credit purchases
✅ **Token Authentication Fixed** - Resolved frontend token retrieval from localStorage, added comprehensive debugging, and improved token expiration handling for production deployment
✅ **Authentication System Robust** - Implemented automatic token expiry detection, cleanup of expired tokens, and forced re-authentication for seamless user experience
✅ **Production Authentication Fixed** - Resolved JWT signature validation issues, added comprehensive error handling for invalid tokens, and implemented automatic session recovery for payment operations
✅ **Paystack Production Analysis Complete** - Identified staging vs production payment integration differences, added comprehensive diagnostic tools, and implemented environment-aware configuration with enhanced error reporting
✅ **Replit Production Deployment Fixed** - Resolved JWT secret inconsistencies between development and production environments, implemented comprehensive authentication debugging, and confirmed Paystack test integration works correctly in both environments
✅ **Production Authentication Diagnostics Complete** - Added comprehensive JWT secret detection, authentication flow debugging, and production deployment troubleshooting documentation with step-by-step resolution guide
✅ **Frontend Authentication Enhanced** - Implemented backup token storage, production environment detection, enhanced Authorization header handling, and comprehensive authentication debugging for cross-environment compatibility
✅ **Complete Subscription Management System** - Implemented comprehensive Paystack subscription integration with real-time status detection, proper cancellation flow maintaining access through paid periods, automatic expiry handling, and dynamic UI updates based on actual payment history
✅ **Real Paystack Integration** - Built subscription system using authentic Paystack transaction data, automatic subscription detection from payment history, proper billing period calculations, and webhook integration for subscription activation without any mock or simulated data
✅ **Authentication Security Fixed** - Eliminated dangerous demo user fallback that was causing data leakage between accounts, implemented proper user isolation with no fallback mechanisms
✅ **Subscription Credit Allocation Corrected** - Fixed Pro plan (now 500 credits) and Business plan (now 1500 credits) to match pricing page specifications, ensuring accurate credit distribution
✅ **Credit Duplication Prevention System** - Implemented comprehensive idempotency system with `processedPayments` table tracking to prevent double credit allocation from both payment verification endpoint and webhook processing
✅ **Paystack Subscription Cancellation Fixed** - Resolved API integration by implementing correct Paystack disable subscription endpoint with both subscription code and email token parameters as required by Paystack API specifications
✅ **ComfyUI MVP Integration Complete** - Successfully integrated RunPod serverless ComfyUI 5.2.0 for AI-powered mockup generation with bedroom workflow, standard node compatibility, base64 image embedding, and proper authentication flow
✅ **LatentComposite Workflow Fixed** - Resolved RunPod workflow structure with proper VAE loader, CLIP model integration, and correct node connections for flux1-dev-fp8.safetensors model
✅ **Single-Server FastAPI Architecture Complete** - Migrated from dual-service to unified FastAPI server following user specification: `uvicorn app:app --host 0.0.0.0 --port $PORT --workers 1 --no-access-log`
✅ **Production-Ready RunPod Integration** - Implemented async-first architecture with exponential backoff retry logic, comprehensive error handling for 502/503/504 responses, and MOCK_MODE support for development
✅ **Health & Monitoring Endpoints** - Added `/healthz` (fast response), `/` (root probe), and `/status` (detailed diagnostics) following Replit deployment requirements
✅ **Background Task Architecture** - Replaced blocking operations with asyncio.create_task() for concurrent job submission and polling, ensuring server responsiveness during long RunPod operations
✅ **Robust Error Handling** - Implemented Redis client error detection, connection retry logic, and graceful degradation when RunPod services are unavailable - server stays alive in all scenarios
✅ **ComfyUI Workflow Fixed** - Resolved RunPod ComfyUI execution errors by replacing custom nodes and unavailable models with standard ComfyUI nodes and FLUX model - workflow now successfully executes on RunPod serverless infrastructure
✅ **Real RunPod Integration Active** - Successfully migrated from mock mode to live RunPod ComfyUI 5.2.0 execution with proper error handling and workflow validation
✅ **LatentComposite Workflow Implementation** - Implemented user's exact recipe using stock ComfyUI nodes: LoadImage → ImageScale → VAEEncode for artwork branch, EmptyLatentImage → KSampler for background branch, LatentComposite for latent space integration, preserving artwork without diffusion
✅ **RunPod Format Integration Complete** - Resolved workflow validation by implementing correct RunPod serverless format with "name"/"image" keys in images array, proper LoadImage node configuration, and direct workflow submission without double-wrapping
✅ **ComfyUI Workflow Execution Successful** - User's exact workflow now executing successfully on RunPod ComfyUI 5.2.0 with LoadImage → ImageScale → VAEEncode → LatentComposite → VAEDecode → SaveImage pipeline producing bedroom mockups with artwork preserved exactly as uploaded
✅ **Letterbox + Feather=0 Implementation Complete** - Successfully implemented letterbox scaling with aspect ratio preservation, VAEEncode and LatentComposite onto 1024×1024 generated room with feather=0 for sharp artwork edges, pixel→latent coordinate conversion (/8), no sampler after composite for direct VAEDecode output using only standard ComfyUI nodes compatible with RunPod 5.2.0
✅ **Model Switching Capability Added** - Added dynamic model selection parameter allowing testing of Realistic Vision, DreamShaper, and other photorealistic models for enhanced bedroom generation quality compared to FLUX

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The application uses a modern React-based architecture with TypeScript, built on Vite for fast development and optimized production builds. The frontend leverages:

- **Component System**: Radix UI components with shadcn/ui styling for consistent, accessible UI elements
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

### Backend Architecture
The server follows an Express.js-based REST API architecture with TypeScript, optimized for Replit Autoscale deployments:

- **API Layer**: Express.js with structured route handlers and middleware
- **File Handling**: Multer for multipart file uploads with memory storage
- **Storage Abstraction**: Interface-based storage system with in-memory implementation for development
- **Processing Pipeline**: Modular service architecture for image processing, AI integration, and file generation
- **Deployment Optimization**: Non-blocking startup with health check endpoints (`/health`, `/ready`) for container orchestration
- **Database Initialization**: Background initialization with timeout protection prevents deployment delays

### Data Storage Solutions
The application uses a robust hybrid storage approach with automatic failover:

- **Primary Storage**: Supabase PostgreSQL with Drizzle ORM for type-safe database operations
- **Fallback System**: Automatic switching to in-memory storage when database connections fail
- **Schema Design**: User and project entities with JSONB fields for flexible metadata storage
- **Connection**: Supabase Transaction pooler with robust error handling and retry logic
- **Reliability**: RobustStorage class ensures application remains functional during database issues

### Authentication and Authorization
Currently implements a demo user system with plans for full authentication:

- **Session Management**: Cookie-based sessions with PostgreSQL session storage
- **User Model**: Email/password authentication with credit-based usage tracking
- **Authorization**: User-scoped data access and project ownership validation

### External Service Integrations
The application integrates with multiple third-party services for core functionality:

- **Image Upscaling**: Segmind API using Real-ESRGAN models for 2x and 4x image enhancement
- **AI Content Generation**: OpenAI GPT-4o for automated Etsy listing creation (titles, tags, descriptions)
- **Image Processing**: Sharp library for high-performance image resizing and format conversion
- **Mockup Generation**: Canvas API for programmatic mockup creation with template-based backgrounds

## External Dependencies

### Core Services
- **Segmind API**: AI-powered image upscaling service using Real-ESRGAN models
- **OpenAI API**: GPT-4o integration for SEO-optimized Etsy listing content generation
- **Supabase**: Serverless PostgreSQL hosting with real-time capabilities for production data storage

### Development Tools
- **Vite**: Modern build tool with hot module replacement and optimized bundling
- **TypeScript**: Static type checking across the entire application stack
- **Drizzle Kit**: Database migration and schema management toolkit

### Image Processing Stack
- **Sharp**: High-performance image processing for resizing and format conversion
- **Canvas**: HTML5 Canvas API for programmatic mockup generation and image composition
- **JSZip**: Client-side ZIP file generation for asset packaging and download

### UI and Styling
- **Radix UI**: Unstyled, accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Lucide React**: Consistent icon library for UI elements

The architecture prioritizes modularity, type safety, and scalability while maintaining rapid development capabilities through modern tooling and service abstractions.