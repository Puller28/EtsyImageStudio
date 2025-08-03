import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export async function generateEtsyListing(artworkTitle: string, styleKeywords: string): Promise<{
  title: string;
  tags: string[];
  description: string;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert Etsy SEO specialist. Generate optimized listing content for digital art prints. 
          
          Requirements:
          - Title: Maximum 140 characters, include main keywords, mention "Digital Download" and "Printable Art"
          - Tags: Exactly 13 tags, each 1-3 words, relevant to Etsy search terms
          - Description: 3 paragraphs - (1) describe artwork and appeal, (2) usage/placement suggestions, (3) what buyer receives
          
          Respond with JSON in this exact format: { "title": "string", "tags": ["tag1", "tag2", ...], "description": "paragraph1\\n\\nparagraph2\\n\\nparagraph3" }`
        },
        {
          role: "user",
          content: `Artwork: ${artworkTitle}\nStyle: ${styleKeywords}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      title: result.title || "",
      tags: Array.isArray(result.tags) ? result.tags.slice(0, 13) : [],
      description: result.description || ""
    };
  } catch (error) {
    throw new Error("Failed to generate Etsy listing: " + (error as Error).message);
  }
}
