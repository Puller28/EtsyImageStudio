import os, io, base64, time, asyncio, logging, zipfile
from math import ceil
from typing import Dict, Any, List, Optional, Literal, Tuple
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Header, Depends
from fastapi.responses import JSONResponse, PlainTextResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import requests
import aiohttp
import jwt as pyjwt
from PIL import Image, ImageDraw, ImageOps, ImageFile
from concurrent.futures import ThreadPoolExecutor, as_completed

# Allow loading of truncated images
ImageFile.LOAD_TRUNCATED_IMAGES = True

load_dotenv()

# Environment configuration - no network calls at import time
API_KEY = os.getenv("RUNPOD_API_KEY")
ENDPOINT_BASE = os.getenv("RUNPOD_ENDPOINT_BASE")
RENDER_API_URL = os.getenv("RENDER_API_URL", "https://mockup-api-cv83.onrender.com")
MOCK_MODE = os.getenv("MOCK_MODE", "false").lower() == "true"  # Try real API first

# =========================
# Mockup Generation Config
# =========================

DEFAULT_TARGET_PX = int(os.getenv("TARGET_PX", "2048"))
DEFAULT_INGEST_LONG_EDGE = int(os.getenv("INGEST_LONG_EDGE", "2048"))
OPENAI_MODEL = os.getenv("OPENAI_IMAGES_MODEL", "gpt-image-1")

STYLE_PROMPTS: Dict[str, str] = {
    "living_room": (
        "Create a realistic interior mockup AROUND the existing artwork. "
        "Paint a modern living room: matte neutral wall with subtle texture, focused ceiling spotlight, "
        "thin black metal frame with correct perspective and natural shadows. Minimalist, photorealistic, no text."
    ),
    "bedroom": (
        "Around the existing artwork, paint a cozy bedroom: warm neutral wall, soft daylight, "
        "light wood frame around the artwork, gentle shadows. Photorealistic, no text or logos."
    ),
    "study": (
        "Around the existing artwork, paint a refined study/home office: desaturated wall paint, "
        "subtle bookshelf blur and desk hints, muted daylight, thin dark metal frame, soft realistic shadows. No text."
    ),
    "gallery": (
        "Paint a clean gallery wall around the existing artwork: white wall with subtle microtexture, "
        "museum track lighting from above, thin black metal frame, natural falloff shadows. No text."
    ),
    "kitchen": (
        "Around the existing artwork, paint a tasteful kitchen nook: light painted wall, subtle tile/counter hints, "
        "soft daylight, thin black frame, realistic shadows. No text."
    ),
}
DEFAULT_STYLE_LIST = ["living_room", "bedroom", "study", "gallery", "kitchen"]

PRESERVE_DIRECTIVE = (
    "IMPORTANT: Preserve the existing artwork pixels exactly as-is within the KEEP region of the mask. "
    "Do not modify, blur, repaint, or regenerate any artwork pixels. "
    "Do not overlap the kept region with frame or mat; leave a clean thin gap; nothing should cover the art."
)

PRINT_SIZES: Dict[str, Tuple[int, int]] = {
    "4x5":   (1600, 2000),
    "3x4":   (1536, 2048),
    "2x3":   (1600, 2400),
    "11x14": (1650, 2100),
    "A4":    (1654, 2339),
}

# Build URLs only if endpoint is configured
# ENDPOINT_BASE should be the full endpoint URL without /run or /status suffixes
RUN_URL = f"{ENDPOINT_BASE}/run" if ENDPOINT_BASE else None
STATUS_URL = f"{ENDPOINT_BASE}/status" if ENDPOINT_BASE else None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# JWT Configuration (matching Express.js backend)
JWT_SECRET = os.getenv("JWT_SECRET", "your-super-secret-jwt-key-change-in-production")
logger.info(f"🔑 FastAPI JWT Secret: hasCustom={bool(os.getenv('JWT_SECRET'))}, length={len(JWT_SECRET)}")

app = FastAPI()

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "fastapi-mockup-service"}
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"], allow_credentials=True
)

# ---------- Authentication ----------

async def get_current_user(authorization: str = Header(None)):
    """Extract and validate JWT token, return user info"""
    logger.info(f"🔍 FastAPI Auth Debug: authorization={authorization[:50] if authorization else 'None'}...")
    
    if not authorization or not authorization.startswith("Bearer "):
        logger.error("❌ No valid Authorization header")
        raise HTTPException(401, "Authorization header required")
    
    token = authorization.split(" ")[1]
    logger.info(f"🔍 Extracted token: {token[:20]}...")
    
    try:
        # First try to decode without verification to see the payload
        unverified_payload = pyjwt.decode(token, options={"verify_signature": False})
        logger.info(f"🔍 Unverified JWT payload: {unverified_payload}")
        
        # Now decode with verification
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("userId")
        logger.info(f"🔍 JWT payload: userId={user_id}")
        
        if not user_id:
            logger.error("❌ No userId in JWT payload")
            raise HTTPException(401, "Invalid token")
        
        # Make request to Express.js backend to get user info
        logger.info(f"🔗 Requesting user info from Express.js for userId: {user_id}")
        async with aiohttp.ClientSession() as session:
            async with session.get(
                "http://localhost:5000/api/user",
                headers={"Authorization": authorization}
            ) as response:
                response_text = await response.text()
                logger.info(f"🔍 Express.js response: status={response.status}, body={response_text[:100]}...")
                
                if response.status == 200:
                    user_data = await response.json() if response_text else None
                    logger.info(f"✅ User authenticated: {user_data.get('id') if user_data else 'None'}")
                    return user_data
                else:
                    logger.error(f"❌ Express.js auth failed: {response.status} - {response_text}")
                    raise HTTPException(401, "User not found")
                    
    except pyjwt.InvalidTokenError as e:
        logger.error(f"❌ JWT decode error: {str(e)}")
        raise HTTPException(401, "Invalid token")
    except Exception as e:
        logger.error(f"❌ Auth error: {str(e)}")
        raise HTTPException(401, "Authentication failed")

