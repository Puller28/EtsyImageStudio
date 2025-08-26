# Etsy Art & Image Upscaler Pro

## Overview
Etsy Art & Image Upscaler Pro is a comprehensive AI-powered web application designed for digital artists and Etsy sellers to automate their complete artwork workflow. The platform streamlines everything from AI art generation and professional image upscaling to marketplace-ready assets. Key capabilities include AI image creation, advanced upscaling up to 4x resolution, print format resizing, professional mockup generation, and AI-powered Etsy SEO content creation. Users can generate AI artwork or upload existing images to receive a complete package of optimized images and marketing content ready for Etsy listing. The vision is to empower digital artists with automation, enabling them to scale their businesses and focus on creativity, perfectly suited for deployment at imageupscaler.app.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend uses a modern React-based architecture with TypeScript, built on Vite. It leverages Radix UI components with shadcn/ui for consistent UI, TanStack Query for server state management, Wouter for routing, Tailwind CSS for styling with custom design tokens, and React Hook Form with Zod for type-safe form validation.

### Backend Architecture
The backend is an Express.js-based REST API with TypeScript, optimized for Replit Autoscale. It features structured route handlers and middleware, Multer for file uploads, a modular service architecture for processing, and non-blocking startup with health check endpoints. Background task architecture ensures server responsiveness. Production deployment includes intelligent FastAPI service detection that automatically disables the secondary server to prevent port conflicts during Replit Autoscale deployment.

### Data Storage Solutions
The application utilizes a hybrid storage approach with automatic failover. Supabase PostgreSQL with Drizzle ORM serves as primary storage, with an automatic fallback to in-memory storage if database connections fail. User and project entities use JSONB fields for flexible metadata. **Image Storage Architecture**: Large images are stored in Replit object storage with small 200x200 compressed thumbnails in the database for fast loading. This prevents database performance issues caused by large base64 images. Database connection timeout issues have been resolved with optimized connection settings (30s statement timeout, 3 connection pool) for handling image operations efficiently.

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