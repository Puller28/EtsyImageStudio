/**
 * Social Media Automation Service
 * 
 * Generates social media posts for Facebook, Twitter/X, Pinterest, Instagram
 * Uses AI to create engaging content with hashtags and optimal posting times
 */

import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export type SocialPlatform = "facebook" | "twitter" | "pinterest" | "instagram" | "linkedin";

export interface SocialPostRequest {
  platform: SocialPlatform;
  topic: string;
  tone?: "professional" | "casual" | "inspirational" | "educational";
  includeHashtags?: boolean;
  includeEmojis?: boolean;
  callToAction?: string;
  imageDescription?: string; // For AI image generation
}

export interface GeneratedSocialPost {
  platform: SocialPlatform;
  content: string;
  hashtags: string[];
  characterCount: number;
  optimalPostTime: string; // Best time to post
  imagePrompt?: string; // For AI image generation
  suggestions: string[];
}

export interface SocialMediaCalendar {
  week: {
    day: string;
    posts: GeneratedSocialPost[];
  }[];
}

export class SocialMediaService {
  /**
   * Generate a social media post for specific platform
   */
  static async generatePost(request: SocialPostRequest): Promise<GeneratedSocialPost> {
    if (!openai) {
      throw new Error("OpenAI API key not configured");
    }

    const platformLimits = this.getPlatformLimits(request.platform);
    const tone = request.tone || "casual";

    const prompt = `Create an engaging ${request.platform} post about: "${request.topic}"

Platform: ${request.platform}
Character limit: ${platformLimits.charLimit}
Tone: ${tone}
Include hashtags: ${request.includeHashtags !== false}
Include emojis: ${request.includeEmojis !== false}
Call-to-action: ${request.callToAction || "Visit our website"}

Requirements:
- Stay within character limit
- Make it engaging and shareable
- Include relevant hashtags (${platformLimits.hashtagCount} max)
- Add emojis naturally
- End with clear call-to-action
- Target audience: Etsy sellers, print-on-demand entrepreneurs

${request.imageDescription ? `Image to accompany post: ${request.imageDescription}` : ""}

Return ONLY a JSON object:
{
  "content": "The post text (without hashtags)",
  "hashtags": ["hashtag1", "hashtag2"],
  "imagePrompt": "Detailed prompt for AI image generation (if applicable)"
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert social media manager specializing in ${request.platform}. Return only valid JSON.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 500,
      });

      const responseText = completion.choices[0].message.content || "{}";
      const parsed = JSON.parse(responseText);

      // Combine content with hashtags
      const fullContent = request.includeHashtags !== false
        ? `${parsed.content}\n\n${parsed.hashtags.map((h: string) => `#${h.replace(/^#/, "")}`).join(" ")}`
        : parsed.content;

      const characterCount = fullContent.length;

      // Get optimal posting time
      const optimalPostTime = this.getOptimalPostTime(request.platform);

      // Generate suggestions
      const suggestions = this.generateSuggestions(
        fullContent,
        characterCount,
        platformLimits,
        request.platform
      );

      return {
        platform: request.platform,
        content: fullContent,
        hashtags: parsed.hashtags || [],
        characterCount,
        optimalPostTime,
        imagePrompt: parsed.imagePrompt,
        suggestions,
      };
    } catch (error) {
      console.error("Error generating social post:", error);
      throw new Error("Failed to generate social media post");
    }
  }

  /**
   * Generate a week's worth of social media content
   */
  static async generateWeeklyCalendar(
    platforms: SocialPlatform[],
    topics: string[]
  ): Promise<SocialMediaCalendar> {
    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const calendar: SocialMediaCalendar = { week: [] };

    for (let i = 0; i < 7; i++) {
      const dayPosts: GeneratedSocialPost[] = [];
      
      // Generate 1-2 posts per day per platform
      for (const platform of platforms) {
        const topic = topics[Math.floor(Math.random() * topics.length)];
        
        try {
          const post = await this.generatePost({
            platform,
            topic,
            tone: i % 2 === 0 ? "professional" : "casual",
            includeHashtags: true,
            includeEmojis: true,
          });
          
          dayPosts.push(post);
        } catch (error) {
          console.error(`Failed to generate post for ${platform} on ${daysOfWeek[i]}`);
        }
      }

      calendar.week.push({
        day: daysOfWeek[i],
        posts: dayPosts,
      });
    }

    return calendar;
  }

  /**
   * Generate multiple post variations for A/B testing
   */
  static async generateVariations(
    request: SocialPostRequest,
    count: number = 3
  ): Promise<GeneratedSocialPost[]> {
    const variations: GeneratedSocialPost[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const post = await this.generatePost({
          ...request,
          tone: i === 0 ? "professional" : i === 1 ? "casual" : "inspirational",
        });
        variations.push(post);
      } catch (error) {
        console.error(`Failed to generate variation ${i + 1}`);
      }
    }

    return variations;
  }

  /**
   * Analyze post performance and suggest improvements
   */
  static async analyzePost(
    content: string,
    platform: SocialPlatform,
    metrics?: { likes?: number; shares?: number; comments?: number }
  ): Promise<{ score: number; suggestions: string[] }> {
    if (!openai) {
      throw new Error("OpenAI API key not configured");
    }

    const prompt = `Analyze this ${platform} post and provide improvement suggestions:

Post: "${content}"

${metrics ? `Performance metrics:
- Likes: ${metrics.likes || 0}
- Shares: ${metrics.shares || 0}
- Comments: ${metrics.comments || 0}` : ""}

Analyze:
1. Engagement potential
2. Clarity of message
3. Call-to-action effectiveness
4. Hashtag relevance
5. Emoji usage
6. Length optimization

Return JSON:
{
  "score": 0-100,
  "suggestions": ["Suggestion 1", "Suggestion 2", ...]
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a social media analytics expert. Return only valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 500,
      });

