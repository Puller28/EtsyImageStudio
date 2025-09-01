# Blog Management API

## Overview
Complete blog management system with authentication, validation, and automatic SEO integration. Create, update, publish, and manage blog posts through RESTful API endpoints.

## Authentication
All write operations (POST, PUT, DELETE) require JWT authentication. Include your JWT token in the Authorization header:

```bash
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Create Blog Post
**POST** `/api/blog/posts`

Creates a new blog post with validation and automatic slug checking.

**Request Body:**
```json
{
  "slug": "my-new-blog-post",
  "title": "How to Create Amazing Digital Art",
  "excerpt": "Learn the secrets of creating stunning digital art that sells on Etsy and other marketplaces.",
  "content": "# Introduction\n\nDigital art has become...",
  "category": "Digital Art",
  "tags": ["digital-art", "etsy", "tutorial"],
  "status": "draft",
  "featured": false,
  "readTime": "8 min read",
  "seoTitle": "Digital Art Creation Guide - Pro Tips for 2025",
  "seoDescription": "Complete guide to creating digital art that sells. Learn techniques, tools, and strategies used by successful artists."
}
```

**Required Fields:**
- `slug` - URL-friendly identifier (lowercase, hyphens only)
- `title` - Blog post title (max 200 chars)
- `excerpt` - Brief description (max 500 chars)
- `content` - Full blog post content (Markdown supported)
- `category` - Post category

**Optional Fields:**
- `tags` - Array of tag strings
- `status` - "draft" (default), "published", or "archived"
- `featured` - Boolean (default: false)
- `readTime` - Estimated read time (default: "5 min read")
- `seoTitle` - Custom SEO title (max 200 chars)
- `seoDescription` - Custom SEO description (max 500 chars)

**Response:**
```json
{
  "success": true,
  "message": "Blog post created successfully",
  "blogPost": {
    "id": "uuid",
    "slug": "my-new-blog-post",
    "title": "How to Create Amazing Digital Art",
    "status": "draft",
    "createdAt": "2025-01-01T12:00:00Z"
  }
}
```

### 2. Get All Blog Posts
**GET** `/api/blog/posts`

Retrieves all blog posts with optional status filtering.

**Query Parameters:**
- `status` (optional) - Filter by status: "draft", "published", or "archived"

**Examples:**
```bash
# Get all posts
GET /api/blog/posts

# Get only published posts
GET /api/blog/posts?status=published

