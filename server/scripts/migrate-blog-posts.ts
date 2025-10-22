/**
 * Migration Script: Import Static Blog Posts to Database
 * 
 * This script imports all static blog posts from shared/blog-data.ts
 * into the database, making them manageable through the admin dashboard.
 * 
 * Run with: npm run migrate-blog-posts
 */

import { db } from '../db.js';
import { blogPosts, users } from '../../shared/schema.js';
import { BLOG_POSTS } from '../../shared/blog-data.js';
import { eq } from 'drizzle-orm';

// Generate full blog content from excerpt
function generateFullContent(post: typeof BLOG_POSTS[0]): string {
  return `# ${post.title}

${post.excerpt}

## Introduction

${post.excerpt}

## Key Points

This comprehensive guide covers everything you need to know about ${post.title.toLowerCase()}.

## Conclusion

${post.excerpt}

---

*Published on ${new Date(post.date).toLocaleDateString('en-US', { 
  month: 'long', 
  day: 'numeric', 
  year: 'numeric' 
})}*
`;
}

// Extract keywords from category and title
function extractKeywords(post: typeof BLOG_POSTS[0]): string[] {
  const keywords = new Set<string>();
  
  // Add category as keyword
  keywords.add(post.category.toLowerCase());
  
  // Extract keywords from title
  const titleWords = post.title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(' ')
    .filter(word => word.length > 3);
  
  titleWords.forEach(word => keywords.add(word));
  
  // Add common keywords based on category
  const categoryKeywords: Record<string, string[]> = {
    'Social Media Marketing': ['pinterest', 'instagram', 'marketing', 'social media'],
    'Design Trends': ['design', 'trends', 'art', 'style'],
    'Business Strategy': ['business', 'strategy', 'profit', 'revenue'],
    'Mockup Design': ['mockup', 'template', 'design'],
    'AI Art': ['ai', 'artificial intelligence', 'generation'],
    'Seasonal Marketing': ['seasonal', 'holiday', 'marketing'],
    'Etsy Marketing': ['etsy', 'seo', 'marketing'],
    'Design Psychology': ['psychology', 'design', 'conversion'],
    'Print-on-Demand': ['print', 'pod', 'printful'],
    'Image Processing': ['upscale', 'image', 'quality'],
    'Print Business': ['print', 'business', 'sizes'],
    'Automation': ['automation', 'workflow', 'efficiency']
  };
  
  const categoryKeys = categoryKeywords[post.category] || [];
  categoryKeys.forEach(keyword => keywords.add(keyword));
  
  return Array.from(keywords).slice(0, 10); // Limit to 10 keywords
}

// Parse reading time
function parseReadingTime(readTime: string): number {
  const match = readTime.match(/(\d+)/);
  return match ? parseInt(match[1]) : 10;
}

async function migrateBlogPosts() {
  console.log('🚀 Starting blog post migration...\n');
  
  // Get the first admin user to use as author
  const adminUsers = await db.select()
    .from(users)
    .where(eq(users.isAdmin, true))
    .limit(1);
  
  if (adminUsers.length === 0) {
    console.error('❌ No admin user found. Please create an admin user first.');
    process.exit(1);
  }
  
  const authorId = adminUsers[0].id;
  console.log(`👤 Using admin user as author: ${adminUsers[0].email}\n`);
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const post of BLOG_POSTS) {
    try {
      // Check if post already exists by slug
      const existing = await db.select()
        .from(blogPosts)
        .where(eq(blogPosts.slug, post.slug))
        .limit(1);
      
      if (existing.length > 0) {
        console.log(`⏭️  Skipping "${post.title}" (already exists)`);
        skipped++;
        continue;
      }
      
      // Prepare post data
      const keywords = extractKeywords(post);
      const readingTime = parseReadingTime(post.readTime);
      const content = generateFullContent(post);
      
      // Insert into database
      await db.insert(blogPosts).values({
        title: post.title,
        slug: post.slug,
        metaDescription: post.excerpt,
        content: content,
        keywords: keywords,
        authorId: authorId,
        readingTime: readingTime,
        seoScore: 85, // Default SEO score
        status: 'published',
        publishedAt: new Date(post.date),
        createdAt: new Date(post.date),
        updatedAt: new Date()
      });
      
      console.log(`✅ Imported "${post.title}"`);
      console.log(`   📅 Published: ${post.date}`);
      console.log(`   🏷️  Keywords: ${keywords.slice(0, 5).join(', ')}`);
      console.log('');
      
      imported++;
    } catch (error: any) {
      console.error(`❌ Error importing "${post.title}":`, error.message);
      errors++;
    }
  }
  
  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📝 Total: ${BLOG_POSTS.length}`);
  
  if (imported > 0) {
    console.log('\n🎉 Migration completed successfully!');
    console.log('   All blog posts are now visible in /admin/blog-posts');
    console.log('   You can now generate Pinterest pins for all posts!');
  }
}

// Run migration
migrateBlogPosts()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
