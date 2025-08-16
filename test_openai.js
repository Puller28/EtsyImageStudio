import OpenAI from 'openai';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

async function testEtsyListing() {
  try {
    console.log('🧪 Testing OpenAI service...');
    
    const prompt = `Create an optimized Etsy listing for a digital art print.
    
Artwork: Abstract Sunset
Style/Keywords: modern, vibrant, colorful

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
    console.log('✅ OpenAI response received');
    
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }
    
    const result = JSON.parse(content);
    console.log('✅ JSON parsed successfully');
    console.log('📋 Title:', result.title);
    console.log('📋 Tags count:', result.tags?.length || 0);
    console.log('📋 Description length:', result.description?.length || 0);
    
    return result;
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    throw error;
  }
}

// Run the test
testEtsyListing()
  .then(() => console.log('🎉 Test completed successfully'))
  .catch(() => console.log('💥 Test failed'));