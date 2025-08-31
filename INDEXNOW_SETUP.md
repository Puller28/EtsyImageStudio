# IndexNow API Setup Guide

## Overview
IndexNow is a protocol that allows websites to instantly notify search engines when content is updated, instead of waiting for crawlers to discover changes.

## Setup Completed
✅ **API Key Generated**: `7f8a2c9b4e1d6f3a8c5b9e2d4f7a1c8e`
✅ **Verification File**: `/7f8a2c9b4e1d6f3a8c5b9e2d4f7a1c8e.txt` (contains the API key)
✅ **API Endpoint**: `POST /api/indexnow` (accepts URLs for instant indexing)

## How to Use

### Submit URLs for Instant Indexing
```bash
curl -X POST "https://imageupscaler.app/api/indexnow" \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "/blog/new-article",
      "/features",
      "/updated-page"
    ]
  }'
```

### Response Format
```json
{
  "success": true,
  "status": 200,
  "submitted": 3,
  "message": "URLs submitted for indexing"
}
```

## When to Use IndexNow

1. **New Blog Posts**: Submit immediately after publishing
2. **Page Updates**: When content is significantly updated
3. **New Features**: When adding new pages or functionality
4. **SEO Changes**: After updating meta tags, titles, or descriptions

## Automatic Usage Examples

### After Publishing Blog Content
```javascript
// In your CMS or publishing workflow
await fetch('/api/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    urls: ['/blog/new-post-slug']
  })
});
```

### After Sitemap Updates
```javascript
// Submit all updated URLs from sitemap
const updatedUrls = [
  '/new-feature',
  '/updated-pricing',
  '/blog/latest-guide'
];

await fetch('/api/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ urls: updatedUrls })
});
```

## Benefits

- **Faster Indexing**: Search engines get notified instantly instead of waiting for crawls
- **Better SEO**: New content appears in search results much faster
- **Resource Efficient**: Reduces unnecessary crawling of unchanged pages
- **Multi-Engine Support**: Works with Bing, Yandex, and other participating search engines

## Search Engine Compatibility

- ✅ **Bing**: Primary supporter of IndexNow protocol
- ✅ **Yandex**: Full support for IndexNow
- ⚠️ **Google**: Indirect benefits through faster discovery
- ✅ **Other Engines**: Many smaller engines support the protocol

## Technical Details

- **API Key**: `7f8a2c9b4e1d6f3a8c5b9e2d4f7a1c8e`
- **Key Location**: `https://imageupscaler.app/7f8a2c9b4e1d6f3a8c5b9e2d4f7a1c8e.txt`
- **Endpoint**: `https://api.indexnow.org/indexnow`
- **Host**: `imageupscaler.app`
- **Method**: POST
- **Content-Type**: `application/json; charset=utf-8`

## Status Codes

- **200**: Success - URLs submitted for indexing
- **202**: Accepted - URLs queued for processing
- **400**: Bad Request - Invalid URL format or missing data
- **422**: Unprocessable Entity - Invalid key or host
- **429**: Too Many Requests - Rate limit exceeded

## Best Practices

1. **Batch URLs**: Submit multiple URLs in one request when possible
2. **Valid URLs**: Ensure all URLs are accessible and return 200 status
3. **Recent Changes**: Only submit URLs that have actually changed
4. **Rate Limiting**: Don't exceed reasonable submission frequency
5. **Monitor Results**: Check response status codes for successful submissions

## Verification

The IndexNow key file is accessible at:
`https://imageupscaler.app/7f8a2c9b4e1d6f3a8c5b9e2d4f7a1c8e.txt`

This file contains the API key and proves ownership of the domain to search engines.