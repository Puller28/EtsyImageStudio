/**
 * AI Blog Content Generator Service
 * 
 * Generates SEO-optimized blog posts using OpenAI
 * Includes title, meta description, content, and keywords
 */

import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export interface BlogPostRequest {
  topic: string;
  keywords?: string[];
  tone?: "professional" | "casual" | "educational" | "inspirational";
  length?: "short" | "medium" | "long"; // 500, 1000, 2000 words
  targetAudience?: string;
}

export interface GeneratedBlogPost {
  title: string;
  slug: string;
  metaDescription: string;
  content: string; // Markdown format
  keywords: string[];
  readingTime: number; // minutes
  seoScore: number; // 0-100
  suggestions: string[];
}

export class BlogGeneratorService {
  /**
   * Generate a complete blog post using AI with iterative improvement
   * Keeps improving until SEO score reaches 85+
   */
  static async generateBlogPost(request: BlogPostRequest): Promise<GeneratedBlogPost> {
    if (!openai) {
      throw new Error("OpenAI API key not configured");
    }

    const wordCount = this.getWordCount(request.length || "medium");
    const tone = request.tone || "professional";
    const audience = request.targetAudience || "Etsy sellers and print-on-demand entrepreneurs";

    const prompt = `You are an expert content writer specializing in SEO-optimized blog posts for ImageUpscaler.app - a SaaS tool for Etsy sellers.

Write a comprehensive, PRODUCTION-READY blog post about: "${request.topic}"

CRITICAL REQUIREMENTS - FOLLOW EXACTLY:
- Target audience: ${audience}
- Tone: ${tone}
- Length: Approximately ${wordCount} words
- Format: Markdown

CONTENT RULES:
1. NO placeholder links like [subscribe to our newsletter](#) or [link](#)
2. NO fake image URLs like https://example.com/image.jpg
3. NO "Additional Resources" section with fake links
4. Use REAL internal links to actual pages:
   - Main tool: https://imageupscaler.app
   - Pricing: https://imageupscaler.app/pricing
   - Features: https://imageupscaler.app (mention specific features)
5. For newsletter signup, use: "Sign up at https://imageupscaler.app to get started"
6. Include SEO keywords naturally: ${request.keywords?.join(", ") || "AI art, Etsy mockups, print-on-demand"}

STRUCTURE:
1. Catchy title (60 characters or less)
2. Meta description (150-160 characters)
3. Introduction (hook the reader, explain the problem)
4. Main content (4-6 sections with H2/H3 headings)
5. FAQ section (4-5 common questions)
6. Conclusion with strong CTA

CALL-TO-ACTION REQUIREMENTS:
- End with: "Ready to upscale your images? Try ImageUpscaler.app free today - no credit card required. Get started at https://imageupscaler.app"
- Make it specific to the blog topic
- Include benefit statement

DO NOT INCLUDE:
- Placeholder links
- Fake image URLs
- "Additional Resources" section
- External tool recommendations (only mention ImageUpscaler.app)
- Newsletter subscription links

Return ONLY a JSON object with this structure:
{
  "title": "SEO-optimized title",
  "metaDescription": "Compelling meta description",
  "content": "Full markdown content with REAL links only",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert SEO content writer. Return only valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      const responseText = completion.choices[0].message.content || "{}";
      const parsed = JSON.parse(responseText);

      // Generate slug from title
      const slug = this.generateSlug(parsed.title);

      // Calculate reading time (average 200 words per minute)
      const wordCountActual = parsed.content.split(/\s+/).length;
      const readingTime = Math.ceil(wordCountActual / 200);

      // Calculate SEO score
      let seoScore = this.calculateSEOScore(parsed, request.keywords || []);
      let currentPost = parsed;
      let iterations = 0;
      const maxIterations = 5; // Increased to ensure we reach 85+
      const targetScore = 85;

      console.log(`📊 Initial SEO score: ${seoScore}/100 (target: ${targetScore})`);

      // Iteratively improve until we reach target score
      while (seoScore < targetScore && iterations < maxIterations) {
        iterations++;
        console.log(`🔄 Iteration ${iterations}: Improving content (current score: ${seoScore}/100)...`);

        const suggestions = this.generateSuggestions(currentPost, seoScore);
        
        // Use AI to improve the content based on suggestions
        const improvedPost = await this.improveBlogPost(
          currentPost.content,
          request.keywords || [],
          suggestions
        );

        // Update the post with improvements
        currentPost = {
          title: improvedPost.title || currentPost.title,
          metaDescription: improvedPost.metaDescription || currentPost.metaDescription,
          content: improvedPost.content || currentPost.content,
          keywords: improvedPost.keywords || currentPost.keywords
        };

        // Recalculate score
        seoScore = this.calculateSEOScore(currentPost, request.keywords || []);
        console.log(`✨ New SEO score: ${seoScore}/100`);
      }

      if (seoScore >= targetScore) {
        console.log(`✅ Target SEO score achieved: ${seoScore}/100`);
      } else {
        console.log(`⚠️ Reached max iterations. Final score: ${seoScore}/100`);
      }

      // Recalculate reading time with final content
      const finalWordCount = currentPost.content.split(/\s+/).length;
      const finalReadingTime = Math.ceil(finalWordCount / 200);

      // Only generate suggestions if SEO score is below target
      const finalSuggestions = seoScore < targetScore 
        ? this.generateSuggestions(currentPost, seoScore)
        : [];

      // Post-process content to ensure production-readiness
      const productionReadyContent = this.makeProductionReady(currentPost.content);

      return {
        title: currentPost.title,
        slug: this.generateSlug(currentPost.title),
        metaDescription: currentPost.metaDescription,
        content: productionReadyContent,
        keywords: currentPost.keywords || [],
        readingTime: finalReadingTime,
        seoScore,
        suggestions: finalSuggestions,
      };
    } catch (error) {
      console.error("Error generating blog post:", error);
      throw new Error("Failed to generate blog post");
    }
  }

  /**
   * Generate blog post ideas based on topic
   */
  static async generateBlogIdeas(topic: string, count: number = 10): Promise<string[]> {
    if (!openai) {
      throw new Error("OpenAI API key not configured");
    }

    const prompt = `Generate ${count} compelling blog post ideas about "${topic}" for Etsy sellers and print-on-demand entrepreneurs.

Each idea should be:
- Specific and actionable
- SEO-friendly
- Valuable to the target audience
- Different from each other

Return ONLY a JSON array of strings, like:
["Blog post idea 1", "Blog post idea 2", ...]`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert content strategist. Return only valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 1000,
      });

      const responseText = completion.choices[0].message.content || "[]";
      return JSON.parse(responseText);
    } catch (error) {
      console.error("Error generating blog ideas:", error);
      throw new Error("Failed to generate blog ideas");
    }
  }

  /**
   * Improve existing blog post for SEO based on specific suggestions
   */
  static async improveBlogPost(
    content: string,
    targetKeywords: string[],
    suggestions: string[]
  ): Promise<{ title?: string; metaDescription?: string; content?: string; keywords?: string[] }> {
    if (!openai) {
      throw new Error("OpenAI API key not configured");
    }

    const prompt = `Improve this blog post to address these SEO issues while keeping it PRODUCTION-READY:

CURRENT ISSUES:
${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

TARGET KEYWORDS: ${targetKeywords.join(", ")}

CURRENT CONTENT:
${content}

IMPROVEMENT INSTRUCTIONS:
1. Fix the meta description to be exactly 150-160 characters
2. Ensure title is under 60 characters
3. Add more sections with H2/H3 headings
4. Expand content to 1500-2000 words minimum
5. Include target keywords naturally throughout
6. Add FAQ section (4-5 questions)
7. Add strong call-to-action at the end
8. Include practical examples and tips
9. Use lists and formatting for readability

CRITICAL - MAINTAIN PRODUCTION STANDARDS:
- NO placeholder links like [link](#) or [subscribe](#)
- NO fake image URLs like https://example.com/
- Use ONLY real links: https://imageupscaler.app or https://imageupscaler.app/pricing
- End with: "Try ImageUpscaler.app free today at https://imageupscaler.app"
- NO "Additional Resources" section with fake links
- NO external tool recommendations

Return ONLY a JSON object with this structure:
{
  "title": "Improved SEO-optimized title (under 60 chars)",
  "metaDescription": "Improved meta description (150-160 chars)",
  "content": "Full improved markdown content with REAL links only",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert SEO editor. Return only valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 4000,
      });

      const responseText = completion.choices[0].message.content || "{}";
      return JSON.parse(responseText);
    } catch (error) {
      console.error("Error improving blog post:", error);
      throw new Error("Failed to improve blog post");
    }
  }

