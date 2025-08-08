#!/usr/bin/env python3
"""
Mock ComfyUI Service for demonstration purposes
This simulates the ComfyUI workflow when RunPod is unavailable
"""
import os
import time
import base64
import io
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageDraw, ImageFont
import uvicorn

app = FastAPI(title="Mock ComfyUI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def create_mock_bedroom_mockup(artwork_bytes: bytes) -> bytes:
    """Create a mock bedroom mockup with the artwork placed on wall"""
    # Open the uploaded artwork
    artwork = Image.open(io.BytesIO(artwork_bytes)).convert("RGBA")
    
    # Create bedroom background (1024x1024)
    bedroom = Image.new("RGB", (1024, 1024), color=(245, 240, 235))
    
    # Draw a simple bedroom scene
    draw = ImageDraw.Draw(bedroom)
    
    # Wall (upper portion)
    draw.rectangle([0, 0, 1024, 600], fill=(250, 248, 245))
    
    # Floor (lower portion)  
    draw.rectangle([0, 600, 1024, 1024], fill=(139, 115, 85))
    
    # Simple bed outline
    draw.rectangle([100, 700, 500, 950], fill=(200, 180, 160))
    draw.rectangle([90, 690, 510, 720], fill=(180, 160, 140))
    
    # Resize artwork to frame size (400x300)
    frame_w, frame_h = 400, 300
    artwork_resized = artwork.resize((frame_w, frame_h), Image.Resampling.LANCZOS)
    
    # Create frame
    frame = Image.new("RGB", (frame_w + 20, frame_h + 20), color=(101, 67, 33))
    frame.paste(artwork_resized, (10, 10))
    
    # Position frame on wall (center-left)
    frame_x = 150
    frame_y = 200
    bedroom.paste(frame, (frame_x, frame_y))
    
    # Add soft shadow
    shadow = Image.new("RGBA", (frame_w + 40, frame_h + 40), color=(0, 0, 0, 30))
    bedroom.paste(shadow, (frame_x + 5, frame_y + 5), shadow)
    bedroom.paste(frame, (frame_x, frame_y))
    
    # Convert back to bytes
    output = io.BytesIO()
    bedroom.save(output, format="JPEG", quality=90)
    return output.getvalue()

@app.get("/healthz")
def health():
    return {
        "ok": True,
        "service": "Mock ComfyUI (RunPod unavailable)",
        "status": "demonstration_mode"
    }

@app.post("/generate")
async def generate(
    file: UploadFile = File(...),
    prompt: str = Form("Modern bedroom with framed artwork"),
    **kwargs
):
    """Mock single mockup generation"""
    try:
        img_bytes = await file.read()
        
        # Validate image
        Image.open(io.BytesIO(img_bytes)).convert("RGB")
        
        # Simulate processing time
        time.sleep(2)
        
        # Create mock result
        mockup_bytes = create_mock_bedroom_mockup(img_bytes)
        mockup_b64 = base64.b64encode(mockup_bytes).decode()
        
        return {
            "job_id": f"mock_{int(time.time())}",
            "result": {
                "status": "COMPLETED",
                "output": {
                    "images": [{"image_url": f"data:image/jpeg;base64,{mockup_b64}"}]
                }
            }
        }
        
    except Exception as e:
        raise HTTPException(500, f"Mock generation failed: {str(e)}")

@app.post("/batch")
async def batch_generate(file: UploadFile = File(...), **kwargs):
    """Mock batch mockup generation"""
    try:
        img_bytes = await file.read()
        Image.open(io.BytesIO(img_bytes)).convert("RGB")
        
        # Simulate batch processing
        time.sleep(3)
        
        styles = [
            "Modern minimalist bedroom",
            "Cozy rustic bedroom", 
            "Elegant contemporary bedroom"
        ]
        
        results = []
        for i, style in enumerate(styles):
            mockup_bytes = create_mock_bedroom_mockup(img_bytes)
            mockup_b64 = base64.b64encode(mockup_bytes).decode()
            
            results.append({
                "prompt": style,
                "job_id": f"mock_batch_{i}_{int(time.time())}",
                "result": {
                    "status": "COMPLETED", 
                    "output": {
                        "images": [{"image_url": f"data:image/jpeg;base64,{mockup_b64}"}]
                    }
                }
            })
            
        return {"count": len(results), "items": results}
        
    except Exception as e:
        raise HTTPException(500, f"Mock batch generation failed: {str(e)}")

if __name__ == "__main__":
    print("🎭 Starting Mock ComfyUI Service on port 8001...")
    print("📝 This is a demonstration service while RunPod is unavailable")
    print("🏠 Generates mock bedroom mockups with artwork placement")
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")