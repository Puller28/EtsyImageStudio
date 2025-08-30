import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  path?: string;
}

export function SEOHead({ 
  title = "Etsy Art & Image Upscaler Pro - AI-Powered Digital Art Tools",
  description = "Professional AI-powered image upscaling up to 4x, stunning mockups, print-ready formats, and automated Etsy listings. The ultimate platform for digital artists and Etsy sellers.",
  path = "/"
}: SEOHeadProps) {
  
  useEffect(() => {
    // Set the document title
    document.title = title;
    
    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    }
    
    // Handle canonical URL - always point to imageupscaler.app (without www)
    const canonicalUrl = `https://imageupscaler.app${path}`;
    
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.setAttribute('href', canonicalUrl);
    } else {
      // Create canonical link if it doesn't exist
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      canonicalLink.setAttribute('href', canonicalUrl);
      document.head.appendChild(canonicalLink);
    }
    
    // Update Open Graph URL
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.setAttribute('content', canonicalUrl);
    }
    
    // Update Open Graph title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', title);
    }
    
    // Update Open Graph description
    let ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute('content', description);
    }
    
    // Update Twitter title
    let twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) {
      twitterTitle.setAttribute('content', title);
    }
    
    // Update Twitter description
    let twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription) {
      twitterDescription.setAttribute('content', description);
    }
    
  }, [title, description, path]);

  return null; // This component doesn't render anything visual
}