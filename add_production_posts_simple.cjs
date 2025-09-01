const https = require('https');

async function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function addBlogPosts() {
  // Login to get token
  const loginResponse = await makeRequest({
    hostname: 'imageupscaler.app',
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: 'blog-admin@imageupscaler.app',
    password: 'BlogAdmin2025!'
  });
  
  if (loginResponse.status !== 200) {
    console.log('❌ Login failed:', loginResponse.data);
    return;
  }
  
  const token = loginResponse.data.token;
  console.log('✅ Got admin token');
  
  // Simple test post
  const testPost = {
    slug: 'production-test-post',
    title: 'Production Test Post',
    excerpt: 'Testing blog functionality in production',
    content: 'This is a test post to verify the blog system works in production.',
    category: 'Test'
  };
  
  const response = await makeRequest({
    hostname: 'imageupscaler.app',
    path: '/api/blog/posts',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, testPost);
  
  console.log('Blog post creation result:', response.status, response.data);
}

addBlogPosts().catch(console.error);
