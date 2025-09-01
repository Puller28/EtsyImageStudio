# Authentication Workflow for Blog API

## Quick Start: Getting Your JWT Token

### Step 1: Register a New User (if needed)
```bash
curl -X POST "https://imageupscaler.app/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@domain.com",
    "password": "your-secure-password",
    "name": "Your Name"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "email": "your-email@domain.com",
    "name": "Your Name"
  }
}
```

### Step 2: Login to Get JWT Token
```bash
curl -X POST "https://imageupscaler.app/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@domain.com",
    "password": "your-secure-password"
  }'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLWlkIiwiaWF0IjoxNjc4OTg3NjU0LCJleHAiOjE2NzkwNzQwNTR9.signature",
  "user": {
    "id": "user-id",
    "email": "your-email@domain.com",
    "name": "Your Name",
    "credits": 100
  }
}
```

### Step 3: Use JWT Token for Blog Operations
```bash
# Save your token
export JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Now you can create blog posts
curl -X POST "https://imageupscaler.app/api/blog/posts" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "my-first-post",
    "title": "My First Blog Post",
    "excerpt": "This is my first post using the API",
    "content": "# Hello World\n\nThis is my first blog post!",
    "category": "General"
  }'
```

## Authentication Details

### Token Expiration
- JWT tokens typically expire after 24 hours
- You'll need to login again when the token expires
- The API will return `401 Unauthorized` when your token expires

### Error Responses

**Invalid Credentials:**
```json
{
  "error": "Invalid email or password"
}
```

**Missing Token:**
```json
{
  "error": "Access token required"
}
```

**Expired Token:**
```json
{
  "error": "Token expired"
}
```

## Complete Workflow Example

### Python Script
```python
import requests

class BlogAuthenticator:
    def __init__(self, base_url):
        self.base_url = base_url.rstrip('/')
        self.token = None
        self.user = None
    
    def login(self, email, password):
        """Login and store JWT token"""
        response = requests.post(
            f'{self.base_url}/api/auth/login',
            json={'email': email, 'password': password}
        )
        
        if response.status_code == 200:
            data = response.json()
            self.token = data['token']
            self.user = data['user']
            print(f"✅ Logged in as {self.user['name']}")
            return True
        else:
            print(f"❌ Login failed: {response.json().get('error', 'Unknown error')}")
            return False
    
    def register(self, email, password, name):
        """Register new user and automatically login"""
        response = requests.post(
            f'{self.base_url}/api/auth/register',
            json={'email': email, 'password': password, 'name': name}
        )
        
        if response.status_code == 201:
            data = response.json()
            self.token = data['token']
            self.user = data['user']
            print(f"✅ Registered and logged in as {name}")
            return True
        else:
            print(f"❌ Registration failed: {response.json().get('error', 'Unknown error')}")
            return False
    
    def get_headers(self):
        """Get authorization headers for API calls"""
        if not self.token:
            raise Exception("Not authenticated. Please login first.")
        
        return {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
    
    def create_blog_post(self, post_data):
        """Create blog post using stored token"""
        response = requests.post(
            f'{self.base_url}/api/blog/posts',
            headers=self.get_headers(),
            json=post_data
        )
        return response

# Usage example
auth = BlogAuthenticator('https://imageupscaler.app')

# Login with existing account
if auth.login('your-email@domain.com', 'your-password'):
    # Create a blog post
    post_data = {
        "slug": "api-test-post",
        "title": "Testing the Blog API",
        "excerpt": "A test post created via the API",
        "content": "# API Test\n\nThis post was created using the blog API!",
        "category": "Testing"
    }
    
    response = auth.create_blog_post(post_data)
    if response.status_code == 201:
        print("✅ Blog post created successfully!")
    else:
        print(f"❌ Failed to create post: {response.json()}")
```

### JavaScript/Node.js Example
```javascript
class BlogAuth {
    constructor(baseURL) {
        this.baseURL = baseURL.replace(/\/$/, '');
        this.token = null;
        this.user = null;
    }
    
    async login(email, password) {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.token = data.token;
                this.user = data.user;
                console.log(`✅ Logged in as ${this.user.name}`);
                return true;
            } else {
                console.log(`❌ Login failed: ${data.error}`);
                return false;
            }
        } catch (error) {
            console.log(`❌ Login error: ${error.message}`);
            return false;
        }
    }
    
    getAuthHeaders() {
        if (!this.token) {
            throw new Error('Not authenticated. Please login first.');
        }
        
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }
    
    async createBlogPost(postData) {
        const response = await fetch(`${this.baseURL}/api/blog/posts`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(postData)
        });
        
        return response.json();
    }
}

// Usage
const auth = new BlogAuth('https://imageupscaler.app');

async function main() {
    // Login
    const loginSuccess = await auth.login('your-email@domain.com', 'your-password');
    
    if (loginSuccess) {
        // Create blog post
        const result = await auth.createBlogPost({
            slug: 'js-api-test',
            title: 'JavaScript API Test',
            excerpt: 'Testing the API with JavaScript',
            content: '# JS Test\n\nCreated with JavaScript!',
            category: 'Development'
        });
        
        console.log('Blog post result:', result);
    }
}

main();
```

## Security Notes

1. **Store tokens securely** - Don't expose JWT tokens in client-side code
2. **Use environment variables** for credentials in production
3. **Handle token expiration** gracefully in your applications
4. **Use HTTPS** in production to protect credentials in transit

## Testing Your Setup

1. **Register or login** to get your JWT token
2. **Test with curl** using the examples above
3. **Verify token works** by creating a test blog post
4. **Check the blog** appears in the API response

The authentication system is straightforward - just login with your email/password to get a JWT token, then include that token in the Authorization header for all blog management operations.