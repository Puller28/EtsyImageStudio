# Memory Optimization & Specialized Services Plan

## Current Problem
- Running out of RAM with single user generating 10 mockups
- Need to support 10 mockups for Etsy sync compatibility
- Cannot scale to multiple concurrent users

## Memory Leak Investigation

### Potential Issues in Current Code:

1. **Sharp Image Processing**
   - Sharp creates image buffers that may not be garbage collected immediately
   - Processing 10 mockups simultaneously = 10x memory usage
   - Each mockup may hold 50-100MB in memory during processing

2. **No Sequential Processing**
   - All 10 mockups processed in parallel
   - Should process 1-2 at a time, then release memory

3. **Buffer Management**
   - Image buffers may not be explicitly released
   - Need to call `.destroy()` on sharp instances

### Immediate Fixes Needed:

```typescript
// BEFORE (Memory Leak):
const mockups = await Promise.all(
  templates.map(template => generateMockup(artwork, template))
);

// AFTER (Memory Efficient):
const mockups = [];
for (const template of templates) {
  const mockup = await generateMockup(artwork, template);
  mockups.push(mockup);
  // Force garbage collection hint
  if (global.gc) global.gc();
}
```

## Specialized Services for Image Processing

### Option 1: **Cloudinary** (RECOMMENDED)
**Cost:** $89/month for 25GB storage + 25GB bandwidth
**Pros:**
- Handles image transformations via URL
- Automatic optimization
- CDN included
- No server memory usage
- 99.9% uptime SLA

**Cons:**
- Monthly cost
- Requires API integration

**Implementation:**
```typescript
// Upload artwork to Cloudinary
const artworkUrl = await cloudinary.uploader.upload(file);

// Generate mockup via transformation URL
const mockupUrl = cloudinary.url(artworkUrl, {
  transformation: [
    { overlay: 'template_background' },
    { width: 800, height: 600, crop: 'fit' }
  ]
});
```

### Option 2: **imgix**
**Cost:** $59/month for 1TB bandwidth
**Pros:**
- Real-time image processing
- URL-based transformations
- Fast CDN
- Pay as you grow

**Cons:**
- Requires learning their API
- Monthly cost

### Option 3: **AWS Lambda + S3**
**Cost:** ~$10-30/month for low traffic
**Pros:**
- Only pay for actual usage
- Scales automatically
- No server maintenance
- Can use Sharp in Lambda

**Cons:**
- More complex setup
- Cold start delays
- Need to manage S3 storage

**Implementation:**
```typescript
// Trigger Lambda function for each mockup
const result = await lambda.invoke({
  FunctionName: 'generate-mockup',
  Payload: JSON.stringify({
    artworkUrl: s3Url,
    templateId: template.id
  })
});
```

### Option 4: **Render.com Background Workers** (EASIEST)
**Cost:** $7/month per worker
**Pros:**
- Same platform you're already using
- Easy to set up
- Separate memory pool from main app
- Can scale workers independently

**Cons:**
- Still need to optimize code
- Not as feature-rich as specialized services

**Implementation:**
```typescript
// Main app: Queue job
await queue.add('generate-mockup', {
  artworkId,
  templates
});

// Worker app: Process job
queue.process('generate-mockup', async (job) => {
  const mockups = [];
  for (const template of job.data.templates) {
    const mockup = await generateMockup(job.data.artworkId, template);
    mockups.push(mockup);
  }
  return mockups;
});
```

## Recommended Solution: Hybrid Approach

### Phase 1 (Immediate - This Week):
1. **Fix Sequential Processing**
   - Process mockups one at a time
   - Add explicit memory cleanup
   - Implement request queuing

2. **Add Memory Monitoring**
   ```typescript
   const used = process.memoryUsage();
   console.log(`Memory: ${Math.round(used.heapUsed / 1024 / 1024)}MB`);
   ```

3. **Upgrade Server**
   - Current: 512MB RAM (guessing)
   - Upgrade to: 2GB RAM minimum
   - Cost: ~$7-14/month more

### Phase 2 (Next 2 Weeks):
1. **Implement Background Workers**
   - Separate mockup generation to worker service
   - Use Redis for job queue
   - Main app stays responsive

2. **Add Image Optimization**
   - Resize uploaded images before processing
   - Max resolution: 4000x4000px
   - Compress before storage

### Phase 3 (Before Launch):
1. **Move to Cloudinary or imgix**
   - Offload all image processing
   - Use their CDN for delivery
   - Reduce server costs
   - Better performance

## Cost Comparison

### Current Setup:
- Server: $7-21/month (Render.com)
- **Problem:** Can't handle 10 mockups or multiple users

### Option A: Optimize + Upgrade Server
- Server: $21/month (2GB RAM)
- **Pros:** Cheapest
- **Cons:** Still limited, may crash with 10+ users

### Option B: Background Worker
- Main Server: $7/month
- Worker: $7/month
- Redis: $10/month (Upstash)
- **Total:** $24/month
- **Pros:** Can handle 50+ users
- **Cons:** More complex

### Option C: Cloudinary
- Server: $7/month
- Cloudinary: $89/month
- **Total:** $96/month
- **Pros:** Enterprise-grade, unlimited scale
- **Cons:** Higher cost

## My Recommendation

**Start with Option B (Background Worker):**
1. Costs only $24/month
2. Can handle 50-100 concurrent users
3. Easy to implement on Render.com
4. Can migrate to Cloudinary later if needed

**Then optimize:**
1. Fix sequential processing (TODAY)
2. Add memory monitoring (TODAY)
3. Implement worker queue (THIS WEEK)
4. Test with 10 mockups (THIS WEEK)

This gives you a production-ready solution that can scale, without the high cost of Cloudinary until you actually need it.

## Next Steps

1. I'll fix the sequential processing code
2. Add memory cleanup
3. Implement request queuing
4. Test with 10 mockups
5. Document worker setup for Phase 2

Would you like me to start with the code fixes now?
