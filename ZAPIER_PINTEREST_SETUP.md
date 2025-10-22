# Zapier Pinterest Integration Setup Guide

This guide shows you how to automatically post blog posts to Pinterest using Zapier as a bridge (since Pinterest API doesn't allow direct write access easily).

---

## 🎯 Overview

**Flow:**
```
Blog Published → Webhook to Zapier → Zapier Creates Pinterest Pins
```

**What You Get:**
- ✅ Automatic Pinterest posting when you publish a blog
- ✅ 3 pin variations per blog post
- ✅ Images automatically generated
- ✅ No Pinterest API write access needed

---

## 📋 Prerequisites

1. **Zapier Account** (free tier works - 100 tasks/month)
   - Sign up at https://zapier.com
   
2. **Pinterest Business Account**
   - Connect to Zapier (Zapier has Pinterest write access)

---

## 🚀 Setup Instructions

### Step 1: Create Zapier Webhook

1. Go to https://zapier.com/app/zaps
2. Click **"Create Zap"**
3. **Trigger**: Search for "Webhooks by Zapier"
4. Choose **"Catch Hook"**
5. Click **Continue**
6. **Copy the webhook URL** (looks like: `https://hooks.zapier.com/hooks/catch/123456/abcdef/`)
7. Keep this tab open

### Step 2: Add Webhook URL to Environment Variables

**For Render (Production):**
1. Go to Render Dashboard → Your Service → Environment
2. Add new environment variable:
   ```
   ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/123456/abcdef/
   ```
3. Save and redeploy

**For Local Testing:**
Add to your `.env` file:
```bash
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/123456/abcdef/
```

### Step 3: Test the Webhook

1. Publish a blog post from `/admin/blog-generator`
2. Check Render logs for: `✅ Sent to Zapier for Pinterest posting`
3. Go back to Zapier - it should show "Test successful" with the data

### Step 4: Configure Pinterest Action in Zapier

1. In Zapier, click **"Continue"** after test is successful
2. **Action**: Search for "Pinterest"
3. Choose **"Create Pin"**
4. Click **"Sign in to Pinterest"** and authorize
5. **Map the fields:**
   - **Board**: Select your board (or use `pins[0].boardId` from webhook)
   - **Image URL**: `pins[0].imageUrl`
   - **Title**: `pins[0].title`
   - **Description**: `pins[0].description`
   - **Link**: `pins[0].link`
6. Click **"Continue"** and **"Test"**
7. Check Pinterest - you should see a new pin!

### Step 5: Create Multiple Pins (Optional)

Since we send 3 pin variations, you can create 3 pins per blog:

1. After the first Pinterest action, click **"+"** to add another step
2. Add another **"Create Pin"** action
3. Use `pins[1].imageUrl`, `pins[1].title`, etc.
4. Repeat for `pins[2]` (third variation)

**Or use Zapier Looping** (requires paid plan):
- Add a "Looping by Zapier" step
- Loop through `pins` array
- Create one pin per iteration

### Step 6: Turn On Your Zap

1. Click **"Publish"** in top right
2. Name it: "Blog to Pinterest Auto-Post"
3. Turn it **ON**

---

## 🧪 Testing

### Test 1: Publish a Blog Post
1. Go to `/admin/blog-generator`
2. Generate a blog post
3. Click **"Publish Now"**
4. Check Render logs for: `✅ Sent to Zapier for Pinterest posting`

### Test 2: Check Zapier
1. Go to https://zapier.com/app/history
2. You should see the webhook trigger
3. Check if Pinterest pins were created

### Test 3: Check Pinterest
1. Go to your Pinterest account
2. Check your board
3. You should see 1-3 new pins!

---

## 📊 What Data is Sent to Zapier?

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
- Verify `ZAPIER_WEBHOOK_URL` is set correctly
- Make sure blog post was published (not just saved as draft)

### Pinterest Pins Not Created
- Check Zapier history for errors
- Verify Pinterest account is connected
- Check if image URLs are accessible (public)
- Verify board ID is correct

### Images Not Loading
- Check Supabase storage permissions (should be public)
- Verify image URLs in Zapier test data
- Try accessing image URL directly in browser

---

## 💰 Zapier Pricing

**Free Tier:**
- 100 tasks/month
- 1 task = 1 blog post published
- If you publish 4 blogs/month with 3 pins each = 12 tasks used

**Paid Plans:**
- Starter: $19.99/month (750 tasks)
- Professional: $49/month (2,000 tasks)

---

## 🎯 Next Steps

1. ✅ Set up Zapier webhook
2. ✅ Test with one blog post
3. ✅ Configure all 3 pin variations
4. ✅ Turn on Zap
5. ⏳ Apply for Pinterest API write access (long-term solution)

---

## 📝 Notes

- Zapier is a **temporary solution** until you get Pinterest API write access
- Images are automatically generated and uploaded to Supabase
- Each blog post creates 3 pin variations for better reach
- Pins link back to your blog post for traffic

---

## 🆘 Support

If you encounter issues:
1. Check Render logs: `https://dashboard.render.com/`
2. Check Zapier history: `https://zapier.com/app/history`
3. Verify environment variables are set correctly