# Get only drafts
GET /api/blog/posts?status=draft
```

**Response:**
```json
{
  "count": 15,
  "posts": [
    {
      "id": "uuid",
      "slug": "latest-post",
      "title": "Latest Blog Post",
      "excerpt": "This is the excerpt...",
      "author": "Digital Art Team",
      "category": "Tutorials",
      "status": "published",
      "featured": true,
      "publishedAt": "2025-01-01T12:00:00Z",
      "createdAt": "2025-01-01T10:00:00Z",
      "updatedAt": "2025-01-01T11:00:00Z"
    }
  ]
}
```

### 3. Get Specific Blog Post
**GET** `/api/blog/posts/:slug`

Retrieves a single blog post by its slug.

**Example:**
```bash
GET /api/blog/posts/how-to-create-digital-art
```

**Response:**
```json
{
  "id": "uuid",
  "slug": "how-to-create-digital-art",
  "title": "How to Create Amazing Digital Art",
  "excerpt": "Learn the secrets...",
  "content": "# Introduction\n\nDigital art has...",
  "author": "Digital Art Team",
  "category": "Digital Art",
  "tags": ["digital-art", "tutorial"],
  "status": "published",
  "featured": false,
  "readTime": "8 min read",
  "seoTitle": "Digital Art Creation Guide",
  "seoDescription": "Complete guide to creating...",
  "publishedAt": "2025-01-01T12:00:00Z",
  "createdAt": "2025-01-01T10:00:00Z",
  "updatedAt": "2025-01-01T11:00:00Z"
}
```

### 4. Update Blog Post
**PUT** `/api/blog/posts/:slug`

Updates an existing blog post. All fields are optional in updates.

**Request Body (partial update):**
```json
{
  "title": "Updated Title",
  "status": "published",
  "featured": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Blog post updated successfully",
  "blogPost": {
    "id": "uuid",
    "slug": "how-to-create-digital-art",
    "title": "Updated Title",
    "status": "published",
    "updatedAt": "2025-01-01T14:00:00Z"
  }
}
```

### 5. Publish Blog Post
**POST** `/api/blog/posts/:slug/publish`

Quick way to publish a draft post. Sets status to "published" and publishedAt timestamp.

**Example:**
```bash
POST /api/blog/posts/my-draft-post/publish
```

**Response:**
```json
{
  "success": true,
  "message": "Blog post published successfully",
  "blogPost": {
    "id": "uuid",
    "slug": "my-draft-post",
    "status": "published",
    "publishedAt": "2025-01-01T15:00:00Z"
  }
}
```

### 6. Delete Blog Post
**DELETE** `/api/blog/posts/:slug`

Permanently deletes a blog post.

**Example:**
```bash
DELETE /api/blog/posts/unwanted-post
```

**Response:**
```json
{
  "success": true,
  "message": "Blog post deleted successfully"
}
```

## Features

### Automatic SEO Integration
- Published posts are automatically submitted to IndexNow for immediate search engine indexing
- Sitemap updates are triggered when posts are published
- Canonical URLs are automatically set for all blog posts

### Validation
- Slug format validation (lowercase, hyphens only)
- Content length limits
- Required field checking
- Duplicate slug prevention

### Status Management
- **Draft** - Not visible to public, can be edited
- **Published** - Live on website, indexed by search engines
- **Archived** - Hidden from public but preserved

## Example Workflows

### Creating and Publishing a New Post
```bash
# 1. Create draft post
curl -X POST "https://imageupscaler.app/api/blog/posts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "ai-art-trends-2025",
    "title": "AI Art Trends That Will Dominate 2025",
    "excerpt": "Discover the upcoming AI art trends that will shape the digital art landscape in 2025.",
    "content": "# AI Art Revolution\n\nThe digital art world is evolving...",
    "category": "AI Art",
    "tags": ["ai-art", "trends", "2025"],
    "status": "draft"
  }'

# 2. Review and edit if needed
curl -X PUT "https://imageupscaler.app/api/blog/posts/ai-art-trends-2025" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "featured": true,
    "seoTitle": "AI Art Trends 2025 - Digital Artist Guide"
  }'

# 3. Publish when ready
curl -X POST "https://imageupscaler.app/api/blog/posts/ai-art-trends-2025/publish" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Bulk Content Management
```bash
# Get all drafts
curl "https://imageupscaler.app/api/blog/posts?status=draft"

# Get published posts for review
curl "https://imageupscaler.app/api/blog/posts?status=published"

# Archive old content
curl -X PUT "https://imageupscaler.app/api/blog/posts/old-post-slug" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "archived"}'
```

## Error Handling

### Common Error Responses

**400 Bad Request** - Invalid data
```json
{
  "error": "Invalid blog post data",
  "details": [
    {
      "field": "slug",
      "message": "Slug must contain only lowercase letters, numbers, and hyphens"
    }
  ]
}
```

**401 Unauthorized** - Missing or invalid authentication
```json
{
  "error": "Authentication required"
}
```

**404 Not Found** - Blog post doesn't exist
```json
{
  "error": "Blog post not found",
  "slug": "non-existent-post"
}
```

**409 Conflict** - Slug already exists
```json
{
  "error": "Blog post with this slug already exists",
  "slug": "duplicate-slug"
}
```

**500 Internal Server Error** - Server issue
```json
{
  "error": "Failed to create blog post"
}
```

## Best Practices

1. **Use Descriptive Slugs**: Make URLs meaningful and SEO-friendly
2. **Write Compelling Excerpts**: These appear in blog listings and search results
3. **Optimize Content**: Use headings, bullet points, and clear structure
4. **Set Read Times**: Help users understand content length
5. **Use Relevant Tags**: Improve content discoverability
6. **Test Drafts**: Always review before publishing
7. **Monitor SEO**: Check that published posts are indexed properly

## Rate Limits
- No specific rate limits are enforced
- Be reasonable with API usage to maintain performance
- Bulk operations should be batched appropriately

## Support
For API issues or questions, contact support through the standard channels. Include request/response details for faster troubleshooting.