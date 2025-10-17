# Etsy API Integration - Complete Implementation Guide

## Overview

Direct Etsy integration will allow users to publish listings directly from your app, completing the workflow: **AI Art → Mockups → Etsy Listing** in one place.

**Estimated Build Time**: 2-3 weeks  
**Impact**: Major competitive advantage, saves users 10-15 minutes per listing

---

## Phase 1: Registration & Approval (Week 1)

### Step 1: Register Your App with Etsy

**URL**: https://www.etsy.com/developers/register

**Required Information**:
1. **App Name**: "Etsy Image Studio" or "EtsyImageStudio"
2. **Description**: 
   ```
   Etsy Image Studio is an AI-powered tool that helps Etsy sellers create 
   professional product listings. It generates AI artwork, creates mockup images, 
   and publishes listings directly to Etsy shops. Features include:
   - AI art generation
   - Professional mockup creation
   - Automatic listing generation with SEO-optimized titles and descriptions
   - Direct publishing to Etsy shops
   ```

3. **Who will be the users?**: 
   - Select: "Etsy sellers who want to streamline their listing creation process"

4. **Is your application commercial?**: 
   - Select: "Yes" (you charge for credits/subscriptions)

5. **Privacy Policy URL**: 
   - You'll need: `https://yourdomain.com/privacy`
   - Must include: How you handle Etsy user data, OAuth tokens, shop information

6. **Terms of Service URL**: 
   - You'll need: `https://yourdomain.com/terms`

### Step 2: Wait for Approval

- **Timeline**: Usually 1-3 business days
- **Status**: Check at https://www.etsy.com/developers/your-apps
- **Note**: You get "Personal Access" immediately (can access your own shop)
- **Production Access**: Requires approval before other users can connect

### Step 3: Get Your API Credentials

Once approved, you'll receive:
- **API Key (Client ID)**: Your app's unique identifier
- **Shared Secret**: Keep this SECRET - never expose in client-side code
- **Keystring**: Used in API requests

---

## Phase 2: OAuth 2.0 Implementation (Week 1-2)

### Required OAuth Scopes

For your use case, you need:

```javascript
const ETSY_SCOPES = [
  'listings_r',      // Read listings
  'listings_w',      // Create/update listings
  'shops_r',         // Read shop info
  'shops_w',         // Update shop settings
  'transactions_r',  // Read sales data (optional, for analytics)
  'profile_r',       // Read user profile
];

const scopeString = ETSY_SCOPES.join('%20'); // Space-separated, URL-encoded
```

### OAuth Flow Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Your App  │────────▶│  Etsy OAuth  │────────▶│ Etsy Seller │
│             │         │   /connect   │         │  (Approves) │
└─────────────┘         └──────────────┘         └─────────────┘
       │                                                  │
       │                                                  ▼
       │                                          ┌─────────────┐
       │◀─────────────────────────────────────────│ Auth Code   │
       │                                          └─────────────┘
       │
       ▼
┌─────────────┐         ┌──────────────┐
│ Exchange    │────────▶│ Etsy Token   │
│ for Token   │         │   Endpoint   │
└─────────────┘         └──────────────┘
       │
       ▼
┌─────────────┐
│ Access Token│
│ (1 hour)    │
│ Refresh Token│
│ (90 days)   │
└─────────────┘
```

### Implementation Steps

#### 1. Add Callback URL to Your App

**Register this URL with Etsy**:
```
https://yourdomain.com/api/etsy/callback
```

**Important**: 
- Must be HTTPS (not HTTP)
- Must match EXACTLY (case-sensitive, no trailing slash)
- Can add multiple for dev/staging/prod

#### 2. Generate PKCE Code Challenge

PKCE (Proof Key for Code Exchange) is required for security.

```typescript
// server/services/etsy-oauth.ts
import crypto from 'crypto';

export function generatePKCE() {
  // Generate code verifier (43-128 characters)
  const codeVerifier = crypto
    .randomBytes(32)
    .toString('base64url'); // URL-safe base64
  
  // Generate code challenge (SHA256 hash of verifier)
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  return { codeVerifier, codeChallenge };
}

