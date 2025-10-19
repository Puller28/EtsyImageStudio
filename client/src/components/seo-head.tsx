import { useEffect } from 'react';

// Generate canonical URL following SEO best practices
// CRITICAL: Each page must have a self-referencing canonical URL
// This fixes "Non-canonical page in sitemap" Ahrefs errors
function generateCanonicalUrl(reqPath: string): string {
  const BASE = 'https://imageupscaler.app';
  
  // Remove query strings and fragments
  let path = reqPath.split('?')[0].split('#')[0];
  
  // Normalize trailing slashes - remove all except root
  path = path.replace(/\/+$/, '');
  if (path === '') path = '/';
  
  // Map /home to root for canonical consistency (prevent duplicate content)
  if (path === '/home') path = '/';
  
  // IMPORTANT: Every indexable page gets its own canonical URL
  // Blog articles: /blog/article-slug → https://imageupscaler.app/blog/article-slug
  // Static pages: /features → https://imageupscaler.app/features
  // This ensures URL = Canonical URL for all pages
  return BASE + (path === '/' ? '' : path);
}

interface SEOHeadProps {
  title?: string;
  description?: string;
  path?: string;
}

// Page-specific SEO data
const getPageSEO = (path: string) => {
  const seoData: Record<string, { title: string; description: string }> = {
    '/': {
      title: "Art Studio for Etsy - AI-Powered Digital Art Tools",
      description: "Professional AI image upscaling up to 4x, stunning mockups, print-ready formats, and automated Etsy listings. The ultimate platform for digital artists."
    },
    '/home': {
      title: "AI Image Upscaler Pro - Professional Digital Art Tools for Etsy Sellers", 
      description: "Transform your digital art with AI upscaling, mockup generation, and automated Etsy SEO. Professional tools for artists and online sellers."
    },
    '/features': {
      title: "Features - AI Image Upscaler Pro | Digital Art Processing Tools",
      description: "Discover AI image upscaling, mockup generation, print resizing, and Etsy SEO automation. Complete digital art workflow solutions."
    },
    '/pricing': {
      title: "Pricing Plans - Affordable AI Image Processing | Image Upscaler Pro",
      description: "Choose the perfect plan for your digital art business. Professional AI upscaling, mockups, and Etsy tools starting from free."
    },
    '/about-us': {
      title: "About Us - Image Upscaler Pro | Digital Art Technology Team",
      description: "Meet the team behind Image Upscaler Pro. Learn about our mission to empower digital artists with professional AI tools."
    },
    '/contact': {
      title: "Contact Us - Get Support | Image Upscaler Pro",
      description: "Need help with AI image upscaling or digital art tools? Contact our support team for assistance with your creative workflow."
    },
    '/terms-of-service': {
      title: "Terms of Service - Image Upscaler Pro | Legal Information",
      description: "Read our terms of service for Image Upscaler Pro. Understand your rights and obligations when using our AI digital art tools."
    },
    '/privacy-policy': {
      title: "Privacy Policy - How We Protect Your Data | Image Upscaler Pro", 
      description: "Learn how Image Upscaler Pro protects your privacy and handles your data. Transparent policies for digital artists."
    },
    '/auth': {
      title: "Login & Register - Start Creating | Image Upscaler Pro",
      description: "Join Image Upscaler Pro today. Access AI image upscaling, mockup generation, and professional digital art tools."
    },
    '/blog': {
      title: "Blog - Digital Art Tips & Tutorials | Image Upscaler Pro",
      description: "Expert tips on digital art, AI image processing, Etsy selling strategies, and creative workflow optimization."
    }
  };
  
  return seoData[path] || seoData['/'];
};

export function SEOHead({ 
  title,
  description,
  path = "/"
}: SEOHeadProps) {
  
  // Always use window.location.pathname for accurate path detection
  const currentPath = window.location.pathname;
  
  // Get page-specific SEO if no custom values provided
  const pageSEO = getPageSEO(currentPath);
  const finalTitle = title || pageSEO.title;
  const finalDescription = description || pageSEO.description;
  
  useEffect(() => {
    // Set the document title
    document.title = finalTitle;
    
    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', finalDescription);
    }
    
    // Generate canonical URL and meta tags - ensure they're always present
    const canonicalUrl = generateCanonicalUrl(currentPath);
    const isArticlePage = currentPath.startsWith('/blog/') && currentPath !== '/blog' && currentPath !== '/blog/';
    const ogType = isArticlePage ? 'article' : 'website';
    
    // Always ensure canonical link exists and is correct
    let canonicalLink = document.getElementById('canonical-url');
    if (canonicalLink) {
      canonicalLink.setAttribute('href', canonicalUrl);
    } else {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      canonicalLink.setAttribute('href', canonicalUrl);
      canonicalLink.id = 'canonical-url';
      document.head.appendChild(canonicalLink);
    }
    
    // Always ensure og:url exists and is correct
    let ogUrl = document.getElementById('og-url');
    if (ogUrl) {
      ogUrl.setAttribute('content', canonicalUrl);
    } else {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      ogUrl.setAttribute('content', canonicalUrl);
      ogUrl.id = 'og-url';
      document.head.appendChild(ogUrl);
    }
    
    // Always ensure og:type exists and is correct
    let ogTypeElement = document.getElementById('og-type');
    if (ogTypeElement) {
      ogTypeElement.setAttribute('content', ogType);
    } else {
      ogTypeElement = document.createElement('meta');
      ogTypeElement.setAttribute('property', 'og:type');
      ogTypeElement.setAttribute('content', ogType);
      ogTypeElement.id = 'og-type';
      document.head.appendChild(ogTypeElement);
    }
    
    // Update Open Graph title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', finalTitle);
    }
    
    // Update Open Graph description
    let ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute('content', finalDescription);
    }
    
    // Update Twitter title
    let twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) {
      twitterTitle.setAttribute('content', finalTitle);
    }
    
    // Update Twitter description
    let twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription) {
      twitterDescription.setAttribute('content', finalDescription);
    }
    
  }, [finalTitle, finalDescription, currentPath]);

  return null; // This component doesn't render anything visual
}