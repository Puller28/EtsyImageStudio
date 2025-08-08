import os, io, base64, time
from typing import Dict, Any, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import requests
from PIL import Image
from concurrent.futures import ThreadPoolExecutor, as_completed

load_dotenv()

API_KEY = os.getenv("RUNPOD_API_KEY")
ENDPOINT_BASE = os.getenv("RUNPOD_ENDPOINT_BASE")  # e.g. https://api.runpod.ai/v2/<endpoint_id>
RUN_URL = f"{ENDPOINT_BASE}/run"
STATUS_URL = f"{ENDPOINT_BASE}/status"

if not API_KEY or not ENDPOINT_BASE:
    raise RuntimeError("Missing RUNPOD_API_KEY or RUNPOD_ENDPOINT_BASE in .env")

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

    x_lat = px_to_latent(pos_x_px)
    y_lat = px_to_latent(pos_y_px)

    return {
        "workflow": {
            "0": {  # Load artwork (base64)
                "class_type": "LoadImage",
                "inputs": { "image": art_b64, "upload": True }
            },
            "1": {  # Scale to frame size
                "class_type": "ImageScale",
                "inputs": { "image": ["0", 0], "width": art_w, "height": art_h, "upscale_method": "lanczos" }
            },
            "2": {  # Load VAE
                "class_type": "VAELoader",
                "inputs": { "vae_name": "ae.safetensors" }
            },
            "3": {  # Encode art to latent
                "class_type": "VAEEncode",
                "inputs": { "pixels": ["1", 0], "vae": ["2", 0] }
            },
            "4": {  # Load CLIP model
                "class_type": "CheckpointLoaderSimple", 
                "inputs": { "ckpt_name": "flux1-dev-fp8.safetensors" }
            },
            "5": { "class_type": "CLIPTextEncode", "inputs": { "text": prompt, "clip": ["4", 1] } },
            "6": { "class_type": "CLIPTextEncode", "inputs": { "text": neg_prompt, "clip": ["4", 1] } },
            "7": {  # Empty background latent
                "class_type": "EmptyLatentImage",
                "inputs": { "width": canvas_w, "height": canvas_h, "batch_size": 1 }
            },
            "8": {  # Generate room background
                "class_type": "KSampler",
                "inputs": {
                    "model": ["4", 0],
                    "latent_image": ["7", 0],
                    "positive": ["5", 0],
                    "negative": ["6", 0],
                    "steps": steps, "cfg": cfg, "denoise": 1.0,
                    "sampler_name": "euler", "scheduler": "normal", "seed": seed
                }
            },
            "9": {  # Composite: place art latent onto background latent
                "class_type": "LatentComposite",
                "inputs": {
                    "samples_to": ["8", 0],
                    "samples_from": ["3", 0],
                    "x": x_lat, "y": y_lat, "feather": 0, "tiled": False
                }
            },
            "10": { "class_type": "VAEDecode", "inputs": { "samples": ["9", 0], "vae": ["2", 0] } },
            "11": { "class_type": "SaveImage", "inputs": { "images": ["10", 0], "filename_prefix": "mockup_out" } }
        }
    }

def submit_job(payload: Dict[str, Any]) -> str:
    headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
    try:
        print(f"🔗 Submitting to RunPod: {RUN_URL}")
        r = requests.post(RUN_URL, headers=headers, json={"input": payload}, timeout=60)
        print(f"📡 RunPod response status: {r.status_code}")
        
        if r.status_code == 502:
            raise HTTPException(503, "RunPod serverless endpoint is currently unavailable (502 Bad Gateway). This is a temporary infrastructure issue. Please try again in a few minutes.")
        
        if r.status_code >= 400:
            error_text = r.text[:500] if r.text else "Unknown error"
            print(f"❌ RunPod error: {error_text}")
            raise HTTPException(r.status_code, f"RunPod request failed: {r.status_code} {r.reason} - {error_text}")
            
        data = r.json()
        job_id = data.get("id")
        if not job_id:
            raise HTTPException(500, f"RunPod did not return a job id: {data}")
        return job_id
    except requests.exceptions.RequestException as e:
        print(f"🔥 Connection error: {str(e)}")
        raise HTTPException(503, f"Failed to connect to RunPod endpoint: {str(e)}")

def poll_job(job_id: str, timeout_sec: int = 90) -> Dict[str, Any]:
    headers = {"Authorization": f"Bearer {API_KEY}"}
    deadline = time.time() + timeout_sec
    last = None
    while time.time() < deadline:
        sr = requests.get(f"{STATUS_URL}/{job_id}", headers=headers, timeout=30)
        if sr.status_code == 404:
            time.sleep(2)
            continue
        last = sr.json()
        status = last.get("status")
        if status == "COMPLETED":
            return last
        if status == "FAILED":
            return last
        time.sleep(2)
    return {"status": "TIMEOUT", "last": last or {}}

# ---------- endpoints ----------

@app.get("/healthz")
def health():
    # Test RunPod endpoint availability
    try:
        headers = {"Authorization": f"Bearer {API_KEY}"}
        test_response = requests.get(f"{RUNPOD_ENDPOINT_BASE}/health", headers=headers, timeout=10)
        runpod_status = "available" if test_response.status_code < 400 else f"error_{test_response.status_code}"
    except Exception as e:
        runpod_status = f"unreachable_{str(e)[:50]}"
    
    return {
        "ok": True, 
        "runpod_endpoint": runpod_status,
        "endpoint_url": RUN_URL
    }

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
    try:
        Image.open(io.BytesIO(img_bytes)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Invalid image upload")

    art_b64 = to_b64(img_bytes)
    workflow = build_workflow_dict(
        prompt=prompt, neg_prompt=negative,
        canvas_w=canvas_w, canvas_h=canvas_h,
        art_b64=art_b64, art_w=art_w, art_h=art_h,
        pos_x_px=pos_x, pos_y_px=pos_y,
        steps=steps, cfg=cfg, seed=seed
    )

    try:
        print(f"🔧 Submitting workflow with {len(workflow['workflow'])} nodes")
        job_id = submit_job(workflow)
        print(f"✅ Job submitted successfully: {job_id}")
        result = poll_job(job_id, timeout_sec=poll_seconds)
        return {"job_id": job_id, "result": result}
    except Exception as e:
        print(f"❌ Error in generate endpoint: {str(e)}")
        print(f"🔍 Workflow structure: {list(workflow['workflow'].keys())}")
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

    # submit & poll (light concurrency)
    results = []
    with ThreadPoolExecutor(max_workers=min(3, len(payloads))) as pool:
        future_map = { pool.submit(lambda p_w: (p_w[0], submit_job(p_w[1])), pw): pw for pw in payloads }
        job_ids: List[Dict[str, str]] = []
        for fut in as_completed(future_map):
            prompt = future_map[fut][0]
            try:
                job_id = fut.result()[1]
                job_ids.append({"prompt": prompt, "job_id": job_id})
            except Exception as e:
                results.append({"prompt": prompt, "error": f"submit_failed: {e}"})

    # poll each job (sequentially to be gentle on API)
    for j in job_ids:
        res = poll_job(j["job_id"], timeout_sec=poll_seconds)
        results.append({"prompt": j["prompt"], "job_id": j["job_id"], "result": res})

    return {"count": len(results), "items": results}

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting FastAPI on port 8001...")
    print(f"📡 RunPod endpoint: {RUN_URL}")
    print(f"🔑 API Key present: {bool(API_KEY)}")
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
