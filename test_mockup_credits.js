import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';

async function testMockupCredits() {
  try {
    console.log('🧪 Testing mockup credit deduction...');
    
    // Login to get auth token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'testuser@example.com', 
      password: 'test123'
    });
    
    const { token } = loginResponse.data;
    console.log('🔑 Authenticated successfully');
    
    // Check user credits before mockup generation
    const userBefore = await axios.get('http://localhost:5000/api/user', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`👤 User before mockup: Credits=${userBefore.data.credits}`);
    
    // Create test image file
    const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'); // 1x1 pixel PNG
    
    // Create form data for mockup generation (select 3 templates = 3 credits)
    const form = new FormData();
    form.append('file', testImageBuffer, 'test.jpg');
    form.append('templates', JSON.stringify([
      { room: 'living_room', id: 'living_room_01', name: 'Modern Living Room' },
      { room: 'bedroom', id: 'bedroom_01', name: 'Cozy Bedroom' },
      { room: 'study', id: 'study_01', name: 'Home Office' }
    ]));
    
    console.log('🎨 Generating mockups (3 templates = 3 credits expected)...');
    
    const mockupResponse = await axios.post('http://localhost:5000/api/apply-templates', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`
      },
      timeout: 30000
    });
    
    console.log('✅ Mockup generation completed');
    
    // Check user credits after mockup generation
    const userAfter = await axios.get('http://localhost:5000/api/user', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`👤 User after mockup: Credits=${userAfter.data.credits}`);
    
    const creditsDiff = userBefore.data.credits - userAfter.data.credits;
    console.log(`💰 Credits difference: ${creditsDiff} (expected: 3)`);
    
    if (creditsDiff === 3) {
      console.log('✅ MOCKUP CREDIT DEDUCTION WORKING - 3 credits properly deducted');
    } else {
      console.log(`❌ MOCKUP CREDIT DEDUCTION ISSUE - Expected -3, got ${creditsDiff}`);
    }
    
    // Also check if a project was created for the mockup set
    const projects = await axios.get('http://localhost:5000/api/projects', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const mockupProjects = projects.data.filter(p => p.title && p.title.includes('Mockup Set'));
    console.log(`📋 Mockup projects found: ${mockupProjects.length}`);
    
    if (mockupProjects.length > 0) {
      console.log('✅ MOCKUP PROJECT CREATED - Project saved to user dashboard');
      console.log(`📋 Project: ${mockupProjects[0].title}`);
    } else {
      console.log('❌ MOCKUP PROJECT MISSING - No project created for mockup set');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('HTTP Status:', error.response.status);
    }
  }
}

testMockupCredits();