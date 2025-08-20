# app.py — Local-template mockup API (Photopea/Photoshop corner method)
# Endpoints:
#   GET  /healthz
#   GET  /templates/list
#   GET  /templates/tree
#   POST /mockup/apply

import io, os, json, math, hashlib, base64
from pathlib import Path
from typing import List, Tuple

import numpy as np
import cv2  # requires opencv-python-headless
from PIL import Image, ImageFilter, ImageOps

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware

# ----------------------------
# Template root resolution
# ----------------------------
def _resolve_template_root() -> Path:
    env_root = os.getenv("TEMPLATE_ROOT_DIR")
    if env_root:
        p = Path(env_root)
        if p.exists():
            return p
    # Render Disk (optional)
    p_disk = Path("/data/templates")
    if p_disk.exists():
        return p_disk
    # bundled with app
    return Path(__file__).parent / "templates"

TEMPLATE_ROOT = _resolve_template_root()

# ----------------------------
# FastAPI
# ----------------------------
app = FastAPI(title="Mockup API (local templates)", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"], allow_credentials=True
)

# ----------------------------
# Helpers
# ----------------------------
def _file_sha1(p: Path, nbytes=32768) -> str:
    try:
        h = hashlib.sha1()
        with p.open("rb") as f:
            while True:
                chunk = f.read(nbytes)
                if not chunk:
                    break
                h.update(chunk)
        return h.hexdigest()[:12]
    except Exception:
        return "unreadable"

def _pil_to_np(img: Image.Image) -> np.ndarray:
    """PIL RGBA -> numpy BGRA (for OpenCV)."""
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    arr = np.array(img)  # RGBA
    bgr = cv2.cvtColor(arr, cv2.COLOR_RGBA2BGRA)  # RGBA->BGRA
    return bgr

def _np_to_pil(arr: np.ndarray) -> Image.Image:
    """numpy BGRA -> PIL RGBA."""
    rgba = cv2.cvtColor(arr, cv2.COLOR_BGRA2RGBA)
    return Image.fromarray(rgba)

def _load_manifest(room: str, template_id: str) -> Tuple[dict, Path]:
    room_dir = TEMPLATE_ROOT / room
    if not room_dir.exists():
        raise HTTPException(400, f"Room folder not found: {room_dir}")
    tdir = room_dir / template_id
    if not tdir.exists():
        raise HTTPException(400, f"Template '{template_id}' not found under {room_dir}")

    mpath = tdir / "manifest.json"
    if not mpath.exists():
        raise HTTPException(400, f"manifest.json missing in {tdir}")
    try:
        manifest = json.loads(mpath.read_text())
    except Exception as e:
        raise HTTPException(400, f"manifest.json not valid JSON: {e}")

    bg_name = manifest.get("background")
    if not bg_name:
        raise HTTPException(400, "manifest.json missing 'background'")
    bg_path = tdir / bg_name
    if not bg_path.exists():
        raise HTTPException(400, f"Background not found: {bg_path}")

    corners = manifest.get("corners")
    if not (isinstance(corners, list) and len(corners) == 4):
        raise HTTPException(400, "manifest.json 'corners' must be 4 points [TL,TR,BR,BL]")

    return manifest, bg_path

def _fit_size(src_w: int, src_h: int, dst_w: int, dst_h: int, mode: str) -> Tuple[int,int]:
    """Return fitted width/height for contain/cover."""
    r_src = src_w / src_h
    r_dst = dst_w / dst_h
    if mode == "cover":
        if r_src < r_dst:  # too tall, scale by width
            w = dst_w; h = int(round(w / r_src))
        else:
            h = dst_h; w = int(round(h * r_src))
    else:  # contain
        if r_src > r_dst:  # too wide, scale by width
            w = dst_w; h = int(round(w / r_src))
        else:
            h = dst_h; w = int(round(h * r_src))
    return w, h

def _polygon_mask(shape_hw: Tuple[int,int], polygon: np.ndarray, feather_px: float) -> np.ndarray:
    """Return single-channel (0..255) mask with optional feather (Gaussian)."""
    h, w = shape_hw
    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.fillConvexPoly(mask, polygon.astype(np.int32), 255)
    if feather_px and feather_px > 0:
        # kernel must be odd & positive
        k = max(1, int(round(feather_px)) | 1)
        mask = cv2.GaussianBlur(mask, (k, k), 0)
    return mask

