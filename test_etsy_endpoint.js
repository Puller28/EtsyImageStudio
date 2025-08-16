import { generateEtsyListing } from './server/services/openai.js';

async function testEtsyEndpoint() {
  try {
    console.log('🧪 Testing Etsy listing generation directly...');
    
    const result = await generateEtsyListing('Abstract Sunset', 'modern, vibrant, colorful');
    
    console.log('✅ Direct function call successful!');
    console.log('📋 Result:', JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('❌ Direct function call failed:', error.message);
    console.error('Full error:', error);
    throw error;
  }
}

testEtsyEndpoint()
  .then(() => console.log('🎉 Direct test completed successfully'))
  .catch(() => console.log('💥 Direct test failed'));