async def deduct_credits(user_id: str, credits: int, authorization: str):
    """Deduct credits from user account via Express.js backend"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "http://localhost:5000/api/deduct-credits",
                headers={"Authorization": authorization, "Content-Type": "application/json"},
                json={"credits": credits}
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    return result
                elif response.status == 400:
                    error_data = await response.json()
                    raise HTTPException(400, error_data.get("error", "Insufficient credits"))
                else:
                    raise HTTPException(500, "Credit deduction failed")
    except Exception as e:
        logger.error(f"Credit deduction error: {str(e)}")
        raise HTTPException(500, "Credit deduction failed")

# =========================
# Mockup Helper Functions
# =========================

def _img_to_png_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return buf.getvalue()

def _resize_fit(img: Image.Image, target: Tuple[int, int]) -> Image.Image:
    return ImageOps.contain(img, target, Image.Resampling.LANCZOS)

def _ingest_simple_resize(file_bytes: bytes, enable: bool, max_long_edge: int) -> Image.Image:
    """
    Proportional resize ONLY if long edge exceeds max_long_edge.
    No padding/cropping; preserves aspect ratio exactly.
    """
    img = Image.open(io.BytesIO(file_bytes))
    img = ImageOps.exif_transpose(img)
    if not enable:
        return img.convert("RGBA")
    w, h = img.size
    long_edge = max(w, h)
    if long_edge > max_long_edge:
        s = max_long_edge / float(long_edge)
        img = img.resize((int(w * s), int(h * s)), Image.Resampling.LANCZOS)
    return img.convert("RGBA")

def _pad_canvas_keep_center(img: Image.Image, pad_ratio: float, target_side: int):
    """
    Upscale to target_side (max edge) ONLY if image is smaller; never downscale.
    Then add border by pad_ratio; returns (canvas_rgba, art_bbox_on_canvas).
    """
    img = img.convert("RGBA")
    longest = max(img.size)
    if longest < target_side:
        scale = target_side / float(longest)
        img = img.resize((int(img.width * scale), int(img.height * scale)), Image.Resampling.LANCZOS)

    w, h = img.size
    border = int(pad_ratio * max(w, h))
    canvas_w, canvas_h = w + 2 * border, h + 2 * border

    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    x0, y0 = border, border
    canvas.paste(img, (x0, y0), img)
    return canvas, (x0, y0, x0 + w, y0 + h)

def _build_outpaint_mask(canvas_size: Tuple[int, int], keep_bbox: Tuple[int, int, int, int]) -> Image.Image:
    """
    OpenAI Images/edits semantics for gpt-image-1:
      transparent (alpha=0)  -> EDIT
      opaque     (alpha=255) -> KEEP
    We KEEP the artwork rectangle; EDIT everything else.
    """
    W, H = canvas_size
    x0, y0, x1, y1 = keep_bbox
    alpha = Image.new("L", (W, H), 0)               # EDIT outside
    keep  = Image.new("L", (x1 - x0, y1 - y0), 255) # KEEP inside
    alpha.paste(keep, (x0, y0))
    mask = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    mask.putalpha(alpha)
    return mask

def _api_edit_size_for(canvas_size: Tuple[int, int]) -> Tuple[int, int, str]:
    """
    Pick OpenAI-supported edit size matching orientation:
      - Portrait  -> 1024x1536
      - Landscape -> 1536x1024
      - Square    -> 1024x1024
    """
    W, H = canvas_size
    if W == H:
        return 1024, 1024, "1024x1024"
    if H > W:
        return 1024, 1536, "1024x1536"
    return 1536, 1024, "1536x1024"

def _openai_images_edit_multi(image_png: bytes, mask_png: bytes, prompt: str, n: int, size_str: str) -> List[str]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not set on server")
    url = "https://api.openai.com/v1/images/edits"
    headers = {"Authorization": f"Bearer {api_key}"}
    org_id = os.getenv("OPENAI_ORG_ID")
    if org_id:
        headers["OpenAI-Organization"] = org_id

    data = {"model": OPENAI_MODEL, "prompt": prompt, "size": size_str, "n": str(max(1, min(int(n), 10)))}
    files = {
        "image": ("canvas.png", image_png, "image/png"),
        "mask":  ("mask.png",   mask_png,  "image/png"),
    }
    try:
        resp = requests.post(url, headers=headers, data=data, files=files, timeout=300)
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Images API request failed: {e}")
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Image API error [{resp.status_code}]: {resp.text}")

    js = resp.json()
    items = js.get("data") or []
    if not items:
        raise HTTPException(status_code=502, detail=f"Image API returned no data: {js}")
    return [it.get("b64_json") for it in items if it.get("b64_json")]

# ---------- helpers ----------

def px_to_latent(px: int) -> int:
    return int(round(px / 8))

def to_b64(img_bytes: bytes) -> str:
    return base64.b64encode(img_bytes).decode("utf-8")

def build_workflow_dict(
    prompt: str,
    neg_prompt: str,
    canvas_w: int,
    canvas_h: int,
    art_b64: str,
    art_w: int,
    art_h: int,
    pos_x_px: int,
    pos_y_px: int,
    steps: int = 20,
    cfg: float = 6.5,
    seed: int = 1234567,
    model: str = "flux1-dev-fp8.safetensors",
) -> Dict[str, Any]:

    # Convert pixels to latent coordinates (pixels / 8)
    pos_x_lat = round(pos_x_px / 8)
    pos_y_lat = round(pos_y_px / 8)

    # Determine file extension based on image format
    filename = "art.jpg" if art_b64.startswith("/9j/") else "art.png"
    
    # RunPod format: workflow nodes directly at top level with images array
    workflow_nodes = {
            "100": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {
                    "ckpt_name": model
                }
            },
            "0": {
                "class_type": "LoadImage",
                "inputs": {
                    "image": filename,
                    "upload": False
                }
            },
            "1": {
                "class_type": "ImageScale",
                "inputs": {
                    "image": ["0", 0],
                    "width": art_w,
                    "height": art_h,
                    "upscale_method": "lanczos",
                    "crop": "disabled"
                }
            },
            "2": {
                "class_type": "VAEEncode",
                "inputs": {
                    "pixels": ["1", 0],
                    "vae": ["100", 2]
                }
            },
            "3": {
                "class_type": "CLIPTextEncode",
                "inputs": {
                    "clip": ["100", 1],
                    "text": prompt
                }
            },
            "4": {
                "class_type": "CLIPTextEncode",
                "inputs": {
                    "clip": ["100", 1],
                    "text": neg_prompt
                }
            },
            "5": {
                "class_type": "EmptyLatentImage",
                "inputs": {
                    "width": canvas_w,
                    "height": canvas_h,
                    "batch_size": 1
                }
            },
            "6": {
                "class_type": "KSampler",
                "inputs": {
                    "model": ["100", 0],
                    "positive": ["3", 0],
                    "negative": ["4", 0],
                    "latent_image": ["5", 0],
                    "seed": seed,
                    "steps": steps,
                    "cfg": cfg,
                    "sampler_name": "euler",
                    "scheduler": "normal",
                    "denoise": 1.0
                }
            },
            "7": {
                "class_type": "LatentComposite",
                "inputs": {
                    "samples_to": ["6", 0],
                    "samples_from": ["2", 0],
                    "x": pos_x_lat,
                    "y": pos_y_lat,
                    "feather": 0,
                    "tiled": False
                }
            },
            "8": {
                "class_type": "VAEDecode",
                "inputs": {
                    "samples": ["7", 0],
                    "vae": ["100", 2]
                }
            },
            "9": {
                "class_type": "SaveImage",
                "inputs": {
                    "images": ["8", 0],
                    "filename_prefix": "mockup_out"
                }
            }
        }
    
    return {
        "images": [
            {
                "name": filename,
                "image": art_b64  # Raw base64, no data:image prefix
            }
        ],
        "workflow": workflow_nodes
    }

async def submit_job_with_retry(payload: Dict[str, Any], max_retries: int = 3) -> str:
    """Submit job to RunPod with exponential backoff retry logic"""
    
    # Return mock data in mock mode
    if MOCK_MODE:
        logger.info("MOCK_MODE: Returning fake job ID")
        return f"mock_job_{int(time.time())}"
    
    # Check credentials at runtime
    if not API_KEY or not ENDPOINT_BASE or not RUN_URL:
        raise HTTPException(500, "RunPod credentials not configured. Please check RUNPOD_API_KEY and RUNPOD_ENDPOINT_BASE environment variables.")
    
    headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
    
    for attempt in range(max_retries):
        try:
            logger.info(f"🔗 Submitting to RunPod (attempt {attempt + 1}/{max_retries}): {RUN_URL}")
            
            # Use asyncio executor for non-blocking HTTP request  
            loop = asyncio.get_event_loop()
            r = await loop.run_in_executor(
                None,
                lambda: requests.post(str(RUN_URL), headers=headers, json={"input": payload}, timeout=60)
            )
            
            logger.info(f"📡 RunPod response status: {r.status_code}")
            
            # Handle specific error codes with retry
            if r.status_code in [502, 503, 504, 500]:
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt  # Exponential backoff
                    logger.warning(f"🔄 RunPod temporary error {r.status_code}, retrying in {wait_time}s...")
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    raise HTTPException(503, f"RunPod serverless endpoint is currently unavailable ({r.status_code}). This is a temporary infrastructure issue. Please try again in a few minutes.")
            
            if r.status_code >= 400:
                error_text = r.text[:500] if r.text else "Unknown error"
                logger.error(f"❌ RunPod error: {error_text}")
                raise HTTPException(r.status_code, f"RunPod request failed: {r.status_code} {r.reason} - {error_text}")
                
            data = r.json()
            job_id = data.get("id")
            if not job_id:
                raise HTTPException(500, f"RunPod did not return a job id: {data}")
            return job_id
            
        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                logger.warning(f"🔄 Connection error, retrying in {wait_time}s: {str(e)}")
                await asyncio.sleep(wait_time)
                continue
            else:
                logger.error(f"🔥 Connection error after {max_retries} attempts: {str(e)}")
                # Provide more helpful error message for common RunPod issues
                if "IncompleteRead" in str(e):
                    raise HTTPException(503, f"RunPod serverless endpoint is experiencing connectivity issues. This is typically temporary. Please try again in a few minutes.")
                raise HTTPException(503, f"Failed to connect to RunPod endpoint: {str(e)}")
    
    raise HTTPException(503, "Max retries exceeded")

async def poll_job_async(job_id: str, timeout_sec: int = 90, max_retries: int = 5) -> Dict[str, Any]:
    """Poll job status with async support and retry logic for transient errors"""
    
    # Return mock result in mock mode
    if MOCK_MODE:
        logger.info("MOCK_MODE: Returning fake completed job")
        await asyncio.sleep(1)  # Simulate processing time
        return {
            "status": "COMPLETED",
            "output": {
                "images": [{"image": base64.b64encode(b"fake_image_data").decode("utf-8")}]
            }
        }
    
    if not API_KEY or not ENDPOINT_BASE:
        raise HTTPException(500, "RunPod credentials not configured")
    
    headers = {"Authorization": f"Bearer {API_KEY}"}
    deadline = time.time() + timeout_sec
    last = None
    consecutive_errors = 0
    
    while time.time() < deadline:
        try:
            # Use asyncio executor for non-blocking HTTP request
            loop = asyncio.get_event_loop()
            sr = await loop.run_in_executor(
                None,
                lambda: requests.get(f"{STATUS_URL}/{job_id}", headers=headers, timeout=30)
            )
            
            if sr.status_code == 404:
                logger.debug(f"⏳ Job {job_id} not found yet, waiting...")
                await asyncio.sleep(2)
                continue
                
            if sr.status_code >= 500:
                consecutive_errors += 1
                if consecutive_errors >= max_retries:
                    logger.error(f"❌ Too many consecutive server errors for job {job_id}")
                    return {"status": "ERROR", "error": f"Server errors after {max_retries} attempts"}
                
                wait_time = min(2 ** consecutive_errors, 10)  # Cap at 10 seconds
                logger.warning(f"🔄 Server error {sr.status_code} for job {job_id}, retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
                continue
                
            # Reset error counter on successful response
            consecutive_errors = 0
            
            try:
                last = sr.json()
            except ValueError as e:
                logger.warning(f"⚠️ Invalid JSON response for job {job_id}: {str(e)}")
                await asyncio.sleep(2)
                continue
            
            status = last.get("status")
            if status in ["COMPLETED", "FAILED"]:
                logger.info(f"✅ Job {job_id} finished with status: {status}")
                return last
                
            # Handle redis client errors specifically
            if "redis err: client is nil" in str(last):
                logger.warning(f"🔄 Redis client error for job {job_id}, retrying...")
                await asyncio.sleep(3)
                continue
                
            await asyncio.sleep(2)
            
        except requests.exceptions.RequestException as e:
            consecutive_errors += 1
            if consecutive_errors >= max_retries:
                logger.error(f"❌ Connection errors exceeded max retries for job {job_id}")
                return {"status": "ERROR", "error": f"Connection errors after {max_retries} attempts: {str(e)}"}
            
            wait_time = min(2 ** consecutive_errors, 10)
            logger.warning(f"🔄 Connection error for job {job_id}, retrying in {wait_time}s: {str(e)}")
            await asyncio.sleep(wait_time)
    
    logger.warning(f"⏰ Job {job_id} timed out after {timeout_sec} seconds")
    return {"status": "TIMEOUT", "last": last or {}}

async def composite_artwork_on_bedroom(bedroom_result: Dict[str, Any], artwork_bytes: bytes, art_w: int, art_h: int, pos_x: int, pos_y: int) -> Dict[str, Any]:
    """Composite user's artwork onto the generated bedroom scene"""
    try:
        if 'output' not in bedroom_result or 'images' not in bedroom_result['output']:
            return bedroom_result
            
        # Get the generated bedroom image
        bedroom_image_data = bedroom_result['output']['images'][0]
        bedroom_b64 = bedroom_image_data['data']
        bedroom_img = Image.open(io.BytesIO(base64.b64decode(bedroom_b64)))
        
        # Load and resize user's artwork
        artwork_img = Image.open(io.BytesIO(artwork_bytes)).convert("RGBA")
        artwork_resized = artwork_img.resize((art_w, art_h), Image.Resampling.LANCZOS)
        
        # Create a simple frame effect (add border)
        frame_thickness = 10
        frame_color = (101, 67, 33)  # Brown frame color
        framed_artwork = Image.new("RGBA", (art_w + frame_thickness*2, art_h + frame_thickness*2), frame_color)
        framed_artwork.paste(artwork_resized, (frame_thickness, frame_thickness))
        
        # Composite onto bedroom scene
        bedroom_img.paste(framed_artwork, (pos_x, pos_y), framed_artwork)
        
        # Convert back to base64
        output_buffer = io.BytesIO()
        bedroom_img.save(output_buffer, format='PNG')
        composited_b64 = base64.b64encode(output_buffer.getvalue()).decode('utf-8')
        
        # Update the result with composited image
        bedroom_result['output']['images'][0]['data'] = composited_b64
        bedroom_result['output']['images'][0]['filename'] = 'bedroom_with_artwork.png'
        
        logger.info("✅ Successfully composited artwork onto bedroom scene")
        return bedroom_result
        
    except Exception as e:
        logger.error(f"❌ Failed to composite artwork: {str(e)}")
        return bedroom_result  # Return original result if compositing fails