export function generateState() {
  // Random state string for CSRF protection
  return crypto.randomBytes(32).toString('hex');
}
```

#### 3. Create Authorization URL

```typescript
// server/routes.ts
app.get('/api/etsy/connect', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  
  // Generate PKCE and state
  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = generateState();
  
  // Store in database (temporary, 10 min expiry)
  await storage.storeEtsyOAuthState(userId, {
    state,
    codeVerifier,
    expiresAt: Date.now() + 10 * 60 * 1000
  });
  
  // Build authorization URL
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.ETSY_API_KEY!,
    redirect_uri: process.env.ETSY_REDIRECT_URI!,
    scope: ETSY_SCOPES.join(' '),
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });
  
  const authUrl = `https://www.etsy.com/oauth/connect?${params.toString()}`;
  
  res.json({ authUrl });
});
```

#### 4. Handle OAuth Callback

```typescript
// server/routes.ts
app.get('/api/etsy/callback', async (req, res) => {
  const { code, state } = req.query;
  
  if (!code || !state) {
    return res.redirect('/dashboard?error=etsy_auth_failed');
  }
  
  // Verify state (CSRF protection)
  const storedState = await storage.getEtsyOAuthState(state as string);
  if (!storedState || storedState.state !== state) {
    return res.redirect('/dashboard?error=invalid_state');
  }
  
  // Exchange code for token
  try {
    const tokenResponse = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.ETSY_API_KEY!,
        redirect_uri: process.env.ETSY_REDIRECT_URI!,
        code: code as string,
        code_verifier: storedState.codeVerifier
      })
    });
    
    const tokens = await tokenResponse.json();
    
    // Extract user_id from access_token (format: "12345678.token...")
    const userId = tokens.access_token.split('.')[0];
    
    // Store tokens in database
    await storage.storeEtsyTokens(storedState.userId, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
      etsyUserId: userId
    });
    
    // Clean up state
    await storage.deleteEtsyOAuthState(state as string);
    
    res.redirect('/dashboard?etsy_connected=true');
    
  } catch (error) {
    console.error('Etsy token exchange failed:', error);
    res.redirect('/dashboard?error=token_exchange_failed');
  }
});
```

#### 5. Token Refresh Logic

Access tokens expire after 1 hour. Implement automatic refresh:

```typescript
// server/services/etsy-oauth.ts
export async function getValidEtsyToken(userId: string): Promise<string> {
  const tokens = await storage.getEtsyTokens(userId);
  
  if (!tokens) {
    throw new Error('No Etsy connection found');
  }
  
  // Check if token is still valid (with 5 min buffer)
  if (tokens.expiresAt > Date.now() + 5 * 60 * 1000) {
    return tokens.accessToken;
  }
  
  // Refresh token
  const refreshResponse = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.ETSY_API_KEY!,
      refresh_token: tokens.refreshToken
    })
  });
  
  const newTokens = await refreshResponse.json();
  
  // Update stored tokens
  await storage.updateEtsyTokens(userId, {
    accessToken: newTokens.access_token,
    refreshToken: newTokens.refresh_token,
    expiresAt: Date.now() + (newTokens.expires_in * 1000)
  });
  
  return newTokens.access_token;
}
```

---

## Phase 3: Etsy API Integration (Week 2)

### Get Shop Information

```typescript
// server/services/etsy.ts
export async function getEtsyShop(userId: string) {
  const accessToken = await getValidEtsyToken(userId);
  const etsyUserId = accessToken.split('.')[0];
  
  const response = await fetch(
    `https://api.etsy.com/v3/application/users/${etsyUserId}/shops`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-api-key': process.env.ETSY_API_KEY!
      }
    }
  );
  
  const data = await response.json();
  return data.results[0]; // User's primary shop
}
```

### Upload Listing Images

```typescript
export async function uploadListingImage(
  userId: string,
  shopId: string,
  imageBuffer: Buffer,
  rank: number = 1
) {
  const accessToken = await getValidEtsyToken(userId);
  
  const formData = new FormData();
  formData.append('image', new Blob([imageBuffer]), 'mockup.png');
  formData.append('rank', rank.toString());
  
  const response = await fetch(
    `https://api.etsy.com/v3/application/shops/${shopId}/listings/images`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-api-key': process.env.ETSY_API_KEY!
      },
      body: formData
    }
  );
  
  const data = await response.json();
  return data.listing_image_id;
}
```

### Create Draft Listing

```typescript
export async function createEtsyListing(
  userId: string,
  shopId: string,
  listingData: {
    title: string;
    description: string;
    price: number;
    quantity: number;
    imageIds: number[];
    tags: string[];
    materials?: string[];
    isDigital?: boolean;
  }
) {
  const accessToken = await getValidEtsyToken(userId);
  
  const response = await fetch(
    `https://api.etsy.com/v3/application/shops/${shopId}/listings`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-api-key': process.env.ETSY_API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        quantity: listingData.quantity,
        title: listingData.title,
        description: listingData.description,
        price: listingData.price,
        who_made: 'i_did',
        when_made: '2020_2024',
        taxonomy_id: 2026, // Digital prints category
        shipping_profile_id: null, // Digital = no shipping
        type: listingData.isDigital ? 'download' : 'physical',
        is_digital: listingData.isDigital || false,
        image_ids: listingData.imageIds,
        tags: listingData.tags.slice(0, 13), // Max 13 tags
        materials: listingData.materials?.slice(0, 13) // Max 13 materials
      })
    }
  );
  
  const data = await response.json();
  return data;
}
```

### Publish Listing

```typescript
export async function publishEtsyListing(
  userId: string,
  shopId: string,
  listingId: string
) {
  const accessToken = await getValidEtsyToken(userId);
  
  const response = await fetch(
    `https://api.etsy.com/v3/application/shops/${shopId}/listings/${listingId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-api-key': process.env.ETSY_API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        state: 'active' // Changes from 'draft' to 'active'
      })
    }
  );
  
  return response.json();
}
```

---

## Phase 4: Database Schema (Week 1)

### Add Etsy Connection Table

```sql
-- Supabase migration
CREATE TABLE etsy_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  etsy_user_id TEXT NOT NULL,
  shop_id TEXT NOT NULL,
  shop_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- OAuth state storage (temporary)
CREATE TABLE etsy_oauth_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state TEXT NOT NULL UNIQUE,
  code_verifier TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_etsy_connections_user_id ON etsy_connections(user_id);
CREATE INDEX idx_etsy_oauth_states_state ON etsy_oauth_states(state);

-- Auto-cleanup expired states (run hourly)
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM etsy_oauth_states 
  WHERE expires_at < EXTRACT(EPOCH FROM NOW()) * 1000;
END;
$$ LANGUAGE plpgsql;
```

---

## Phase 5: Frontend UI (Week 2-3)

### 1. Etsy Connection Button

```tsx
// client/src/components/etsy-connect-button.tsx
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function EtsyConnectButton() {
  const { data: connection } = useQuery({
    queryKey: ['/api/etsy/connection'],
  });
  
  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('GET', '/api/etsy/connect');
      const data = await res.json();
      window.location.href = data.authUrl;
    }
  });
  
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', '/api/etsy/connection');
    }
  });
  
  if (connection?.connected) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-green-600">
          ✓ Connected to {connection.shopName}
        </span>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => disconnectMutation.mutate()}
        >
          Disconnect
        </Button>
      </div>
    );
  }
  
  return (
    <Button 
      onClick={() => connectMutation.mutate()}
      disabled={connectMutation.isPending}
    >
      Connect Etsy Shop
    </Button>
  );
}
```

### 2. Publish to Etsy Button

```tsx
// client/src/components/publish-to-etsy-button.tsx
export function PublishToEtsyButton({ projectId }: { projectId: string }) {
  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/projects/${projectId}/publish-to-etsy`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Published to Etsy!",
        description: `Your listing is live at ${data.listingUrl}`
      });
    }
  });
  
  return (
    <Button 
      onClick={() => publishMutation.mutate()}
      disabled={publishMutation.isPending}
    >
      {publishMutation.isPending ? 'Publishing...' : 'Publish to Etsy'}
    </Button>
  );
}
```

---

## Environment Variables

Add to `.env`:

```bash
# Etsy API Credentials
ETSY_API_KEY=your_api_key_here
ETSY_SHARED_SECRET=your_shared_secret_here
ETSY_REDIRECT_URI=https://yourdomain.com/api/etsy/callback

