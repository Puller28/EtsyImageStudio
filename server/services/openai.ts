import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
// Debug environment variables
console.log('🔐 OpenAI Environment Debug:', {
  hasOPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
  OPENAI_API_KEY_length: process.env.OPENAI_API_KEY?.length,
  OPENAI_API_KEY_preview: process.env.OPENAI_API_KEY?.substring(0, 10) + '...',
  allEnvKeys: Object.keys(process.env).filter(key => key.includes('OPENAI')),
});

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey || apiKey === "default_key") {
  throw new Error(`OpenAI API key not found in environment. Available keys: ${Object.keys(process.env).filter(key => key.includes('OPENAI')).join(', ')}`);
}

const openai = new OpenAI({ 
  apiKey: apiKey
});

export async function generateEtsyListing(artworkTitle: string, styleKeywords: string): Promise<{
  title: string;
  tags: string[];
  description: string;
}> {
  try {
    console.log('🎨 OpenAI Service: Generating Etsy listing for:', { artworkTitle, styleKeywords });
    console.log('🔑 OpenAI Service: API key status:', { hasKey: !!process.env.OPENAI_API_KEY, keyLength: process.env.OPENAI_API_KEY?.length });
    
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

    console.log('🔄 OpenAI Service: Making API call...');
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
    console.log('✅ OpenAI Service: API call successful');

    const content = response.choices[0]?.message?.content;
    console.log('📝 OpenAI Service: Raw response:', content);
    
    if (!content) {
      console.error('❌ OpenAI Service: Empty response from OpenAI');
      throw new Error("Empty response from OpenAI");
    }
    
    console.log('🔍 OpenAI Service: Parsing JSON...');
    const result = JSON.parse(content);
    console.log('✅ OpenAI Service: Parsed result:', result);
    
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
    console.error("❌ OpenAI Service: Etsy listing generation failed:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type',
      cause: error instanceof Error ? error.cause : undefined
    });
    throw new Error("Failed to generate Etsy listing: " + (error as Error).message);
  }
}
