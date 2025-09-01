// Blog API Testing Script
// Demonstrates all blog management functionality

const BASE_URL = 'http://localhost:5000';

// Test data for blog posts
const samplePosts = [
  {
    slug: 'digital-art-pricing-guide',
    title: 'How to Price Your Digital Art: Complete Pricing Guide',
    excerpt: 'Learn proven strategies for pricing digital art that sells. Discover market research techniques, pricing psychology, and profit optimization.',
    content: `# How to Price Your Digital Art: Complete Pricing Guide

## Introduction

Pricing digital art correctly is one of the biggest challenges artists face. Price too high and you won't get sales. Price too low and you devalue your work and miss out on profits.

## Market Research Strategies

### 1. Competitive Analysis
- Study similar artists in your niche
- Note their pricing patterns
- Analyze their quality vs. price ratio
- Track their sales frequency

### 2. Platform Analysis
Different platforms have different price expectations:

**Etsy**: $3-50 for digital downloads
**Creative Market**: $15-100 for design assets
**Society6**: Platform sets pricing
**Your Website**: Premium pricing possible

## Pricing Psychology

### Value Perception
- Bundle products for higher perceived value
- Use charm pricing ($9.99 vs $10.00)
- Offer multiple price points
- Create urgency with limited-time pricing

### Price Anchoring
Start with a high-value offer, then present lower-priced alternatives. This makes your main product seem reasonably priced.

## Pricing Formulas

### Cost-Plus Pricing
1. Calculate time invested
2. Add material costs (software, resources)
3. Include desired profit margin
4. Factor in platform fees

### Value-Based Pricing
Price based on the value you provide to customers:
- Time savings for buyers
- Professional quality
- Unique style or concept
- Commercial use rights

## Different Product Types

### Digital Downloads
- Single designs: $5-25
- Design bundles: $15-50
- Commercial licenses: +50-200%

### Print-on-Demand
- Let platforms handle pricing
- Focus on volume and royalties
- Optimize for conversion rates

### Custom Work
- Hourly rate: $25-150/hour
- Project-based: $100-2000+
- Rush orders: +25-50%

## Testing Your Prices

### A/B Testing
- Test different price points
- Monitor conversion rates
- Track customer feedback
- Adjust based on data

### Gradual Increases
- Start conservatively
- Raise prices gradually
- Monitor sales impact
- Find your sweet spot

## Common Pricing Mistakes

1. **Underpricing**: Devalues your work and attracts wrong customers
2. **Overpricing**: No sales data to optimize
3. **One-size-fits-all**: Different products need different strategies
4. **Ignoring costs**: Forgetting platform fees and taxes
5. **Fear-based pricing**: Letting imposter syndrome drive decisions

## Conclusion

Successful pricing requires research, testing, and confidence in your value. Start with market research, test different approaches, and adjust based on real sales data.

Remember: You can always adjust prices, but you can't undo the perception of being too cheap.`,
    category: 'Business',
    tags: ['pricing', 'business', 'digital-art', 'etsy', 'marketing'],
    status: 'draft',
    readTime: '10 min read',
    seoTitle: 'Digital Art Pricing Guide 2025 - How to Price Your Art',
    seoDescription: 'Complete guide to pricing digital art for maximum profit. Learn market research, pricing psychology, and proven strategies that sell.'
  },
  {
    slug: 'etsy-seo-optimization-tips',
    title: '15 Etsy SEO Tips That Actually Increase Sales',
    excerpt: 'Boost your Etsy shop visibility with these proven SEO strategies. Learn keyword research, optimization techniques, and ranking factors.',
    content: `# 15 Etsy SEO Tips That Actually Increase Sales

## Why Etsy SEO Matters

With over 90 million active buyers, Etsy is incredibly competitive. Good SEO is the difference between being found and being invisible.

## Keyword Research Tips

### 1. Use Etsy's Search Bar
Type your main keyword and see what autocompletes. These are real searches buyers are making.

### 2. Analyze Competitors
Look at top-ranking listings in your category:
- What keywords are they using?
- How are they structuring titles?
- What tags are most common?

### 3. Long-Tail Keywords
Target specific phrases like "boho wall art for nursery" instead of just "wall art".

## Title Optimization

### 4. Front-Load Important Keywords
Put your most important keywords at the beginning of your title.

### 5. Use All 140 Characters
Longer titles give you more keyword opportunities.

### 6. Include Style and Use Terms
Add descriptive words like "minimalist," "vintage," or "modern."

## Tag Strategy

### 7. Use All 13 Tags
Every empty tag is a missed opportunity.

### 8. Mix Broad and Specific Tags
Combine general terms with specific long-tail keywords.

### 9. Include Seasonal Keywords
Add holiday or seasonal terms when relevant.

## Image Optimization

### 10. Use Keywords in Image Alt Text
Etsy reads your image descriptions for SEO.

### 11. High-Quality Mockups
Better images lead to higher engagement, which improves rankings.

### 12. Multiple Angles
Show your art in different settings and contexts.

## Listing Details

### 13. Detailed Descriptions
Use keywords naturally in your product descriptions.

### 14. Category Selection
Choose the most specific category possible.

### 15. Regular Updates
Refresh listings periodically to maintain relevance.

## Advanced Strategies

### Track Your Rankings
Monitor where your listings appear for target keywords.

### Seasonal Optimization
Update keywords and images for holidays and seasons.

### Cross-Promotion
Link related products to increase shop authority.

## Conclusion

Etsy SEO isn't magic—it's about understanding what buyers search for and optimizing your listings accordingly. Start with keyword research, optimize systematically, and track your results.

Consistent SEO efforts compound over time, leading to sustained organic traffic and sales growth.`,
    category: 'SEO',
    tags: ['etsy', 'seo', 'marketing', 'optimization', 'keywords', 'sales'],
    status: 'draft',
    readTime: '8 min read',
    seoTitle: 'Etsy SEO Tips 2025 - 15 Strategies That Increase Sales',
    seoDescription: '15 proven Etsy SEO tips to boost your shop visibility and sales. Learn keyword research, title optimization, and ranking strategies.'
  }
];

