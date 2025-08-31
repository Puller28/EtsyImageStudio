import { useEffect } from 'react';

// Generate canonical URL following SEO best practices
function generateCanonicalUrl(reqPath: string): string {
  const BASE = 'https://imageupscaler.app';
  
  // Remove query strings and fragments
  let path = reqPath.split('?')[0].split('#')[0];
  
  // Normalize trailing slashes - remove all except root
  path = path.replace(/\/+$/, '');
  if (path === '') path = '/';
  
  // Map /home to root for canonical consistency (prevent duplicate content)
  if (path === '/home') path = '/';
  
  // Return absolute HTTPS URL
  return BASE + path;
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
      title: "Etsy Art & Image Upscaler Pro - AI-Powered Digital Art Tools",
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
    
    // Canonical URLs are now handled by the inline script in index.html
    // This ensures they're present before search engines finish parsing the head
    // Just ensure the existing ones are correct if they exist
    const canonicalUrl = generateCanonicalUrl(currentPath);
    const isArticlePage = currentPath.startsWith('/blog/') && currentPath !== '/blog' && currentPath !== '/blog/';
    const ogType = isArticlePage ? 'article' : 'website';
    
    // Update existing canonical if present
    let canonicalLink = document.getElementById('canonical-url');
    if (canonicalLink) {
      canonicalLink.setAttribute('href', canonicalUrl);
    }
    
    // Update existing og:url if present
    let ogUrl = document.getElementById('og-url');
    if (ogUrl) {
      ogUrl.setAttribute('content', canonicalUrl);
    }
    
    // Update existing og:type if present
    let ogTypeElement = document.getElementById('og-type');
    if (ogTypeElement) {
      ogTypeElement.setAttribute('content', ogType);
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