# For development
ETSY_REDIRECT_URI_DEV=http://localhost:5000/api/etsy/callback
```

---

## Pre-Approval Checklist

Before submitting for Etsy approval, ensure:

### ✅ Legal Requirements
- [ ] Privacy Policy published and linked
- [ ] Terms of Service published and linked
- [ ] GDPR compliance (if EU users)
- [ ] Data retention policy documented

### ✅ Security Requirements
- [ ] HTTPS enabled on production domain
- [ ] OAuth tokens encrypted at rest
- [ ] PKCE implemented correctly
- [ ] State validation for CSRF protection
- [ ] Secure token storage (never in localStorage)

### ✅ Functional Requirements
- [ ] OAuth flow works end-to-end
- [ ] Token refresh implemented
- [ ] Error handling for failed connections
- [ ] User can disconnect Etsy account
- [ ] Graceful handling of expired tokens

### ✅ User Experience
- [ ] Clear explanation of what permissions you need
- [ ] Success/error messages for connection
- [ ] Loading states during OAuth flow
- [ ] Ability to reconnect if connection fails

---

## Testing Strategy

### 1. Personal Access Testing (Week 1)
- Connect your own Etsy shop
- Create draft listings
- Upload images
- Publish listings
- Verify everything appears correctly on Etsy

### 2. Beta Testing (Week 2)
- Invite 2-3 trusted users
- Have them connect their shops
- Monitor for errors
- Collect feedback

### 3. Production Launch (Week 3)
- Request commercial access from Etsy
- Wait for approval (1-2 weeks)
- Gradual rollout to all users

---

## Rate Limits

Etsy API rate limits:
- **10 requests per second** per API key
- **10,000 requests per day** per API key

**Mitigation**:
- Implement request queuing
- Cache shop information
- Batch operations where possible

```typescript
// Simple rate limiter
import pLimit from 'p-limit';