// Function to test creating blog posts
async function testCreatePosts() {
  console.log('Testing blog post creation...\n');
  
  for (const post of samplePosts) {
    try {
      const response = await fetch(`${BASE_URL}/api/blog/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: In real usage, you'd include: 'Authorization': 'Bearer YOUR_JWT_TOKEN'
        },
        body: JSON.stringify(post)
      });
      
      const result = await response.json();
      console.log(`${response.status}: ${post.slug}`);
      console.log(response.ok ? '✅ Created successfully' : `❌ ${result.error}`);
      console.log('---');
    } catch (error) {
      console.log(`❌ Network error for ${post.slug}:`, error.message);
    }
  }
}

// Function to test getting posts
async function testGetPosts() {
  console.log('\nTesting blog post retrieval...\n');
  
  try {
    // Get all posts
    const allResponse = await fetch(`${BASE_URL}/api/blog/posts`);
    const allPosts = await allResponse.json();
    console.log(`📚 Total posts: ${allPosts.count}`);
    
    // Get published posts only
    const publishedResponse = await fetch(`${BASE_URL}/api/blog/posts?status=published`);
    const publishedPosts = await publishedResponse.json();
    console.log(`🚀 Published posts: ${publishedPosts.count}`);
    
    // Get draft posts only
    const draftResponse = await fetch(`${BASE_URL}/api/blog/posts?status=draft`);
    const draftPosts = await draftResponse.json();
    console.log(`📝 Draft posts: ${draftPosts.count}`);
    
    // Show sample post data
    if (allPosts.posts.length > 0) {
      const samplePost = allPosts.posts[0];
      console.log(`\n📄 Sample post: "${samplePost.title}"`);
      console.log(`   Slug: ${samplePost.slug}`);
      console.log(`   Status: ${samplePost.status}`);
      console.log(`   Category: ${samplePost.category}`);
      console.log(`   Tags: ${samplePost.tags.join(', ')}`);
    }
    
  } catch (error) {
    console.log('❌ Error fetching posts:', error.message);
  }
}

// Function to test getting specific post
async function testGetSpecificPost() {
  console.log('\nTesting specific post retrieval...\n');
  
  const slug = 'ai-art-generation-guide-2025';
  
  try {
    const response = await fetch(`${BASE_URL}/api/blog/posts/${slug}`);
    
    if (response.ok) {
      const post = await response.json();
      console.log(`✅ Found post: "${post.title}"`);
      console.log(`   Read time: ${post.read_time}`);
      console.log(`   Featured: ${post.featured ? 'Yes' : 'No'}`);
      console.log(`   Content length: ${post.content.length} characters`);
    } else {
      const error = await response.json();
      console.log(`❌ ${response.status}: ${error.error}`);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

// Main test function
async function runTests() {
  console.log('🧪 Blog API Testing Suite\n');
  console.log('='.repeat(50));
  
  await testGetPosts();
  await testGetSpecificPost();
  await testCreatePosts();
  await testGetPosts(); // Check counts after creation attempts
  
  console.log('\n='.repeat(50));
  console.log('✅ Testing complete!');
  console.log('\n📖 For authentication examples, see BLOG_API_GUIDE.md');
  console.log('🔐 Remember to include JWT tokens for write operations');
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testCreatePosts, testGetPosts, testGetSpecificPost, runTests };