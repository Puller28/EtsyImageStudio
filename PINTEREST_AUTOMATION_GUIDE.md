# Pinterest Automation Workflow - Complete Guide

## 🎯 Overview

Automatic Pinterest posting system that creates and publishes 3-5 optimized pins whenever you publish a blog post. Includes branded image generation, multiple pin variations, and analytics tracking.

---

## 📋 Features

✅ **Auto-Posting**: Automatically posts to Pinterest when you publish a blog  
✅ **Image Generation**: Creates Pinterest-optimized images (1000x1500px)  
✅ **Multiple Templates**: Blog-post, quote, list, tutorial, before-after  
✅ **Pin Variations**: 3-5 different pins per blog post  
✅ **Branded Images**: Automatic ImageUpscaler.app branding  
✅ **API Integration**: Full Pinterest API v5 support  
✅ **Board Management**: Create and manage boards programmatically  
✅ **Analytics Ready**: Track pin performance  

---

## 🚀 Setup Instructions

### Step 1: Get Pinterest API Access

1. **Create Pinterest Business Account**
   - Go to https://business.pinterest.com/
   - Sign up or convert personal account
   - Verify your website (imageupscaler.app)

2. **Create Pinterest App**
   - Go to https://developers.pinterest.com/apps/
   - Click "Create app"
   - Fill in details:
     - App name: "ImageUpscaler Blog Automation"
     - Description: "Automated blog content posting"
     - Website: https://imageupscaler.app

3. **Get Access Token**
   - In your app dashboard, go to "OAuth"
   - Generate access token with scopes:
     - `boards:read`
     - `boards:write`
     - `pins:read`
     - `pins:write`
   - Copy the access token (starts with `pina_`)

### Step 2: Create Pinterest Boards

Create these boards on Pinterest (manually or via API):

1. **"Etsy SEO Tips"** - For Etsy-related content
2. **"Image Upscaling Guide"** - For image quality content
3. **"Print-on-Demand Success"** - For POD business content
4. **"AI Tools for Sellers"** - For AI/automation content
5. **"Digital Art Business"** - For digital art content

Get the Board ID for your main board:
- Go to board on Pinterest
- URL will be: `pinterest.com/username/board-name/`
- Board ID is in the API response or use the `/api/pinterest/boards` endpoint

### Step 3: Configure Environment Variables

Add to your `.env` file:

```bash
# Pinterest API Configuration
PINTEREST_ACCESS_TOKEN=pina_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
PINTEREST_BOARD_ID=988610624392612434  # Your default board ID
```

### Step 4: Install Dependencies

The system uses `canvas` for image generation. Install it:

```bash
npm install canvas
npm install @types/node-fetch --save-dev
```

---

## 📖 How It Works

### Automatic Workflow

```
1. You publish a blog post
   ↓
2. System generates 3 Pinterest images
   ↓
3. Creates 3 pin variations with different titles
   ↓
4. Posts to Pinterest automatically
   ↓
5. Logs success/failure to console
```

### Pin Variations Created

For each blog post, the system creates:

**Variation 1: Standard**
- Title: Original blog title
- Description: Meta description + link
- Hashtags: From blog keywords

**Variation 2: Free Guide**
- Title: "{Blog Title} [Free Guide]"
- Description: "Step-by-step guide for Etsy sellers..."
- Hashtags: #EtsySeller #DigitalArt #PrintOnDemand

**Variation 3: Etsy Focused**
- Title: "Etsy Sellers: {Blog Title}"
- Description: "Boost your sales with this guide..."
- Hashtags: #EtsyTips #EtsySEO #OnlineBusiness

---

## 🎨 Image Templates

### 1. Blog Post Template (Default)
- Clean, professional design
- Gradient background (purple to pink)
- Large title text
- Subtitle support
- Branded footer

### 2. Quote Template
- Inspirational design
- Solid brand color background
- Large quote marks
- Centered text
- Attribution support

### 3. List Template
- Numbered list design
- Colorful number circles
- Multiple points support
- Clean layout

### 4. Tutorial Template
- Step-by-step design
- "TUTORIAL" badge
- Numbered steps
- Clear instructions

### 5. Before/After Template
- Split design (red/green)
- Comparison layout
- Visual impact
- Results-focused

---

## 🔧 API Endpoints

### Generate Pinterest Image
```http
POST /api/pinterest/generate-image
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "How to Upscale Images",
  "subtitle": "Complete guide for 2025",
  "template": "blog-post",
  "points": ["Point 1", "Point 2"]  // For list template
}

Response: PNG image (1000x1500px)
```

### Auto-Post Blog to Pinterest
```http
POST /api/pinterest/auto-post-blog
Authorization: Bearer {token}
Content-Type: application/json

{
  "blogPostId": "uuid-here"
}

Response:
{
  "success": true,
  "pinsCreated": 3,
  "pins": [
    {
      "id": "pinterest-pin-id",
      "title": "Pin title",
      "link": "https://imageupscaler.app/blog/..."
    }
  ]
}
```