def _blend(bg_bgra: np.ndarray, fg_bgra: np.ndarray, mask: np.ndarray, mode: str, opacity: float) -> np.ndarray:
    """Blend fg into bg using mask and blend mode (normal|multiply)."""
    opacity = max(0.0, min(1.0, float(opacity)))
    # Normalize mask to 0..1
    a = (mask.astype(np.float32) / 255.0) * opacity
    a3 = np.dstack([a, a, a, a])

    if mode == "multiply":
        # Porter-Duff over with multiply on RGB
        bg_rgb = bg_bgra[..., :3].astype(np.float32) / 255.0
        fg_rgb = fg_bgra[..., :3].astype(np.float32) / 255.0
        mul_rgb = bg_rgb * fg_rgb
        out_rgb = mul_rgb * a[..., None] + bg_rgb * (1.0 - a[..., None])
        out_a = np.clip(bg_bgra[..., 3].astype(np.float32)/255.0 + a - bg_bgra[..., 3].astype(np.float32)/255.0 * a, 0, 1)
        out = np.dstack([np.clip(out_rgb*255,0,255).astype(np.uint8), (out_a*255).astype(np.uint8)])
        return out

    # normal
    fg = fg_bgra.astype(np.float32)
    bg = bg_bgra.astype(np.float32)
    out = (fg * a3 + bg * (1.0 - a3)).astype(np.uint8)
    return out

# ----------------------------
# Diagnostics
# ----------------------------
@app.get("/healthz")
def healthz():
    return {
        "ok": True,
        "template_root": str(TEMPLATE_ROOT.resolve()),
        "hint": "Use /templates/list or /templates/tree to verify files on Render"
    }

@app.get("/templates/list")
def templates_list():
    root = TEMPLATE_ROOT
    out = {"template_root": str(root.resolve()), "exists": root.exists(), "rooms": {}}
    if not root.exists():
        return out
    for room_dir in sorted([d for d in root.iterdir() if d.is_dir()]):
        items = []
        for tdir in sorted([d for d in room_dir.iterdir() if d.is_dir()]):
            manifest = tdir / "manifest.json"
            bg = None
            for cand in tdir.iterdir():
                if cand.is_file() and cand.suffix.lower() in (".png",".jpg",".jpeg",".webp"):
                    if "bg" in cand.stem.lower():
                        bg = cand; break
            items.append({
                "id": tdir.name,
                "manifest_present": manifest.exists(),
                "bg_present": bool(bg),
                "bg": bg.name if bg else None
            })
        out["rooms"][room_dir.name] = items
    return out

@app.get("/templates/tree", response_class=Response)
def templates_tree():
    root = TEMPLATE_ROOT
    lines = [f"Template root: {root.resolve()}"]
    if not root.exists():
        lines.append("!! root does not exist")
        return Response("\n".join(lines), media_type="text/plain")
    for room_dir in sorted([d for d in root.iterdir() if d.is_dir()]):
        lines.append(f"[room] {room_dir.name}/")
        for tdir in sorted([d for d in room_dir.iterdir() if d.is_dir()]):
            lines.append(f"  └─ {tdir.name}/")
            for f in sorted(tdir.iterdir()):
                if f.is_file():
                    size = f.stat().st_size
                    sha = _file_sha1(f)
                    lines.append(f"      • {f.name} ({size}B) sha1:{sha}")
    return Response("\n".join(lines), media_type="text/plain")

