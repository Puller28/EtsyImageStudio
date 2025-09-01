# Quick Blog API Examples

## Getting Your JWT Token First

To use write operations, you need authentication. Here's how to get a token:

```bash
# 1. Register or login to get JWT token
curl -X POST "https://imageupscaler.app/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@domain.com","password":"your-password"}'

# Response will include: {"token": "your-jwt-token-here"}
```

## Read Operations (No Auth Required)

```bash
# Get all blog posts
curl "https://imageupscaler.app/api/blog/posts"

# Get only published posts
curl "https://imageupscaler.app/api/blog/posts?status=published"

# Get only drafts
curl "https://imageupscaler.app/api/blog/posts?status=draft"

# Get specific post
curl "https://imageupscaler.app/api/blog/posts/ai-art-generation-guide-2025"
```

## Write Operations (Auth Required)

Replace `YOUR_JWT_TOKEN` with your actual token:

```bash
# Create new blog post
curl -X POST "https://imageupscaler.app/api/blog/posts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "my-awesome-post",
    "title": "My Awesome Blog Post",
    "excerpt": "This is an amazing post about digital art.",
    "content": "# My Post\n\nContent goes here...",
    "category": "Tutorial",
    "tags": ["tutorial", "art", "tips"],
    "status": "draft"
  }'

# Update existing post
curl -X PUT "https://imageupscaler.app/api/blog/posts/my-awesome-post" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "featured": true
  }'

# Publish a post
curl -X POST "https://imageupscaler.app/api/blog/posts/my-awesome-post/publish" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Delete a post
curl -X DELETE "https://imageupscaler.app/api/blog/posts/my-awesome-post" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Content Creation Workflow

1. **Create Draft**: Start with status "draft"
2. **Review & Edit**: Update content as needed
3. **Publish**: Use publish endpoint or update status to "published"
4. **SEO Automatic**: IndexNow submission happens automatically

## External Tool Integration

For programmatic content generation:

```python
import requests

# Your authentication token
headers = {"Authorization": "Bearer YOUR_JWT_TOKEN"}

# Create blog post from AI-generated content
post_data = {
    "slug": "ai-generated-art-trends",
    "title": "AI Art Trends for 2025",
    "excerpt": "Generated excerpt...",
    "content": "Generated content...",
    "category": "AI Art",
    "tags": ["ai", "art", "trends"],
    "status": "draft"
}

response = requests.post(
    "https://imageupscaler.app/api/blog/posts",
    headers=headers,
    json=post_data
)

if response.status_code == 201:
    print("Post created successfully!")
    # Auto-publish if content is ready
    slug = post_data["slug"]
    publish_response = requests.post(
        f"https://imageupscaler.app/api/blog/posts/{slug}/publish",
        headers=headers
    )
    print("Published and submitted to search engines!")
```

## Status Codes

- **200**: Success (GET, PUT operations)
- **201**: Created successfully (POST operations)
- **400**: Invalid data or validation error
- **401**: Authentication required
- **404**: Blog post not found
- **409**: Slug already exists
- **500**: Server error

## Next Steps

1. Get your JWT token through login
2. Create test posts using the API
3. Integrate with your content generation tools
4. Monitor SEO performance through search console

The system automatically handles SEO optimization, search engine notifications, and sitemap updates when you publish content.