# ---------- endpoints ----------

# Health and status endpoints
@app.get("/healthz")
async def health():
    """Health check endpoint that responds quickly without external calls"""
    return {"ok": True}

@app.get("/")
async def root():
    """Root endpoint for Replit probes"""
    return PlainTextResponse("ok")

@app.get("/status")
async def detailed_status():
    """Detailed status including RunPod connectivity"""
    status = {
        "ok": True,
        "fastapi_running": True,
        "api_key_configured": bool(API_KEY),
        "endpoint_base_configured": bool(ENDPOINT_BASE),
        "mock_mode": MOCK_MODE
    }
    
    # Test RunPod connectivity (non-blocking)
    if not MOCK_MODE and API_KEY and ENDPOINT_BASE:
        try:
            # Quick health check with short timeout
            headers = {"Authorization": f"Bearer {API_KEY}"}
            response = await asyncio.wait_for(
                asyncio.get_event_loop().run_in_executor(
                    None, 
                    lambda: requests.get(f"{ENDPOINT_BASE}/health", headers=headers, timeout=5)
                ), 
                timeout=6.0
            )
            status["runpod_status"] = "available" if response.status_code < 400 else f"error_{response.status_code}"
        except asyncio.TimeoutError:
            status["runpod_status"] = "timeout"
        except Exception as e:
            status["runpod_status"] = f"unreachable_{str(e)[:50]}"
    else:
        status["runpod_status"] = "mock_mode" if MOCK_MODE else "not_configured"
    
    return status