### Get Pinterest Boards
```http
GET /api/pinterest/boards
Authorization: Bearer {token}

Response:
{
  "boards": [
    {
      "id": "123456789",
      "name": "Etsy SEO Tips",
      "description": "...",
      "pin_count": 42
    }
  ]
}
```

### Create Pinterest Board
```http
POST /api/pinterest/boards
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "New Board Name",
  "description": "Board description"
}
```

---

## 📊 Testing the Workflow

### Test 1: Generate Image
```bash
curl -X POST https://imageupscaler.app/api/pinterest/generate-image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Pinterest Image",
    "subtitle": "Testing the generator",
    "template": "blog-post"
  }' \
  --output test-pin.png
```

### Test 2: Manual Post to Pinterest
1. Go to `/admin/blog-posts`
2. Find a published post
3. Click "Post to Pinterest" button (if added to UI)
4. Check Pinterest for new pins

### Test 3: Auto-Post on Publish
1. Go to `/admin/blog-generator`
2. Generate a blog post
3. Click "Publish Now"
4. Check server logs for: `✅ Auto-posted to Pinterest: 3 pins created`
5. Check Pinterest for new pins

---

## 🎯 Best Practices

### Pin Scheduling
- Post 5 pins per day
- Best times: 8pm-11pm, 2pm-4pm (EST)
- Focus on weekends for higher engagement

### Board Strategy
- Create 5-7 niche-specific boards
- Pin to relevant boards only
- Mix your content with repins (80/20 rule)

### Image Optimization
- Always use 1000x1500px (2:3 ratio)
- Include text overlay with title
- Add branding footer
- Use high-contrast colors
- Keep text readable on mobile

### Description Best Practices
- Include main keyword in first 50 characters
- Add 3-5 relevant hashtags
- Include call-to-action
- Add link to blog post
- Keep under 500 characters

---

## 🐛 Troubleshooting

### Error: "Pinterest not configured"
**Solution:** Add `PINTEREST_ACCESS_TOKEN` to `.env` file

### Error: "Board ID is required"
**Solution:** Add `PINTEREST_BOARD_ID` to `.env` or specify in API call

### Error: "Failed to generate image"
**Solution:** Ensure `canvas` package is installed: `npm install canvas`

### Error: "Pinterest API error: 401"
**Solution:** Access token expired. Generate new token from Pinterest Developer Dashboard

### Error: "Pinterest API error: 429"
**Solution:** Rate limit reached. Wait 1 hour or reduce posting frequency

### Pins not showing on Pinterest
**Solution:** 
- Check if pins were created (check API response)
- Pinterest may take 5-10 minutes to index new pins
- Verify board is public
- Check Pinterest account is verified

---

## 📈 Analytics & Monitoring

### Server Logs
Monitor these log messages:
```
✅ Auto-posted to Pinterest: 3 pins created for "Blog Title"
❌ Pinterest auto-post failed for "Blog Title": Error message
```

### Pinterest Analytics
Access via Pinterest Business account:
- Impressions
- Saves
- Clicks
- Engagement rate

### Track Performance
Use `/api/pinterest/analytics` endpoint (coming soon) to track:
- Total pins created
- Click-through rate
- Top performing pins
- Best boards

---

## 🔄 Future Enhancements

### Planned Features
- [ ] Schedule pins for optimal times
- [ ] A/B test different image templates
- [ ] Auto-repin top performing content
- [ ] Pinterest analytics dashboard in admin
- [ ] Bulk pin generation for existing blogs
- [ ] Custom image templates per category
- [ ] Video pin support
- [ ] Idea pin generation

---

## 📞 Support

### Resources
- Pinterest API Docs: https://developers.pinterest.com/docs/api/v5/
- Canvas Documentation: https://github.com/Automattic/node-canvas
- ImageUpscaler Support: support@imageupscaler.app

### Common Issues
See troubleshooting section above or check server logs for detailed error messages.

---

## ✅ Success Checklist

- [ ] Pinterest Business account created
- [ ] Website verified on Pinterest
- [ ] Pinterest app created
- [ ] Access token generated
- [ ] Boards created (5-7 boards)
- [ ] Environment variables configured
- [ ] Dependencies installed (`canvas`)
- [ ] Test image generated successfully
- [ ] Test pin created on Pinterest
- [ ] Auto-posting tested with blog publish
- [ ] Monitoring logs for success/errors

---

**You're all set!** 🎉

Every time you publish a blog post, it will automatically create and post 3-5 optimized pins to Pinterest, driving organic traffic to your site.

**Expected Results:**
- 10-50K monthly visitors from Pinterest (within 6 months)
- 3-5% conversion rate
- Minimal ongoing effort (fully automated)