# ----------------------------
# Main: /mockup/apply
# ----------------------------
@app.post("/mockup/apply")
async def mockup_apply(
    file: UploadFile = File(..., description="Artwork image (PNG/JPG)"),
    room: str = Form(..., description="Room folder under templates/, e.g. 'living_room'"),
    template_id: str = Form(..., description="Template subfolder under the room, e.g. 'living_01'"),
    fit: str = Form("contain", description="'contain' or 'cover'"),
    margin_px: int = Form(0, description="Inset artwork within the frame"),
    feather_px: float = Form(-1.0, description="-1 uses manifest feather"),
    opacity: float = Form(-1.0, description="-1 uses manifest opacity (blend.opacity)"),
    return_format: str = Form("png", description="'png' or 'json' (base64)"),
):
    # Load template + background + manifest
    manifest, bg_path = _load_manifest(room, template_id)
    try:
        with Image.open(bg_path) as P:
            bg = P.convert("RGBA")
    except Exception as e:
        raise HTTPException(400, f"Failed to open background: {e}")

    bg_w, bg_h = bg.size
    # Validate manifest dimensions (must match background)
    man_w = int(manifest.get("width", bg_w))
    man_h = int(manifest.get("height", bg_h))
    if (man_w, man_h) != (bg_w, bg_h):
        # Not fatal—warn but continue
        pass

    # Parse corners TL,TR,BR,BL
    corners: List[List[float]] = manifest["corners"]
    if len(corners) != 4:
        raise HTTPException(400, "corners must have 4 points")
    TL, TR, BR, BL = [tuple(map(float, p)) for p in corners]

    # Read uploaded art
    raw = await file.read()
    try:
        art = Image.open(io.BytesIO(raw)).convert("RGBA")
        art = ImageOps.exif_transpose(art)
    except Exception as e:
        raise HTTPException(400, f"Could not read artwork: {e}")

    # Destination rect inside corners
    # Distance top edge:
    dst_w = math.dist(TL, TR)
    # Distance left edge:
    dst_h = math.dist(TL, BL)

    # apply margin (shrink destination)
    mx = max(0, int(margin_px))
    # Build destination quad as float np array
    dst_quad = np.array([TL, TR, BR, BL], dtype=np.float32)

    # Compute fitted source rectangle size
    aw, ah = art.size
    sw, sh = _fit_size(aw, ah, int(round(dst_w))-2*mx, int(round(dst_h))-2*mx, fit.lower())

    # Resize source
    art_resized = art.resize((max(1,sw), max(1,sh)), Image.Resampling.LANCZOS)

    # Paste resized art into a transparent canvas the size of dst_w x dst_h
    canvas_w = int(round(dst_w)); canvas_h = int(round(dst_h))
    if canvas_w < 2 or canvas_h < 2:
        raise HTTPException(400, "Destination frame too small from corners")
    art_canvas = Image.new("RGBA", (canvas_w, canvas_h), (0,0,0,0))
    ox = (canvas_w - sw)//2
    oy = (canvas_h - sh)//2
    ox = max(0, ox + (mx if sw <= canvas_w-2*mx else 0))
    oy = max(0, oy + (mx if sh <= canvas_h-2*mx else 0))
    art_canvas.paste(art_resized, (ox, oy), art_resized)

    # OpenCV homography: map art_canvas (0,0)-(w,h) to destination quad
    src_quad = np.array([[0,0],[canvas_w,0],[canvas_w,canvas_h],[0,canvas_h]], dtype=np.float32)
    H, ok = cv2.findHomography(src_quad, dst_quad, method=0)
    if H is None:
        raise HTTPException(500, "Failed to compute homography from points")

    # Warp the art onto the background
    bg_bgra = _pil_to_np(bg)                       # BGRA
    art_bgra = _pil_to_np(art_canvas)
    warped = cv2.warpPerspective(art_bgra, H, (bg_w, bg_h), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_TRANSPARENT)

    # Build feather mask for the quad
    quad_mask = _polygon_mask((bg_h, bg_w), dst_quad, feather_px if feather_px>=0 else float(manifest.get("feather_px", 0)))
    opacity_val = (opacity if opacity>=0 else float(manifest.get("blend",{}).get("opacity",1.0)))
    blend_mode = (manifest.get("blend",{}).get("mode","normal")).lower()

    composed = _blend(bg_bgra, warped, quad_mask, blend_mode, opacity_val)
    out_img = _np_to_pil(composed)

    if return_format.lower() == "json":
        buf = io.BytesIO(); out_img.save(buf, "PNG")
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        return JSONResponse({"image_b64": b64, "w": bg_w, "h": bg_h})

    buf = io.BytesIO(); out_img.save(buf, "PNG")
    headers = {"Content-Disposition": 'inline; filename="mockup.png"'}
    return Response(content=buf.getvalue(), media_type="image/png", headers=headers)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)