  // Helper methods

  /**
   * Post-process content to ensure it's 100% production-ready
   */
  private static makeProductionReady(content: string): string {
    let processed = content;

    // Remove any remaining placeholder links
    processed = processed.replace(/\[([^\]]+)\]\(#\)/g, '$1');
    
    // Remove fake image URLs
    processed = processed.replace(/!\[([^\]]*)\]\(https?:\/\/example\.com[^\)]*\)/g, '');
    
    // Remove "Additional Resources" section if it exists
    processed = processed.replace(/##\s*Additional Resources[\s\S]*?(?=##|$)/gi, '');
    
    // Ensure proper CTA format
    if (!processed.includes('https://imageupscaler.app')) {
      processed += '\n\n## Get Started Today\n\nReady to transform your images? Try ImageUpscaler.app free today - no credit card required. [Get started now](https://imageupscaler.app)\n';
    }

    return processed.trim();
  }

  private static getWordCount(length: string): number {
    switch (length) {
      case "short": return 500;
      case "medium": return 1000;
      case "long": return 2000;
      default: return 1000;
    }
  }

  private static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  private static calculateSEOScore(post: any, targetKeywords: string[]): number {
    let score = 0;

    // Title length (60 chars or less)
    if (post.title.length <= 60) score += 15;
    else if (post.title.length <= 70) score += 10;

    // Meta description length (150-160 chars)
    if (post.metaDescription.length >= 150 && post.metaDescription.length <= 160) score += 15;
    else if (post.metaDescription.length >= 140 && post.metaDescription.length <= 170) score += 10;

    // Keyword in title
    const titleLower = post.title.toLowerCase();
    if (targetKeywords.some(kw => titleLower.includes(kw.toLowerCase()))) score += 20;

    // Keyword in meta description
    const metaLower = post.metaDescription.toLowerCase();
    if (targetKeywords.some(kw => metaLower.includes(kw.toLowerCase()))) score += 15;

    // Content length (800+ words)
    const wordCount = post.content.split(/\s+/).length;
    if (wordCount >= 800) score += 15;
    else if (wordCount >= 500) score += 10;

    // Has headings
    if (post.content.includes("## ")) score += 10;

    // Has lists
    if (post.content.includes("- ") || post.content.includes("1. ")) score += 10;

    return Math.min(score, 100);
  }

  private static generateSuggestions(post: any, seoScore: number): string[] {
    const suggestions: string[] = [];

    if (post.title.length > 60) {
      suggestions.push("Consider shortening the title to 60 characters or less for better SEO");
    }

    if (post.metaDescription.length < 150 || post.metaDescription.length > 160) {
      suggestions.push("Optimize meta description to 150-160 characters for best results");
    }

    if (seoScore < 70) {
      suggestions.push("Add more target keywords naturally throughout the content");
    }

    const wordCount = post.content.split(/\s+/).length;
    if (wordCount < 800) {
      suggestions.push("Consider expanding content to 800+ words for better SEO ranking");
    }

    if (!post.content.includes("![")) {
      suggestions.push("Add images to improve engagement and SEO");
    }

    if (!post.content.toLowerCase().includes("try") && !post.content.toLowerCase().includes("get started")) {
      suggestions.push("Add a stronger call-to-action to drive conversions");
    }

    return suggestions;
  }
}
