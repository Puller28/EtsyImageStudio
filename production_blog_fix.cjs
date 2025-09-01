const https = require('https');

// Test production database table existence and create if needed
async function fixProductionBlogTable() {
  console.log('🔧 Fixing production blog table...');
  
  try {
    // Test if we can create the table via API
    const createResponse = await makeRequest({
      hostname: 'imageupscaler.app',
      path: '/api/admin/setup-blog-table',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('Admin endpoint response:', createResponse.status);

    // Login for authenticated operations
    const loginResponse = await makeRequest({
      hostname: 'imageupscaler.app',
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: 'blog-admin@imageupscaler.app',
      password: 'BlogAdmin2025!',
      name: 'Blog Administrator'
    });

    const authResponse = await makeRequest({
      hostname: 'imageupscaler.app',
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: 'blog-admin@imageupscaler.app',
      password: 'BlogAdmin2025!'
    });

    if (authResponse.status !== 200) {
      console.log('Auth failed, testing API directly...');
    }

    // Test the current API status
    const testResponse = await makeRequest({
      hostname: 'imageupscaler.app',
      path: '/api/blog/posts',
      method: 'GET'
    });

    console.log(`\n📊 Current API Status:`);
    console.log(`Status: ${testResponse.status}`);
    console.log(`Response: ${JSON.stringify(testResponse.data).substring(0, 200)}`);

    if (testResponse.status === 500) {
      console.log('\n⚠️  API returning 500 error - this confirms the blog_posts table issue');
      console.log('The production database needs the blog_posts table created directly');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

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

fixProductionBlogTable();
