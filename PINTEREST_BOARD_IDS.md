# Pinterest Board IDs Configuration

This document explains how to configure multiple Pinterest boards for smart content routing.

---

## 🎯 How It Works

The system automatically selects the best Pinterest board based on your blog post's **keywords** and **title**.

**Example:**
- Blog about "How to Upscale Images" → Posts to **Image Upscaling Guide** board
- Blog about "Etsy SEO Tips" → Posts to **Etsy SEO Tips** board
- Blog about "AI Tools for Sellers" → Posts to **AI Tools for Sellers** board

---

## 📋 Board Mapping

### **1. Image Upscaling Guide**
**Triggers when keywords contain:**
- upscale, image quality, enhance, resolution, quality, pixel, blur

**Environment Variable:**
```
PINTEREST_BOARD_IMAGE_UPSCALING=YOUR_BOARD_ID_HERE
```

---

### **2. Digital Art Business**
**Triggers when keywords contain:**
- digital art, business, selling, marketplace, revenue, profit

**Environment Variable:**
```
PINTEREST_BOARD_DIGITAL_ART=YOUR_BOARD_ID_HERE
```

---

### **3. AI Tools for Sellers**
**Triggers when keywords contain:**
- ai, artificial intelligence, automation, tool, generator, chatgpt

**Environment Variable:**
```
PINTEREST_BOARD_AI_TOOLS=YOUR_BOARD_ID_HERE
```

---

### **4. Print on Demand**
**Triggers when keywords contain:**
- print, pod, printable, poster, canvas, wall art, download

**Environment Variable:**
```
PINTEREST_BOARD_PRINT_ON_DEMAND=YOUR_BOARD_ID_HERE
```

---

### **5. Etsy SEO Tips**
**Triggers when keywords contain:**
- etsy, seo, optimization, ranking, search, tags, listing

**Environment Variable:**
```
PINTEREST_BOARD_ETSY_SEO=YOUR_BOARD_ID_HERE
```

---

### **6. Default Board (Fallback)**
**Used when no keywords match**

**Environment Variable:**
```
PINTEREST_BOARD_ID=988610624392612434
```

---

## 🔍 How to Get Pinterest Board IDs

### **Method 1: From Pinterest URL**

1. Go to your Pinterest board
2. Look at the URL: `https://www.pinterest.com/artstudio/etsy-seo-tips/`
3. The board name is in the URL, but you need the numeric ID

### **Method 2: Using Pinterest API (Recommended)**

1. Go to https://developers.pinterest.com/
2. Use the "Get Board" API endpoint
3. The response will include the board ID

### **Method 3: From Make.com**

1. In Make.com, when you configure the Pinterest module
2. Click the "Board" dropdown
3. The board IDs are shown in the dropdown values
4. Copy each board ID

### **Method 4: Browser Developer Tools**

1. Open Pinterest in your browser
2. Open Developer Tools (F12)
3. Go to Network tab
4. Click on a board
5. Look for API calls containing board IDs

---

## ⚙️ Configuration Steps

### **For Render (Production):**

1. Go to Render Dashboard → Your Service → Environment
2. Add these environment variables:

```bash
# Image Upscaling Guide Board
PINTEREST_BOARD_IMAGE_UPSCALING=123456789012345678

# Digital Art Business Board
PINTEREST_BOARD_DIGITAL_ART=234567890123456789

# AI Tools for Sellers Board
PINTEREST_BOARD_AI_TOOLS=345678901234567890

# Print on Demand Board
PINTEREST_BOARD_PRINT_ON_DEMAND=456789012345678901

# Etsy SEO Tips Board
PINTEREST_BOARD_ETSY_SEO=567890123456789012

# Default Board (fallback)
PINTEREST_BOARD_ID=988610624392612434
```

3. Save and redeploy

### **For Local Testing:**

Add to your `.env` file:

```bash
PINTEREST_BOARD_IMAGE_UPSCALING=123456789012345678
PINTEREST_BOARD_DIGITAL_ART=234567890123456789
PINTEREST_BOARD_AI_TOOLS=345678901234567890
PINTEREST_BOARD_PRINT_ON_DEMAND=456789012345678901
PINTEREST_BOARD_ETSY_SEO=567890123456789012
PINTEREST_BOARD_ID=988610624392612434
```

---

## 🧪 Testing

### **Test 1: Etsy Blog Post**
1. Generate a blog with keywords: `etsy, seo, optimization`
2. Publish or generate Pinterest pins
3. Check Render logs for: `📌 Selected Pinterest board: etsySeo (matched keywords)`
4. Verify pins posted to "Etsy SEO Tips" board

### **Test 2: Image Upscaling Blog Post**
1. Generate a blog with keywords: `upscale, image quality, enhance`
2. Publish or generate Pinterest pins
3. Check Render logs for: `📌 Selected Pinterest board: imageUpscaling (matched keywords)`
4. Verify pins posted to "Image Upscaling Guide" board

### **Test 3: Fallback**
1. Generate a blog with keywords: `random, test, example`
2. Publish or generate Pinterest pins
3. Check Render logs for: `📌 Using default Pinterest board (no keyword match)`
4. Verify pins posted to default board

---

## 🔧 Customizing Keyword Mapping

To add or modify keywords for each board, edit:
`server/services/zapier-webhook.ts`

Find the `PINTEREST_BOARDS` constant and update the `keywords` arrays:

```typescript
const PINTEREST_BOARDS = {
  imageUpscaling: {
    id: process.env.PINTEREST_BOARD_IMAGE_UPSCALING || '988610624392612434',
    keywords: ['upscale', 'image quality', 'enhance', 'YOUR_NEW_KEYWORD']
  },
  // ... other boards
};
```

---

## 📊 Make.com Configuration

### **Update Pinterest Module in Make.com:**

1. Open your Make.com scenario
2. Click on the **Pinterest "Create a Pin"** module
3. In the **Board** field:
   - **Remove** the hardcoded board selection
   - Click in the field
   - Select **`boardId`** from the **Iterator** section
4. Save the scenario

**This allows the dynamic board ID from the webhook to be used!**

---

## 🆘 Troubleshooting

### **Pins Going to Wrong Board**
- Check Render logs to see which board was selected
- Verify the blog post keywords match the board's keyword list
- Update keyword mapping if needed

### **Pins Going to Default Board**
- No keywords matched any board
- Add more keywords to the blog post
- Or update the board keyword mappings

### **Board ID Not Found**
- Verify environment variables are set correctly
- Check for typos in board IDs
- Ensure board IDs are numeric (18 digits)

---

## 📝 Notes

- The system checks keywords in order (first match wins)
- Keywords are case-insensitive
- Both blog title and keywords are checked
- If no match, uses default board
- You can have the same board ID for multiple categories if needed

---

## 🎯 Next Steps

1. ✅ Get all Pinterest board IDs
2. ✅ Add environment variables to Render
3. ✅ Update Make.com to use dynamic `boardId`
4. ✅ Test with different blog posts
5. ✅ Adjust keyword mappings as needed
