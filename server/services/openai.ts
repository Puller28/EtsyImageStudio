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
    console.log('Generating Etsy listing for:', { artworkTitle, styleKeywords });
    
    const prompt = `Create an optimized Etsy listing for a digital art print.
    
Artwork: ${artworkTitle}
Style/Keywords: ${styleKeywords}

Generate a complete listing with:
1. SEO-optimized title (max 140 chars) including "Digital Download" and "Printable Art"
2. Exactly 13 relevant tags (1-3 words each) for Etsy search
3. Compelling description with 3 paragraphs:
   - Paragraph 1: Describe the artwork's visual appeal and style
   - Paragraph 2: Suggest where/how to use it (home decor, office, gifts)  
   - Paragraph 3: What the buyer receives (formats, quality, instant download)

Return valid JSON only: {"title": "...", "tags": ["tag1", "tag2", ...], "description": "para1\\n\\npara2\\n\\npara3"}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    console.log('OpenAI response:', content);
    
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }
    
    const result = JSON.parse(content);
    console.log('Parsed result:', result);
    
    return {
      title: result.title || "Digital Art Print - Printable Wall Art Download",
      tags: Array.isArray(result.tags) ? result.tags.slice(0, 13) : [
        "digital download", "printable art", "wall art", "home decor", "instant download",
        "digital print", "wall decor", "printable poster", "art print", "digital art",
        "downloadable art", "modern art", "contemporary"
      ],
      description: result.description || `Beautiful digital art perfect for your home or office.

This versatile piece works great as wall art, in frames, or as part of a gallery wall. Perfect for living rooms, bedrooms, offices, or as a thoughtful gift.

You'll receive 5 high-resolution files (300 DPI) in multiple sizes, ready for instant download and printing.`
    };
  } catch (error) {
    console.error("Etsy listing generation failed:", error);
    throw new Error("Failed to generate Etsy listing: " + (error as Error).message);
  }
}