      const responseText = completion.choices[0].message.content || "{}";
      return JSON.parse(responseText);
    } catch (error) {
      console.error("Error analyzing post:", error);
      throw new Error("Failed to analyze post");
    }
  }

  // Helper methods

  private static getPlatformLimits(platform: SocialPlatform) {
    const limits = {
      twitter: { charLimit: 280, hashtagCount: 2 },
      facebook: { charLimit: 500, hashtagCount: 3 },
      instagram: { charLimit: 2200, hashtagCount: 30 },
      pinterest: { charLimit: 500, hashtagCount: 20 },
      linkedin: { charLimit: 3000, hashtagCount: 5 },
    };

    return limits[platform] || limits.facebook;
  }

  private static getOptimalPostTime(platform: SocialPlatform): string {
    const times = {
      twitter: "12:00 PM - 1:00 PM (Weekdays)",
      facebook: "1:00 PM - 3:00 PM (Wed-Fri)",
      instagram: "11:00 AM - 1:00 PM (Wed-Fri)",
      pinterest: "8:00 PM - 11:00 PM (Sat)",
      linkedin: "7:00 AM - 9:00 AM (Tue-Thu)",
    };

    return times[platform] || "12:00 PM - 3:00 PM";
  }

  private static generateSuggestions(
    content: string,
    characterCount: number,
    limits: { charLimit: number; hashtagCount: number },
    platform: SocialPlatform
  ): string[] {
    const suggestions: string[] = [];

    if (characterCount > limits.charLimit) {
      suggestions.push(`Content exceeds ${platform} character limit (${characterCount}/${limits.charLimit})`);
    }

    if (characterCount < limits.charLimit * 0.5) {
      suggestions.push("Consider adding more detail to increase engagement");
    }

    if (!content.includes("?") && !content.includes("!")) {
      suggestions.push("Add a question or exclamation to boost engagement");
    }

    const hashtagCount = (content.match(/#/g) || []).length;
    if (hashtagCount === 0) {
      suggestions.push("Add relevant hashtags to increase discoverability");
    } else if (hashtagCount > limits.hashtagCount) {
      suggestions.push(`Reduce hashtags to ${limits.hashtagCount} or fewer for ${platform}`);
    }

    if (!content.toLowerCase().includes("link") && !content.includes("http")) {
      suggestions.push("Consider adding a link to drive traffic");
    }

    return suggestions;
  }
}
