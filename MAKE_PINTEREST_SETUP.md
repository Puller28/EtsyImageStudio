# Make.com Pinterest Integration Setup Guide

This guide shows you how to automatically post blog posts to Pinterest using Make.com (formerly Integromat) as a bridge (since Pinterest API doesn't allow direct write access easily).

---

## 🎯 Overview

**Flow:**
```
Blog Published → Webhook to Make.com → Make Creates Pinterest Pins
```

**What You Get:**
- ✅ Automatic Pinterest posting when you publish a blog
- ✅ 3 pin variations per blog post
- ✅ Images automatically generated
- ✅ No Pinterest API write access needed
- ✅ **FREE** - 1,000 operations/month on free tier

---

## 📋 Prerequisites

1. **Make.com Account** (free tier - 1,000 operations/month)
   - Sign up at https://www.make.com/en/register
   
2. **Pinterest Business Account**
   - Connect to Make.com (Make has Pinterest write access)

---

## 🚀 Setup Instructions

### Step 1: Create Make.com Scenario

1. Go to https://www.make.com/en/login
2. Click **"Create a new scenario"**
3. Click the **"+"** button to add first module
4. Search for **"Webhooks"**
5. Choose **"Custom webhook"**
6. Click **"Create a webhook"**
7. Give it a name: "Blog to Pinterest"
8. **Copy the webhook URL** (looks like: `https://hook.us1.make.com/xxxxxxxxxxxxx`)
9. Click **"OK"**

### Step 2: Add Webhook URL to Environment Variables

**For Render (Production):**
1. Go to Render Dashboard → Your Service → Environment
2. Add new environment variable:
   ```
   ZAPIER_WEBHOOK_URL=https://hook.us1.make.com/xxxxxxxxxxxxx
   ```
   *(Keep the variable name as `ZAPIER_WEBHOOK_URL` - it works for both!)*
3. Save and redeploy

**For Local Testing:**
Add to your `.env` file:
```bash
ZAPIER_WEBHOOK_URL=https://hook.us1.make.com/xxxxxxxxxxxxx
```

### Step 3: Test the Webhook

1. Publish a blog post from `/admin/blog-generator`
2. Check Render logs for: `✅ Sent to Zapier for Pinterest posting`
3. Go back to Make.com - you should see data received in the webhook module
4. Click **"Determine data structure"** if prompted
5. The webhook is now configured!

### Step 4: Add Iterator Module (for 3 pins)

1. Click the **"+"** after the webhook module
2. Search for **"Iterator"**
3. Choose **"Iterator"**
4. In the **Array** field, click and select: `pins` (from webhook data)
5. Click **"OK"**

This will loop through all 3 pin variations automatically!

### Step 5: Add Pinterest Module

1. Click the **"+"** after the Iterator
2. Search for **"Pinterest"**
3. Choose **"Create a Pin"**
4. Click **"Create a connection"**
5. Sign in to your Pinterest account and authorize
6. **Map the fields** (see next section)

### Step 6: Map Pinterest Fields

**IMPORTANT:** Use these exact mappings from the Iterator:

- **Board**: Click dropdown → Select your board (e.g., "Etsy SEO Tips")
  - Or manually enter your board ID: `988610624392612434`

- **Image URL**: Click in field → Select `imageUrl` (from Iterator)

- **Title**: Click in field → Select `title` (from Iterator)

- **Description**: Click in field → Select `description` (from Iterator)

- **Link**: Click in field → Select `link` (from Iterator)

- **Alt text** (optional): Click in field → Select `title` (from Iterator)

**Visual Guide:**
```
Iterator output:
├── imageUrl     → Map to "Image URL"
├── title        → Map to "Title"
├── description  → Map to "Description"
└── link         → Map to "Link"
```

### Step 7: Save and Activate

1. Click **"Save"** (bottom left)
2. Name it: "Blog to Pinterest Auto-Post"
3. Toggle the switch to **"ON"** (top left)
4. Your scenario is now live! 🎉

---

## 🧪 Testing

### Test 1: Publish a Blog Post
1. Go to `/admin/blog-generator`
2. Generate a blog post
3. Click **"Publish Now"**
4. Check Render logs for: `✅ Sent to Zapier for Pinterest posting`

### Test 2: Check Make.com
1. Go to https://www.make.com/en/scenarios
2. Click on your scenario
3. Check the execution history (bottom panel)
4. You should see 3 successful Pinterest pin creations

### Test 3: Check Pinterest
1. Go to your Pinterest account
2. Check your board
3. You should see 1-3 new pins!

---

## 📊 What Data is Sent to Make.com?

```json
{
  "blogPost": {
    "title": "Best Print Sizes for Etsy Digital Downloads",
    "description": "Discover the best print sizes for Etsy...",
    "url": "https://imageupscaler.app/blog/best-print-sizes-etsy",
    "keywords": "etsy, print sizes, digital downloads"
  },
  "pins": [
    {
      "imageUrl": "https://kkdzbtopouozsniuzghf.supabase.co/storage/v1/object/public/project-assets/pinterest/pin-1.png",
      "title": "Best Print Sizes for Etsy Digital Downloads",
      "description": "Discover the best print sizes for Etsy digital downloads...",
      "link": "https://imageupscaler.app/blog/best-print-sizes-etsy",
      "boardId": "988610624392612434"
    },
    {
      "imageUrl": "https://kkdzbtopouozsniuzghf.supabase.co/storage/v1/object/public/project-assets/pinterest/pin-2.png",
      "title": "Ultimate Guide: Print Sizes That Sell on Etsy",
      "description": "Master the art of choosing perfect print sizes...",
      "link": "https://imageupscaler.app/blog/best-print-sizes-etsy",
      "boardId": "988610624392612434"
    },
    {
      "imageUrl": "https://kkdzbtopouozsniuzghf.supabase.co/storage/v1/object/public/project-assets/pinterest/pin-3.png",
      "title": "Etsy Sellers: Optimize Your Print Sizes Now",
      "description": "Boost your Etsy sales with optimized print sizes...",
      "link": "https://imageupscaler.app/blog/best-print-sizes-etsy",
      "boardId": "988610624392612434"
    }
  ],
  "timestamp": "2025-10-21T19:45:00.000Z"
}
```

---

## 🔧 Troubleshooting

### Webhook Not Triggering
- Check Render logs for errors
- Verify `ZAPIER_WEBHOOK_URL` is set correctly (even though it's Make.com URL)
- Make sure blog post was published (not just saved as draft)

### Pinterest Pins Not Created
- Check Make.com execution history for errors
- Verify Pinterest account is connected in Make.com
- Check if image URLs are accessible (public)
- Verify board ID is correct (988610624392612434)
- Make sure Iterator is properly configured to loop through `pins` array

### Images Not Loading
- Check Supabase storage permissions (should be public)
- Verify image URLs in Make.com execution data
- Try accessing image URL directly in browser

---

## 💰 Make.com Pricing

**Free Tier:**
- 1,000 operations/month
- 1 operation = 1 module execution
- Example: 1 blog post = 1 webhook + 1 iterator + 3 Pinterest pins = 5 operations
- You can publish ~200 blogs/month on free tier! 🎉

**Paid Plans:**
- Core: $9/month (10,000 operations)
- Pro: $16/month (10,000 operations + premium apps)
- Teams: $29/month (10,000 operations + team features)

---

## 🎯 Next Steps

1. ✅ Set up Make.com scenario with webhook
2. ✅ Add Iterator module for looping
3. ✅ Configure Pinterest module with field mappings
4. ✅ Test with one blog post
5. ✅ Activate scenario
6. ⏳ Apply for Pinterest API write access (long-term solution)

---

## 📝 Notes

- Make.com is a **free solution** (1,000 operations/month)
- Images are automatically generated and uploaded to Supabase
- Each blog post creates 3 pin variations for better reach
- Pins link back to your blog post for traffic
- Iterator automatically loops through all 3 pins - no manual duplication needed!

---

## 🆘 Support

If you encounter issues:
1. Check Render logs: `https://dashboard.render.com/`
2. Check Make.com execution history: `https://www.make.com/en/scenarios`
3. Verify environment variables are set correctly
4. Test webhook URL directly with a POST request
