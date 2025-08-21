import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';

async function testProjectCreation() {
  try {
    console.log('🧪 Testing project creation and persistence...');
    
    // Create a demo user for testing
    const registerResponse = await axios.post('http://localhost:5000/api/auth/register', {
      email: 'testuser@example.com',
      password: 'test123',
      name: 'Test User'
    }).catch(err => {
      if (err.response?.status === 409) {
        console.log('👤 Test user already exists, proceeding with login...');
        return null;
      }
      throw err;
    });

    // Login to get auth token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'testuser@example.com', 
      password: 'test123'
    });
    
    const { token } = loginResponse.data;
    console.log('🔑 Authenticated successfully');
    
    // Check user before project creation
    const userBefore = await axios.get('http://localhost:5000/api/user', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`👤 User before: Credits=${userBefore.data.credits}, ID=${userBefore.data.id}`);
    
    // Check projects before creation
    const projectsBefore = await axios.get('http://localhost:5000/api/projects', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`📋 Projects before: ${projectsBefore.data.length} projects`);
    
    // Create test image file
    const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'); // 1x1 pixel PNG
    
    // Create form data for project upload
    const form = new FormData();
    form.append('image', testImageBuffer, 'test.png');
    form.append('artworkTitle', 'Test Project Creation');
    form.append('upscaleOption', '2x');
    
    console.log('📤 Creating project...');
    
    const projectResponse = await axios.post('http://localhost:5000/api/projects', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`
      },
      timeout: 15000
    });
    
    console.log('✅ Project created:', {
      id: projectResponse.data.id,
      title: projectResponse.data.title,
      status: projectResponse.data.status,
      userId: projectResponse.data.userId
    });
    
    // Check user after project creation (credits should be deducted)
    const userAfter = await axios.get('http://localhost:5000/api/user', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`👤 User after: Credits=${userAfter.data.credits} (should be ${userBefore.data.credits - 1})`);
    
    // Check if project appears in projects list
    const projectsAfter = await axios.get('http://localhost:5000/api/projects', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`📋 Projects after: ${projectsAfter.data.length} projects`);
    
    if (projectsAfter.data.length > projectsBefore.data.length) {
      console.log('✅ PROJECT PERSISTENCE WORKING - Project appears in list');
      console.log('📋 Project details:', projectsAfter.data[0]);
    } else {
      console.log('❌ PROJECT PERSISTENCE ISSUE - Project not in list');
    }
    
    const creditsDiff = userBefore.data.credits - userAfter.data.credits;
    if (creditsDiff === 1) {
      console.log('✅ CREDIT DEDUCTION WORKING - 1 credit deducted');
    } else {
      console.log(`❌ CREDIT DEDUCTION ISSUE - Expected -1, got ${creditsDiff}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('HTTP Status:', error.response.status);
    }
  }
}

testProjectCreation();