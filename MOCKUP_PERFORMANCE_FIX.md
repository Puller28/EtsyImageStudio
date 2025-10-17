# Mockup Generation Performance Issue

## Problem Identified

The mockup generation is **extremely slow** because it spawns a **separate Python process for each mockup** sequentially.

### Current Flow (SLOW)
```
For each template (e.g., 5 templates):
  1. Write temp file to disk
  2. Spawn Python process (100-500ms startup)
  3. Load libraries (numpy, cv2, PIL)
  4. Process single mockup
  5. Return result
  6. Clean up temp file
  7. REPEAT for next template
```

**Total time for 5 mockups**: 5-15 seconds (or more!)

### Performance Breakdown
- **Python startup**: 100-500ms × 5 = 500-2500ms
- **Library imports**: 200-500ms × 5 = 1000-2500ms  
- **File I/O**: 50-200ms × 5 = 250-1000ms
- **Actual processing**: 200-500ms × 5 = 1000-2500ms
- **Total overhead**: 2750-8500ms (just overhead!)

## Root Cause

**Line 2812** in `routes.ts`:
```typescript
for (const template of selectedTemplates) {
  // Spawns new Python process for EACH template
  const pythonResult = await new Promise<any>((resolve, reject) => {
    const python = spawn(pythonExec.command, [...pythonExec.args, '-c', `
      // Entire Python script embedded here
    `]);
  });
}
```

## Solution: Batch Processing

### Optimized Flow (FAST)
```
1. Write temp file ONCE
2. Spawn Python process ONCE
3. Load libraries ONCE
4. Process ALL mockups in parallel
5. Return all results
6. Clean up ONCE
```

**Total time for 5 mockups**: 1-3 seconds (5-10x faster!)

### Implementation Strategy

#### Option 1: Batch Python Script (Recommended)
Create a dedicated Python script that processes multiple templates:

```python
# server/scripts/batch_mockup_generator.py
import sys
import json
from concurrent.futures import ThreadPoolExecutor

def process_single_mockup(artwork_path, template):
    # Existing mockup logic
    pass

def process_batch(artwork_path, templates):
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = [
            executor.submit(process_single_mockup, artwork_path, t)
            for t in templates
        ]
        results = [f.result() for f in futures]
    return results

if __name__ == "__main__":
    artwork_path = sys.argv[1]
    templates = json.loads(sys.argv[2])
    results = process_batch(artwork_path, templates)
    print(json.dumps(results))
```

#### Option 2: Use Existing Template API
If you have a template API server running, use HTTP batch endpoint:

```typescript
// Instead of spawning Python for each template
const response = await fetch(`http://localhost:${templateApiPort}/batch-apply`, {
  method: 'POST',
  body: formData  // Contains file + all templates
});
```

#### Option 3: Keep Python Alive (Advanced)
Use a long-running Python process with stdin/stdout communication:

```typescript
// Start Python once at server startup
const pythonWorker = spawn('python', ['mockup_worker.py']);

// Send jobs via stdin
pythonWorker.stdin.write(JSON.stringify({
  artwork: base64Image,
  templates: selectedTemplates
}));

// Receive results via stdout
pythonWorker.stdout.on('data', handleResults);
```

## Recommended Fix

### Step 1: Create Batch Script

Create `server/scripts/batch_mockup.py`:

```python
#!/usr/bin/env python3
import sys
import json
import base64
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import numpy as np
import cv2
from PIL import Image, ImageOps

# [Include all the helper functions from the inline script]

def process_single_template(artwork_path, template):
    """Process one template and return result"""
    try:
        room = template['room']
        template_id = template['id']
        name = template.get('name', f"{room}_{template_id}")
        
        # [Existing mockup processing logic]
        
        return {
            'success': True,
            'template': {'room': room, 'id': template_id, 'name': name},
            'image_data': image_b64
        }
    except Exception as e:
        return {
            'success': False,
            'template': template,
            'error': str(e)
        }

def main():
    if len(sys.argv) < 3:
        print(json.dumps({'error': 'Usage: batch_mockup.py <artwork_path> <templates_json>'}))
        sys.exit(1)
    
    artwork_path = sys.argv[1]
    templates = json.loads(sys.argv[2])
    
    # Process templates in parallel (4 workers)
    results = []
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {
            executor.submit(process_single_template, artwork_path, t): t 
            for t in templates
        }
        
        for future in as_completed(futures):
            results.append(future.result())
    
    print(json.dumps({'mockups': results}))

if __name__ == '__main__':
    main()
```

### Step 2: Update routes.ts

Replace the loop with single batch call:

```typescript
// OLD (SLOW):
for (const template of selectedTemplates) {
  const pythonResult = await new Promise<any>((resolve, reject) => {
    const python = spawn(pythonExec.command, [...pythonExec.args, '-c', `...`]);
    // ... process single template
  });
  mockups.push(pythonResult);
}

// NEW (FAST):
const tempArtworkPath = path.join(process.cwd(), `temp_artwork_${Date.now()}.jpg`);
fs.writeFileSync(tempArtworkPath, req.file.buffer);

const batchResult = await new Promise<any>((resolve, reject) => {
  const pythonExec = resolvePythonExecutable();
  const scriptPath = path.join(process.cwd(), 'server', 'scripts', 'batch_mockup.py');
  const python = spawn(pythonExec.command, [
    ...pythonExec.args,
    scriptPath,
    tempArtworkPath,
    JSON.stringify(selectedTemplates)
  ]);
  
  let output = '';
  python.stdout.on('data', (data) => { output += data.toString(); });
  python.on('close', (code) => {
    fs.unlinkSync(tempArtworkPath); // Cleanup
    if (code === 0) {
      resolve(JSON.parse(output));
    } else {
      reject(new Error('Batch processing failed'));
    }
  });
});

const mockups = batchResult.mockups.filter(m => m.success);
```

## Expected Performance Improvement

### Before
- **5 mockups**: 5-15 seconds
- **3 mockups**: 3-9 seconds
- **1 mockup**: 1-3 seconds

### After
- **5 mockups**: 1-3 seconds (5-10x faster!)
- **3 mockups**: 1-2 seconds (3-5x faster!)
- **1 mockup**: 1-2 seconds (similar, but more consistent)

## Additional Optimizations

### 1. Parallel Processing
Process multiple templates simultaneously using ThreadPoolExecutor

### 2. Image Caching
Cache loaded background images for repeated templates

### 3. Reduce File I/O
Pass image as base64 instead of writing temp file

### 4. Connection Pooling
If using HTTP API, keep connections alive

### 5. Progressive Results
Stream results as they complete instead of waiting for all

## Testing

1. Generate 1 mockup - should be ~1-2 seconds
2. Generate 3 mockups - should be ~1-2 seconds
3. Generate 5 mockups - should be ~2-3 seconds

Compare with current times to verify improvement.

## Rollback Plan

If batch processing causes issues:
1. Keep old code commented out
2. Add feature flag to switch between modes
3. Monitor error rates and performance metrics
