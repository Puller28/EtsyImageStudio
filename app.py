import os, io, base64, time, asyncio, logging
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import requests
from PIL import Image, ImageDraw
from concurrent.futures import ThreadPoolExecutor, as_completed

load_dotenv()

# Environment configuration - no network calls at import time
API_KEY = os.getenv("RUNPOD_API_KEY")
ENDPOINT_BASE = os.getenv("RUNPOD_ENDPOINT_BASE")
MOCK_MODE = os.getenv("MOCK_MODE", "false").lower() == "true"

# Build URLs only if endpoint is configured
# ENDPOINT_BASE should be the full endpoint URL without /run or /status suffixes
RUN_URL = f"{ENDPOINT_BASE}/run" if ENDPOINT_BASE else None
STATUS_URL = f"{ENDPOINT_BASE}/status" if ENDPOINT_BASE else None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"], allow_credentials=True
)

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
) -> Dict[str, Any]:

    # Convert pixels to latent coordinates (pixels / 8)
    pos_x_lat = round(pos_x_px / 8)
    pos_y_lat = round(pos_y_px / 8)

    # Your exact workflow JSON with placeholders replaced
    return {
        "workflow": {
            "100": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {
                    "ckpt_name": "flux1-dev-fp8.safetensors"
                }
            },
            "0": {
                "class_type": "LoadImage",
                "inputs": {
                    "image": art_b64,
                    "upload": True
                }
            },
            "1": {
                "class_type": "ImageScale",
                "inputs": {
                    "image": ["0", 0],
                    "width": art_w,
                    "height": art_h,
                    "upscale_method": "lanczos"
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
                    "feather": 1,
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
            if r.status_code in [502, 503, 504]:
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
        status["runpod_status"] = ("mock_mode" if MOCK_MODE else "not_configured")
    
    return status

@app.post("/generate")
async def generate(
    file: UploadFile = File(...),
    prompt: str = Form("Framed print of a coffee shop hanging on a bedroom wall with soft natural light and elegant decor"),
    negative: str = Form("blurry, low detail, distorted, bad framing, artifacts"),
    canvas_w: int = Form(1024),
    canvas_h: int = Form(1024),
    art_w: int = Form(512),
    art_h: int = Form(512),
    pos_x: int = Form(256),
    pos_y: int = Form(256),
    steps: int = Form(20),
    cfg: float = Form(6.5),
    seed: int = Form(1234567),
    poll_seconds: int = Form(60),
):
    img_bytes = await file.read()
    logger.info(f"📋 Received file: {file.filename}, size: {len(img_bytes)} bytes, content_type: {file.content_type}")
    
    try:
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        logger.info(f"✅ Image validated: {img.size}, mode: {img.mode}")
    except Exception as e:
        logger.error(f"❌ Image validation failed: {str(e)}")
        logger.error(f"📋 File details - filename: {file.filename}, content_type: {file.content_type}, size: {len(img_bytes)}")
        raise HTTPException(400, f"Invalid image upload: {str(e)}")

    art_b64 = to_b64(img_bytes)
    workflow = build_workflow_dict(
        prompt=prompt, neg_prompt=negative,
        canvas_w=canvas_w, canvas_h=canvas_h,
        art_b64=art_b64, art_w=art_w, art_h=art_h,
        pos_x_px=pos_x, pos_y_px=pos_y,
        steps=steps, cfg=cfg, seed=seed
    )

    try:
        logger.info(f"🔧 Submitting your exact workflow with {len(workflow['workflow'])} nodes")
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
