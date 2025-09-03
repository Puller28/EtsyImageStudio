// SEO Service - Sitemap and Robots.txt generation
export class SEOService {
  // Generate canonical URL following SEO best practices
  static generateCanonicalUrl(reqPath: string): string {
    const BASE = 'https://imageupscaler.app';
    
    // Remove query strings and fragments
    let path = reqPath.split('?')[0].split('#')[0];
    
    // Normalize trailing slashes - remove all except root
    path = path.replace(/\/+$/, '');
    if (path === '') path = '/';
    
    // Return absolute HTTPS URL
    return BASE + path;
  }

  static generateSitemap(): string {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Only include indexable pages that are self-canonical
    const indexablePages = [
      // Public marketing pages - only root path, not /home (duplicate content)
      { path: '/', priority: '1.0', changefreq: 'weekly' },
      { path: '/features', priority: '0.9', changefreq: 'monthly' },
      { path: '/pricing', priority: '0.9', changefreq: 'monthly' },
      { path: '/about-us', priority: '0.7', changefreq: 'monthly' },
      { path: '/contact', priority: '0.6', changefreq: 'monthly' },
      { path: '/blog', priority: '0.8', changefreq: 'weekly' },
      
      // Feature landing pages for SEO
      { path: '/generate', priority: '0.8', changefreq: 'monthly' },
      { path: '/upscale', priority: '0.8', changefreq: 'monthly' },
      { path: '/resize', priority: '0.7', changefreq: 'monthly' },
      { path: '/etsy-seo', priority: '0.7', changefreq: 'monthly' },
      
      // Legal pages
      { path: '/terms-of-service', priority: '0.3', changefreq: 'yearly' },
      { path: '/privacy-policy', priority: '0.3', changefreq: 'yearly' },
      
      // Blog posts (individual articles) - Latest posts first for indexing priority
      { path: '/blog/minimalist-digital-art-guide', priority: '0.8', changefreq: 'monthly' },
      { path: '/blog/cottagecore-art-prints-guide', priority: '0.8', changefreq: 'monthly' },
      { path: '/blog/etsy-digital-art-pricing-guide', priority: '0.8', changefreq: 'monthly' },
      { path: '/blog/tshirt-mockup-bella-canvas-guide', priority: '0.8', changefreq: 'monthly' },
      { path: '/blog/ai-prompt-to-etsy-sale-workflow', priority: '0.8', changefreq: 'monthly' },
      { path: '/blog/halloween-digital-art-collection', priority: '0.7', changefreq: 'monthly' },
      { path: '/blog/printable-wall-art-sizes-guide', priority: '0.7', changefreq: 'monthly' },
      { path: '/blog/ai-generated-art-vs-traditional', priority: '0.7', changefreq: 'monthly' },
      { path: '/blog/300-dpi-digital-downloads-guide', priority: '0.7', changefreq: 'monthly' },
      { path: '/blog/boho-digital-art-trends-2025', priority: '0.7', changefreq: 'monthly' },
      { path: '/blog/ai-art-etsy-success-2025', priority: '0.7', changefreq: 'monthly' },
      { path: '/blog/ai-image-upscaling-print-on-demand', priority: '0.7', changefreq: 'monthly' },
      { path: '/blog/mockup-generation-digital-art', priority: '0.7', changefreq: 'monthly' },
      { path: '/blog/etsy-seo-ai-listing-optimization', priority: '0.7', changefreq: 'monthly' },
      { path: '/blog/best-print-sizes-digital-art-etsy', priority: '0.7', changefreq: 'monthly' },
      { path: '/blog/automate-digital-art-business-workflow', priority: '0.7', changefreq: 'monthly' }
    ];

    const urls = indexablePages.map(page => 
      `  <url>
    <loc>${this.generateCanonicalUrl(page.path)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
    ).join('\n\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">

${urls}

</urlset>`;
  }

  static generateRobots(): string {
    return `# Robots.txt for Image Upscaler Pro
# Last updated: ${new Date().toISOString().split('T')[0]}

User-agent: *
Allow: /

# Block access to user-specific and admin areas
Disallow: /api/
Disallow: /settings/
Disallow: /admin/
Disallow: /dashboard/

# Block access to temporary files and processing
Disallow: /temp/
Disallow: /uploads/
Disallow: /processing/

# Block common sensitive files
Disallow: /.env
Disallow: /package.json
Disallow: /config/

# Sitemap location
Sitemap: https://imageupscaler.app/sitemap.xml

# Crawl delay (optional - helps with server load)
Crawl-delay: 1`;
  }
}