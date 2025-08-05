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