const etsyRateLimit = pLimit(10); // Max 10 concurrent requests

export async function rateLimitedEtsyRequest(url: string, options: RequestInit) {
  return etsyRateLimit(() => fetch(url, options));
}
```

---

## Cost Analysis

### Development Costs
- **Developer time**: 2-3 weeks @ $X/hour
- **Testing**: 1 week
- **Total**: ~3-4 weeks

### Ongoing Costs
- **Etsy API**: Free (no per-request fees)
- **Server costs**: Minimal (just token storage)
- **Support**: ~2-3 hours/month for Etsy-related issues

### Revenue Impact
- **User retention**: +30% (major feature)
- **Conversion rate**: +20% (complete workflow)
- **Premium tier**: Can charge $5-10/month extra for Etsy integration

---

## Rollout Plan

### Week 1-2: Development
- Implement OAuth flow
- Create database schema
- Build API endpoints
- Test with your own shop

### Week 3: Beta Testing
- Invite 5-10 beta users
- Monitor errors
- Fix bugs
- Collect feedback

### Week 4: Production Prep
- Submit for commercial access
- Update documentation
- Create help articles
- Prepare support team

### Week 5+: Launch
- Announce feature
- Gradual rollout
- Monitor performance
- Iterate based on feedback

---

## Support & Documentation

### User-Facing Docs Needed
1. "How to Connect Your Etsy Shop"
2. "Publishing Listings to Etsy"
3. "Troubleshooting Etsy Connection"
4. "What Permissions Does the App Need?"

### Internal Docs Needed
1. OAuth flow diagram
2. Token refresh process
3. Error handling guide
4. Rate limit monitoring

---

## Success Metrics

Track these KPIs:
- **Connection rate**: % of users who connect Etsy
- **Publish rate**: % of projects published to Etsy
- **Success rate**: % of publishes that succeed
- **Time saved**: Average time from project creation to live listing
- **User retention**: Do users with Etsy connected stay longer?

**Target**: 
- 40% of users connect Etsy within first month
- 80% publish success rate
- 10-15 minutes saved per listing

---

## Next Steps

1. **This Week**: Register app with Etsy, wait for approval
2. **Week 1**: Implement OAuth flow and token management
3. **Week 2**: Build listing creation API
4. **Week 3**: Frontend UI and testing
5. **Week 4**: Beta launch

**Questions to Answer**:
1. Do you have a production domain ready? (needs HTTPS)
2. Do you have Privacy Policy and Terms of Service?
3. Should we support multiple Etsy shops per user?
4. Should we auto-publish or keep as draft by default?
