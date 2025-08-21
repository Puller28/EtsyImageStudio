import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';

async function testCreditDeduction() {
  try {
    console.log('🧪 Testing credit deduction...');
    
    // First, get current user data to check credits before
    const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxZTQxZjc5MS04NGQ0LTRiYWEtYjg2NC00NzE3NTlhYTI5NDciLCJlbWFpbCI6Imxsb2Rld3lrc0BpbnNwaXJlZHRlc3RpbmcuY28uemEiLCJuYW1lIjoiTGxvZGV3eWtzIEpvcmRhYW4iLCJpYXQiOjE3Mzc1NTE4NTEsImV4cCI6MTczODE1NjY1MX0.rI8xjdBGvN8i_VUJ0rHE-JXOqhEV7_PeF0pGJqGWz14";
    
    const userResponse = await axios.get('http://localhost:5000/api/user', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    console.log('👤 User before test:', {
      name: userResponse.data.name,
      credits: userResponse.data.credits,
      id: userResponse.data.id
    });
    
    // Read the test image file
    const imageBuffer = fs.readFileSync('./test_artwork.jpg');
    
    // Create form data for project upload
    const form = new FormData();
    form.append('image', imageBuffer, 'test.jpg');
    form.append('artworkTitle', 'Test Credit Deduction');
    form.append('upscaleOption', '2x'); // Should cost 1 credit
    
    console.log('📤 Uploading project to test credit deduction...');
    
    const response = await axios.post('http://localhost:5000/api/projects', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${authToken}`
      },
      timeout: 30000
    });
    
    console.log('✅ Project created:', response.data.id);
    
    // Check user credits after
    const userAfterResponse = await axios.get('http://localhost:5000/api/user', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    console.log('👤 User after test:', {
      name: userAfterResponse.data.name,
      credits: userAfterResponse.data.credits,
      id: userAfterResponse.data.id
    });
    
    const creditDifference = userResponse.data.credits - userAfterResponse.data.credits;
    console.log(`💰 Credits deducted: ${creditDifference}`);
    
    if (creditDifference === 1) {
      console.log('✅ CREDIT DEDUCTION WORKING CORRECTLY!');
    } else {
      console.log('❌ CREDIT DEDUCTION NOT WORKING! Expected 1, got', creditDifference);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testCreditDeduction();