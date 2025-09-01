const https = require('https');

const blogPosts = [
  {
    slug: 'ai-art-etsy-success-guide-2025',
    title: 'How AI Art Generation is Revolutionizing Etsy Success in 2025',
    excerpt: 'Navigate the AI art revolution on Etsy with proven strategies that successful sellers use to generate $5,000+ monthly revenue. Learn the complete workflow from AI generation to optimized listings that sell.',
    content: 'Full content here...',
    category: 'AI Art',
    tags: ['ai art', 'etsy', 'business', '2025'],
    status: 'published',
    featured: true,
    readTime: '15 min read'
  }
];

function makeRequest(options, data = null) {
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

async function deployPosts() {
  // First ensure admin user exists
  await makeRequest({
    hostname: 'imageupscaler.app',
    path: '/api/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: 'blog-admin@imageupscaler.app',
    password: 'BlogAdmin2025!',
    name: 'Blog Administrator'
  });

  // Login
  const authResponse = await makeRequest({
    hostname: 'imageupscaler.app',
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: 'blog-admin@imageupscaler.app',
    password: 'BlogAdmin2025!'
  });

  if (authResponse.status === 200) {
    const token = authResponse.data.token;
    
    // Create a test post
    const createResponse = await makeRequest({
      hostname: 'imageupscaler.app',
      path: '/api/blog/posts',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, blogPosts[0]);
    
    console.log('Post creation response:', createResponse.status, createResponse.data);
  }
}

deployPosts();
