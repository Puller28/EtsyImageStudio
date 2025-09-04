// SEO Service - Sitemap and Robots.txt generation
import { BLOG_POSTS } from "@shared/blog-data";

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
    
    // Use shared blog post data for consistency
    const allBlogPosts = BLOG_POSTS.map(post => ({
      slug: post.slug,
      date: post.date,
      priority: post.featured ? "0.8" : "0.7"
    }));

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
      { path: '/internal-links', priority: '0.7', changefreq: 'weekly' },
      
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

<!-- Internal links for search engines to prevent orphan pages -->
<!-- <a href="https://imageupscaler.app/blog/minimalist-digital-art-guide">Minimalist Digital Art Guide</a> -->
<!-- <a href="https://imageupscaler.app/blog/cottagecore-art-prints-guide">Cottagecore Art Prints Guide</a> -->
<!-- <a href="https://imageupscaler.app/blog/boho-digital-art-trends-2025">Boho Digital Art Trends 2025</a> -->
<!-- <a href="https://imageupscaler.app/blog/printable-wall-art-sizes-guide">Printable Wall Art Sizes Guide</a> -->
<!-- <a href="https://imageupscaler.app/blog/300-dpi-digital-downloads-guide">300 DPI Digital Downloads Guide</a> -->
<!-- <a href="https://imageupscaler.app/blog/ai-generated-art-vs-traditional">AI Generated Art vs Traditional</a> -->

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