# Etsy API Registration Checklist

## ✅ Pre-Registration Requirements

### 1. Legal Pages (COMPLETED ✅)
- ✅ **Privacy Policy**: `/privacy-policy` 
  - Updated with Etsy-specific data handling
  - Covers OAuth tokens, shop data, and user rights
  - Accessible at: `https://yourdomain.com/privacy-policy`

- ✅ **Terms of Service**: `/terms-of-service`
  - Updated with Etsy integration terms
  - Covers user responsibilities and limitations
  - Accessible at: `https://yourdomain.com/terms-of-service`

### 2. Domain Requirements (TO VERIFY)
- ⚠️ **Production Domain**: Need to confirm you have HTTPS enabled
  - Required format: `https://yourdomain.com`
  - Callback URL will be: `https://yourdomain.com/api/etsy/callback`
  - Cannot use `http://` or `localhost` for production

### 3. App Information (READY)
**App Name**: "Etsy Image Studio" or "Digital Art Helper for Etsy"

**App Description** (for registration):
```
Etsy Image Studio helps Etsy sellers create professional product listings 
with AI-powered tools. Our service generates high-quality digital artwork, 
creates realistic mockup images in various room settings, and publishes 
complete listings directly to Etsy shops.

Key Features:
• AI art generation with customizable prompts
• Professional mockup creation (living room, bedroom, office, etc.)
• Automatic image upscaling (2x and 4x)
• SEO-optimized listing titles and descriptions
• One-click publishing to Etsy shops
• Multiple print format generation

Target Users: Etsy sellers who want to streamline their digital art 
listing creation process and save time on product photography and 
listing management.
```

**Who will be the users?**: 
- Etsy sellers who create and sell digital art prints
- Artists who want to automate their listing creation
- Print-on-demand sellers

**Is your application commercial?**: 
- Yes (you charge for credits/subscriptions)

---

## 📋 Registration Steps

### Step 1: Register Your App
1. Go to: https://www.etsy.com/developers/register
2. Fill in the form with information above
3. Enter your Privacy Policy URL: `https://yourdomain.com/privacy-policy`
4. Enter your Terms of Service URL: `https://yourdomain.com/terms-of-service`
5. Complete captcha and click "Read Terms and Create App"

### Step 2: Get Your Credentials
1. Go to: https://www.etsy.com/developers/your-apps
2. Click "See API Key Details" for your app
3. Copy your **API Key (Client ID)**
4. Copy your **Shared Secret** (keep this SECRET!)
5. Note your **Keystring**

### Step 3: Configure Callback URL
1. In your app settings on Etsy
2. Add callback URL: `https://yourdomain.com/api/etsy/callback`
3. For development, also add: `http://localhost:5000/api/etsy/callback`

### Step 4: Wait for Approval
- **Personal Access**: Immediate (can test with your own shop)
- **Initial Approval**: 1-3 business days
- **Commercial Access**: Request after testing is complete

---

## 🔧 Environment Variables to Add

Once you have your credentials, add to `.env`:

```bash
# Etsy API Credentials
ETSY_API_KEY=your_api_key_here
ETSY_SHARED_SECRET=your_shared_secret_here
ETSY_REDIRECT_URI=https://yourdomain.com/api/etsy/callback

# For development
ETSY_REDIRECT_URI_DEV=http://localhost:5000/api/etsy/callback
```

---

## 📝 What Changed in Your Legal Pages

### Privacy Policy Updates
Added **Section 5: Etsy Integration** covering:
- What Etsy data we collect (shop ID, tokens, listing info)
- How we use Etsy data (publishing listings only)
- Token security (encrypted storage, automatic refresh)
- Data retention (immediate deletion on disconnect)
- What we DON'T access (financial data, customer info, orders)

### Terms of Service Updates
Added **Section 6: Etsy Integration Terms** covering:
- User authorization for shop access
- User responsibility for Etsy policy compliance
- Ability to disconnect at any time
- Third-party service disclaimer
- Intellectual property rights

---

## ✅ Current Status

### Completed
- [x] Privacy Policy exists and is accessible
- [x] Terms of Service exists and is accessible
- [x] Added Etsy-specific sections to both pages
- [x] Pages are properly routed in the app
- [x] Pages are linked in footer and navigation

### To Do Before Registration
- [ ] Verify production domain has HTTPS
- [ ] Confirm final app name
- [ ] Register app on Etsy
- [ ] Get API credentials
- [ ] Add credentials to environment variables

### To Do After Registration
- [ ] Implement OAuth flow (Week 1)
- [ ] Create database schema (Week 1)
- [ ] Build Etsy API integration (Week 2)
- [ ] Create UI components (Week 2)
- [ ] Test with your own shop (Week 2)
- [ ] Beta test with 5-10 users (Week 3)
- [ ] Request commercial access (Week 3)
- [ ] Launch to all users (Week 4)

---

## 🚀 Next Immediate Steps

1. **Verify Domain** (5 minutes)
   - Confirm your production domain
   - Ensure HTTPS is working
   - Test that privacy policy and terms are accessible

2. **Register App** (15 minutes)
   - Go to Etsy registration page
   - Fill in the form
   - Submit for approval

3. **Wait for Approval** (1-3 days)
   - Check email for approval notification
   - Check app status at https://www.etsy.com/developers/your-apps

4. **Start Development** (While waiting)
   - Set up database schema
   - Implement OAuth flow (can test with localhost)
   - Build token management system

---

## 📞 Support

If you have questions during registration:
- **Etsy Developer Forums**: https://community.etsy.com/t5/Developer-Discussion/bd-p/developer
- **Etsy API Documentation**: https://developers.etsy.com/documentation/

---

## 🎯 Success Criteria

Your app is ready for registration when:
- ✅ Privacy Policy is live and includes Etsy terms
- ✅ Terms of Service is live and includes Etsy terms
- ✅ Production domain has HTTPS enabled
- ✅ App description clearly explains functionality
- ✅ You understand what permissions you're requesting

**You're 95% ready!** Just need to confirm your production domain and submit the registration.
