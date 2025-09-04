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
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today for comparison
    const todayISO = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Blog posts data - will be automatically filtered by date
    const allBlogPosts = [
      { slug: "minimalist-digital-art-guide", date: "2025-09-03", priority: "0.8" },
      { slug: "cottagecore-art-prints-guide", date: "2025-09-04", priority: "0.8" },
      { slug: "etsy-digital-art-pricing-guide", date: "2025-09-05", priority: "0.8" },
      { slug: "tshirt-mockup-bella-canvas-guide", date: "2025-09-06", priority: "0.8" },
      { slug: "ai-prompt-to-etsy-sale-workflow", date: "2025-09-07", priority: "0.8" },
      { slug: "halloween-digital-art-collection", date: "2025-09-08", priority: "0.7" },
      { slug: "printable-wall-art-sizes-guide", date: "2025-01-16", priority: "0.7" },
      { slug: "ai-generated-art-vs-traditional", date: "2025-01-17", priority: "0.7" },
      { slug: "300-dpi-digital-downloads-guide", date: "2025-01-18", priority: "0.7" },
      { slug: "boho-digital-art-trends-2025", date: "2025-01-19", priority: "0.7" },
      { slug: "ai-art-etsy-success-2025", date: "2025-01-15", priority: "0.7" },
      { slug: "ai-image-upscaling-print-on-demand", date: "2025-01-10", priority: "0.7" },
      { slug: "mockup-generation-digital-art", date: "2024-12-28", priority: "0.7" },
      { slug: "etsy-seo-ai-listing-optimization", date: "2024-12-25", priority: "0.7" },
      { slug: "best-print-sizes-digital-art-etsy", date: "2024-12-20", priority: "0.7" },
      { slug: "automate-digital-art-business-workflow", date: "2024-12-15", priority: "0.7" }
    ];

    // Filter blog posts to only published ones (current date or earlier)
    const publishedBlogPosts = allBlogPosts.filter(post => {
      const postDate = new Date(post.date);
      postDate.setHours(0, 0, 0, 0);
      return postDate <= today;
    });

    // Static pages
    const staticPages = [
      // Public marketing pages - only root path, not /home (duplicate content)
      { path: '/', priority: '1.0', changefreq: 'weekly' },
      { path: '/features', priority: '0.9', changefreq: 'monthly' },
      { path: '/pricing', priority: '0.9', changefreq: 'monthly' },
      { path: '/about-us', priority: '0.7', changefreq: 'monthly' },
      { path: '/contact', priority: '0.6', changefreq: 'monthly' },
      { path: '/blog', priority: '0.8', changefreq: 'weekly' },
      
      // Feature landing pages for SEO - only actual working routes
      { path: '/generate', priority: '0.8', changefreq: 'monthly' },
      { path: '/upscale', priority: '0.8', changefreq: 'monthly' },
      { path: '/resize', priority: '0.7', changefreq: 'monthly' },
      
      // Legal pages
      { path: '/terms-of-service', priority: '0.3', changefreq: 'yearly' },
      { path: '/privacy-policy', priority: '0.3', changefreq: 'yearly' }
    ];

    // Convert published blog posts to sitemap entries
    const blogPages = publishedBlogPosts.map(post => ({
      path: `/blog/${post.slug}`,
      priority: post.priority,
      changefreq: 'monthly'
    }));

    // Combine all pages
    const indexablePages = [...staticPages, ...blogPages];

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