@app.get("/models")
async def list_models():
    """List available models on RunPod ComfyUI instance"""
    if MOCK_MODE:
        return {
            "models": [
                "flux1-dev-fp8.safetensors",
                "realisticVision51_v51VAE.safetensors", 
                "dreamshaper_8.safetensors",
                "sdxl_base_1.0.safetensors"
            ]
        }
    
    try:
        # Try to get model list from RunPod ComfyUI API
        headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
        
        # This is a placeholder - RunPod ComfyUI doesn't have a standard models endpoint
        # We'll need to check what models are actually available through trial or documentation
        
        return {
            "models": [
                "flux1-dev-fp8.safetensors",  # Current model
                "Unknown - need to check RunPod ComfyUI 5.2.0 documentation"
            ],
            "note": "Model list requires checking RunPod ComfyUI 5.2.0 instance directly"
        }
        
    except Exception as e:
        return {"error": f"Could not fetch models: {str(e)}"}

# Template system endpoints
@app.get("/templates")
async def list_templates():
    """List available room templates"""
    return {
        "templates": ["living_room", "bedroom", "study", "gallery", "kitchen"],
        "description": "Available room templates for mockup generation"
    }

@app.post("/generate-single-mockup") 
async def generate_single_mockup_endpoint(
    file: UploadFile = File(...),
    style: str = Form(...),
    user: dict = Depends(get_current_user),
    authorization: str = Header(None)
):
    """Generate a single mockup for one style - for sequential processing"""
    
    user_id = user.get('id')
    if not user_id:
        raise HTTPException(401, "Invalid user data")
    
    try:
        # Read and validate image
        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded")
        
        # Log request details
        try:
            from PIL import Image
            import io
            img = Image.open(io.BytesIO(contents))
            logger.info(f"📋 Single mockup request: style={style}, image={img.size}")
        except Exception:
            logger.info(f"📋 Single mockup request: style={style}")
        
        # Generate single mockup using local OpenAI API
        logger.info(f"🔧 Using integrated local single mockup generation")
        from local_mockup_api import generate_single_mockup
        result = generate_single_mockup(contents, style)
        
        # Convert to frontend format
        mockup = {
            "template": style,
            "variation": 1,
            "image": f"data:image/jpeg;base64,{result['image_b64']}",
            "metadata": {"style": style}
        }
        
        logger.info(f"✅ Generated single mockup for style '{style}' using OpenAI API")
        
        return {
            "success": True,
            "style": style,
            "mockup": mockup,
            "canvas_size": result["canvas_size"],
            "art_bbox": result["art_bbox"],
            "local_generation": True,
            "openai_model": result["openai_model"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Single mockup generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Single mockup generation failed: {str(e)}")

@app.post("/generate-template-mockups")
async def generate_template_mockups(
    file: UploadFile = File(...),
    mode: Literal["single_template", "all_templates"] = Form("single_template"),
    template: Optional[str] = Form(None),  # Required if mode is "single_template"
    user: dict = Depends(get_current_user),
    authorization: str = Header(None)
):
    """
    Generate mockups using template system via mockup service
    
    Modes:
    - single_template: Generate 5 mockups of one template (requires template parameter)
    - all_templates: Generate 1 mockup from each of the 5 templates
    """
    
    # Deduct 5 credits for mockup generation
    user_id = user.get('id')
    if not user_id:
        raise HTTPException(401, "Invalid user data")
    logger.info(f"💳 Deducting 5 credits for template mockup generation from user {user_id}")
    try:
        await deduct_credits(user_id, 5, authorization)
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Credit deduction failed: {str(e)}")
        raise HTTPException(500, "Credit deduction failed")
    
    # Validate inputs
    available_templates = ["living_room", "bedroom", "study", "gallery", "kitchen"]
    
    if mode == "single_template":
        if not template or template not in available_templates:
            raise HTTPException(400, f"Template required for single_template mode. Available: {available_templates}")
    
    # Read and validate image
    try:
        # Reset file pointer and read
        await file.seek(0)
        img_bytes = await file.read()
        
        # Validate image by opening it
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        logger.info(f"📋 Template mockup request: mode={mode}, template={template}, image={img.size}")
        logger.info(f"🔧 MOCK_MODE={MOCK_MODE}, MOCKUP_API_URL='{RENDER_API_URL}'")
    except Exception as e:
        raise HTTPException(400, f"Invalid image upload: {str(e)}")
    
    # Check file size and compress if needed
    file_size_mb = len(img_bytes) / (1024 * 1024)
    logger.info(f"📏 Image size: {file_size_mb:.2f}MB")
    
    if file_size_mb > 1.0:
        logger.info("📦 Image > 1MB, compressing via image service...")
        try:
            # Use the fit_under_1mb endpoint to reduce file size
            img_b64_large = base64.b64encode(img_bytes).decode('utf-8')
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{RENDER_API_URL}/utils/fit_under_1mb",
                    json={"image": img_b64_large, "format": "base64"},
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as response:
                    
                    if response.status == 200:
                        compress_result = await response.json()
                        img_b64 = compress_result.get("image", img_b64_large)
                        logger.info("✅ Image compressed successfully")
                    else:
                        logger.warning(f"⚠️ Compression failed ({response.status}), using original image")
                        img_b64 = img_b64_large
        except Exception as e:
            logger.warning(f"⚠️ Compression error: {str(e)}, using original image")
            img_b64 = base64.b64encode(img_bytes).decode('utf-8')
    else:
        # Image is already under 1MB
        img_b64 = base64.b64encode(img_bytes).decode('utf-8')
    
    try:
        # Prepare request to mockup service
        payload = {
            "image": img_b64,
            "mode": mode,
            "template": template,
            "format": "base64"
        }
        
        # Check if we should use mock mode or real API
        if MOCK_MODE:
            logger.info("🧪 MOCK MODE: Simulating template mockup generation")
            mockups = []
            
            if mode == "single_template":
                # Generate 5 mockups of the selected template
                for i in range(5):
                    mockups.append({
                        "template": template,
                        "variation": i + 1,
                        "image": img_b64,  # In real implementation, this would be the mockup
                        "metadata": {"style": f"{template}_style_{i+1}"}
                    })
            else:  # all_templates
                # Generate 1 mockup from each template
                for tmpl in available_templates:
                    mockups.append({
                        "template": tmpl,
                        "variation": 1,
                        "image": img_b64,  # In real implementation, this would be the mockup
                        "metadata": {"style": f"{tmpl}_default"}
                    })
            
            return {
                "success": True,
                "mode": mode,
                "template": template,
                "mockups": mockups,
                "count": len(mockups)
            }
        else:
            # Use local integrated OpenAI API instead of external service
            logger.info(f"🔧 Using integrated local mockup generation")
            try:
                from local_mockup_api import generate_local_mockups, generate_single_mockup
                result = generate_local_mockups(base64.b64decode(img_b64), mode, template)
                
                # Convert to legacy format for frontend compatibility
                mockups = []
                if "results" in result:
                    for item in result["results"]:
                        style = item.get("style", "unknown")
                        image_data = item.get("image_b64", "")
                        mockups.append({
                            "template": style,
                            "variation": 1,
                            "image": image_data,
                            "metadata": {"style": f"{style}_local_generated"}
                        })
                
                logger.info(f"✅ Generated {len(mockups)} mockups locally using OpenAI API")
                
                return {
                    "success": True,
                    "mode": mode,
                    "template": template,
                    "mockups": mockups,
                    "count": len(mockups),
                    "local_generation": True
                }
            except Exception as e:
                logger.error(f"❌ Local generation failed: {str(e)}")
                # Return error instead of fallback
                raise HTTPException(500, f"Mockup generation failed: {str(e)}")
                    
    except Exception as e:
        logger.error(f"❌ Template generation failed: {type(e).__name__}: {str(e)}")
        import traceback
        logger.error(f"❌ Full traceback: {traceback.format_exc()}")
        raise HTTPException(500, f"Template generation failed: {str(e)}")

@app.post("/generate")
async def generate(
    file: UploadFile = File(...),
    prompt: str = Form("Framed print on a gallery wall with spot lighting and minimal decor, clean plaster wall, soft natural light"),
    negative: str = Form("blurry, low detail, distorted, bad framing, artifacts"),
    model: str = Form("flux1-dev-fp8.safetensors"),
    canvas_w: int = Form(1024),
    canvas_h: int = Form(1024),
    art_w: int = Form(512),
    art_h: int = Form(512),
    pos_x: int = Form(256),
    pos_y: int = Form(256),
    steps: int = Form(22),
    cfg: float = Form(6.5),
    seed: int = Form(1234567),
    poll_seconds: int = Form(60),
):
    img_bytes = await file.read()
    logger.info(f"📋 Received file: {file.filename}, size: {len(img_bytes)} bytes, content_type: {file.content_type}")
    
    try:
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        orig_w, orig_h = img.size
        logger.info(f"✅ Image validated: {img.size}, mode: {img.mode}")
        
        # Letterbox scaling to preserve aspect ratio
        if orig_w > orig_h:  # Landscape
            scaled_w = art_w
            scaled_h = int((orig_h / orig_w) * art_w)
        else:  # Portrait or square
            scaled_h = art_h  
            scaled_w = int((orig_w / orig_h) * art_h)
            
        # Ensure minimum size
        if scaled_w < 64: scaled_w = 64
        if scaled_h < 64: scaled_h = 64
        
        logger.info(f"📐 Letterbox scaling: {orig_w}×{orig_h} → {scaled_w}×{scaled_h}")
        
        # Position on 1024x1024 canvas (centered)
        pos_x = (canvas_w - scaled_w) // 2
        pos_y = (canvas_h - scaled_h) // 2
        
    except Exception as e:
        logger.error(f"❌ Image validation failed: {str(e)}")
        logger.error(f"📋 File details - filename: {file.filename}, content_type: {file.content_type}, size: {len(img_bytes)}")
        raise HTTPException(400, f"Invalid image upload: {str(e)}")

    art_b64 = to_b64(img_bytes)
    workflow = build_workflow_dict(
        prompt=prompt, neg_prompt=negative,
        canvas_w=canvas_w, canvas_h=canvas_h,
        art_b64=art_b64, art_w=scaled_w, art_h=scaled_h,
        pos_x_px=pos_x, pos_y_px=pos_y,
        steps=steps, cfg=cfg, seed=seed,
        model=model
    )

    try:
        logger.info(f"🔧 Submitting RunPod format with {len(workflow['workflow'])} nodes and {len(workflow['images'])} images")
        
        # Debug: Check workflow construction
        logger.info(f"🔍 Workflow type: {type(workflow)}")
        logger.info(f"🔍 Workflow keys: {list(workflow.keys()) if isinstance(workflow, dict) else 'not dict'}")
        
        # Ensure correct images format  
        if 'images' in workflow and workflow['images']:
            img = workflow['images'][0]
            logger.info(f"🔍 Image object keys: {list(img.keys())}")
            logger.info(f"🔍 Has name key: {'name' in img}")
            logger.info(f"🔍 Has image key: {'image' in img}")
        
        job_id = await submit_job_with_retry(workflow)
        logger.info(f"✅ Job submitted successfully: {job_id}")
        result = await poll_job_async(job_id, timeout_sec=poll_seconds)
        
        # Following your rules: All compositing done in ComfyUI workflow (no Python post-processing)
        
        return {"job_id": job_id, "result": result}
    except Exception as e:
        logger.error(f"❌ Error in generate endpoint: {str(e)}")
        logger.debug(f"🔍 Workflow structure: {list(workflow['workflow'].keys())}")
        raise HTTPException(500, f"Workflow submission failed: {str(e)}")

# ======== NEW: /batch ========

ROOM_PRESETS: List[str] = [
    "Framed print on a gallery wall with spot lighting and minimal decor",
    "Framed artwork in a cozy bedroom with sunlight filtering through linen curtains",
    "Large framed print above a modern sofa in a bright living room, natural light, soft shadows",
    "Framed poster in a minimalist hallway with white plaster walls and oak floor",
    "Framed artwork in a rustic study with wooden shelves, warm lamplight"
]

@app.post("/batch")
async def batch_generate(
    file: UploadFile = File(...),
    # optional: override defaults for art size & placement
    canvas_w: int = Form(1024),
    canvas_h: int = Form(1024),
    art_w: int = Form(512),
    art_h: int = Form(512),
    pos_x: int = Form(256),
    pos_y: int = Form(256),
    steps: int = Form(20),
    cfg: float = Form(6.5),
    seed: int = Form(1234567),
    poll_seconds: int = Form(90),
    # optional: semicolon-separated custom prompts
    prompts: str = Form(""),
):
    # read/upload once
    img_bytes = await file.read()
    try:
        Image.open(io.BytesIO(img_bytes)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Invalid image upload")
    art_b64 = to_b64(img_bytes)

    # choose prompt list
    prompt_list = [p.strip() for p in prompts.split(";") if p.strip()] or ROOM_PRESETS
    negative = "blurry, low detail, distorted, bad framing, artifacts"

    # prepare payloads
    payloads = []
    for idx, prompt in enumerate(prompt_list):
        wf = build_workflow_dict(
            prompt=prompt, neg_prompt=negative,
            canvas_w=canvas_w, canvas_h=canvas_h,
            art_b64=art_b64, art_w=art_w, art_h=art_h,
            pos_x_px=pos_x, pos_y_px=pos_y,
            steps=steps, cfg=cfg, seed=seed + idx  # small seed offset per prompt
        )
        payloads.append((prompt, wf))

    # submit & poll with async concurrency
    results = []
    
    # Submit all jobs concurrently using async tasks
    submit_tasks = []
    for prompt, workflow in payloads:
        task = asyncio.create_task(
            batch_submit_with_prompt(prompt, workflow)
        )
        submit_tasks.append(task)
    
    # Wait for all submissions to complete
    job_submissions = await asyncio.gather(*submit_tasks, return_exceptions=True)
    
    # Process submission results
    job_ids: List[Dict[str, str]] = []
    for submission in job_submissions:
        if isinstance(submission, Exception):
            results.append({"prompt": "unknown", "error": f"submit_failed: {str(submission)}"})
        elif isinstance(submission, dict) and submission.get("success"):
            job_ids.append({"prompt": submission["prompt"], "job_id": submission["job_id"]})
        elif isinstance(submission, dict):
            results.append({"prompt": submission.get("prompt", "unknown"), "error": submission.get("error", "unknown error")})

    # Poll each job concurrently with controlled concurrency
    if job_ids:
        poll_tasks = []
        for job_data in job_ids:
            task = asyncio.create_task(
                batch_poll_with_prompt(job_data["prompt"], job_data["job_id"], poll_seconds)
            )
            poll_tasks.append(task)
        
        poll_results = await asyncio.gather(*poll_tasks, return_exceptions=True)
        
        for poll_result in poll_results:
            if isinstance(poll_result, Exception):
                results.append({"prompt": "unknown", "error": f"poll_failed: {str(poll_result)}"})
            else:
                results.append(poll_result)

    return {"count": len(results), "items": results}

# ======== NEW: /outpaint/mockup ========

@app.post("/outpaint/mockup")
async def outpaint_mockup(
    file: UploadFile = File(...),
    target_px: int = Form(1280),
    pad_ratio: float = Form(0.3),
    normalize_ratio: str = Form("normalize_ratio"),
    mat_pct: float = Form(0),
    variants: int = Form(5),
    overlay_original: int = Form(0),
    overlay_inset_px: int = Form(0),
    make_print_previews: int = Form(0),
    ingest_resize: int = Form(1),
    ingest_max_long_edge: int = Form(1024),
    return_format: str = Form("zip"),
    filename: str = Form("mockup_bundle"),
    user: dict = Depends(get_current_user),
    authorization: str = Header(None)
):
    """
    Generate outpainted mockups with default parameters optimized for artwork display
    
    Uses the following default parameters for best results:
    - target_px: 1280 (final output resolution)
    - pad_ratio: 0.3 (30% padding around artwork)
    - normalize_ratio: "normalize_ratio" (maintain aspect ratios)
    - mat_pct: 0 (no matting effect)
    - variants: 5 (generate 5 different mockup variations)
    - overlay_original: 0 (don't overlay original)
    - overlay_inset_px: 0 (no inset overlay)
    - make_print_previews: 0 (no print previews)
    - ingest_resize: 1 (resize input if needed)
    - ingest_max_long_edge: 1024 (max input size)
    - return_format: "zip" (return as zip file)
    - filename: "mockup_bundle" (default filename)
    """
    
    # Deduct 5 credits for outpaint mockup generation
    user_id = user.get('id')
    if not user_id:
        raise HTTPException(401, "Invalid user data")
    logger.info(f"💳 Deducting 5 credits for outpaint mockup generation from user {user_id}")
    try:
        await deduct_credits(user_id, 5, authorization)
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Credit deduction failed: {str(e)}")
        raise HTTPException(500, "Credit deduction failed")
    
    # Read and validate image
    try:
        await file.seek(0)
        img_bytes = await file.read()
        
        # Validate image by opening it
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        logger.info(f"📋 Outpaint mockup request: {img.size}, variants={variants}, target_px={target_px}")
        logger.info(f"🔧 MOCK_MODE={MOCK_MODE}, MOCKUP_API_URL='{RENDER_API_URL}'")
    except Exception as e:
        raise HTTPException(400, f"Invalid image upload: {str(e)}")
    
    # Check file size and compress if needed
    file_size_mb = len(img_bytes) / (1024 * 1024)
    logger.info(f"📏 Image size: {file_size_mb:.2f}MB")
    
    if file_size_mb > 1.0:
        logger.info("📦 Image > 1MB, compressing via image service...")
        try:
            # Use the fit_under_1mb endpoint to reduce file size
            img_b64_large = base64.b64encode(img_bytes).decode('utf-8')
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{RENDER_API_URL}/utils/fit_under_1mb",
                    json={"image": img_b64_large, "format": "base64"},
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as response:
                    
                    if response.status == 200:
                        compress_result = await response.json()
                        img_b64 = compress_result.get("image", img_b64_large)
                        logger.info("✅ Image compressed successfully")
                    else:
                        logger.warning(f"⚠️ Compression failed ({response.status}), using original image")
                        img_b64 = img_b64_large
        except Exception as e:
            logger.warning(f"⚠️ Compression error: {str(e)}, using original image")
            img_b64 = base64.b64encode(img_bytes).decode('utf-8')
    else:
        img_b64 = base64.b64encode(img_bytes).decode('utf-8')
    
    # Mock mode for development/testing
    if MOCK_MODE:
        logger.info("🎭 MOCK MODE: Simulating outpaint mockup generation...")
        await asyncio.sleep(2)  # Simulate processing time
        
        return {
            "success": True,
            "message": f"Mock outpaint mockup generation completed (variants={variants})",
            "mock": True,
            "parameters": {
                "target_px": target_px,
                "pad_ratio": pad_ratio,
                "normalize_ratio": normalize_ratio,
                "mat_pct": mat_pct,
                "variants": variants,
                "overlay_original": overlay_original,
                "overlay_inset_px": overlay_inset_px,
                "make_print_previews": make_print_previews,
                "ingest_resize": ingest_resize,
                "ingest_max_long_edge": ingest_max_long_edge,
                "return_format": return_format,
                "filename": filename
            },
            "download_url": "/mock-download-url",
            "processing_time": "2.1s"
        }
    
    # Real API call to outpaint service endpoint
    try:
        logger.info(f"🚀 Calling outpaint service with {variants} variants...")
        
        # Prepare form data for multipart upload
        form_data = aiohttp.FormData()
        
        # Convert base64 back to bytes for file upload
        if 'img_b64' in locals():
            img_bytes_final = base64.b64decode(img_b64)
        else:
            img_bytes_final = img_bytes
            
        # Add file as multipart form field
        form_data.add_field('file', io.BytesIO(img_bytes_final), 
                           filename=file.filename or 'artwork.jpg',
                           content_type='image/jpeg')
        
        # Add all other parameters as form fields
        form_data.add_field('target_px', str(target_px))
        form_data.add_field('pad_ratio', str(pad_ratio))
        form_data.add_field('normalize_ratio', normalize_ratio)
        form_data.add_field('mat_pct', str(mat_pct))
        form_data.add_field('variants', str(variants))
        form_data.add_field('overlay_original', str(overlay_original))
        form_data.add_field('overlay_inset_px', str(overlay_inset_px))
        form_data.add_field('make_print_previews', str(make_print_previews))
        form_data.add_field('ingest_resize', str(ingest_resize))
        form_data.add_field('ingest_max_long_edge', str(ingest_max_long_edge))
        form_data.add_field('return_format', return_format)
        form_data.add_field('filename', filename)
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{RENDER_API_URL}/outpaint/mockup",
                data=form_data,
                timeout=aiohttp.ClientTimeout(total=600)  # 10 minute timeout for outpainting
            ) as response:
                
                if response.status == 200:
                    result = await response.json()
                    logger.info("✅ Outpaint mockup generation completed successfully")
                    return {
                        "success": True,
                        "result": result,
                        "parameters": {
                            "target_px": target_px,
                            "pad_ratio": pad_ratio,
                            "normalize_ratio": normalize_ratio,
                            "mat_pct": mat_pct,
                            "variants": variants,
                            "overlay_original": overlay_original,
                            "overlay_inset_px": overlay_inset_px,
                            "make_print_previews": make_print_previews,
                            "ingest_resize": ingest_resize,
                            "ingest_max_long_edge": ingest_max_long_edge,
                            "return_format": return_format,
                            "filename": filename
                        }
                    }
                else:
                    error_text = await response.text()
                    logger.error(f"❌ Render API error ({response.status}): {error_text}")
                    raise HTTPException(response.status, f"Outpaint API error: {error_text}")
    
    except asyncio.TimeoutError:
        logger.error("⏰ Outpaint mockup generation timed out")
        raise HTTPException(408, "Outpaint mockup generation timed out. Please try again.")
    except Exception as e:
        logger.error(f"❌ Outpaint mockup error: {str(e)}")
        raise HTTPException(500, f"Outpaint mockup generation failed: {str(e)}")

# Helper functions for batch processing
async def batch_submit_with_prompt(prompt: str, workflow: Dict[str, Any]) -> Dict[str, Any]:
    """Submit a single job and return result with prompt"""
    try:
        job_id = await submit_job_with_retry(workflow)
        return {"success": True, "prompt": prompt, "job_id": job_id}
    except Exception as e:
        return {"success": False, "prompt": prompt, "error": str(e)}

async def batch_poll_with_prompt(prompt: str, job_id: str, timeout_sec: int) -> Dict[str, Any]:
    """Poll a single job and return result with prompt"""
    try:
        result = await poll_job_async(job_id, timeout_sec)
        return {"prompt": prompt, "job_id": job_id, "result": result}
    except Exception as e:
        return {"prompt": prompt, "job_id": job_id, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    
    # Use PORT environment variable as specified by user
    port = int(os.getenv("PORT", 8000))
    
    logger.info(f"🚀 Starting FastAPI on 0.0.0.0:{port}")
    logger.info(f"📡 RunPod endpoint: {RUN_URL if API_KEY and ENDPOINT_BASE else 'Not configured'}")
    logger.info(f"🔑 API Key present: {bool(API_KEY)}")
    logger.info(f"🎭 Mock mode: {MOCK_MODE}")
    logger.info(f"🔧 Outpaint mockup endpoint available at /outpaint/mockup")
    
    # Use the exact uvicorn configuration specified by user
    # uvicorn app:app --host 0.0.0.0 --port $PORT --workers 1 --no-access-log
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=port, 
        workers=1,
        access_log=False,  # --no-access-log
        log_level="info"
    )
