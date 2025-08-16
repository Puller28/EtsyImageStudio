"""
Local Mockup API Integration
Integrated OpenAI-based mockup generation for EtsyArt Pro
"""

import io
import os
import base64
import zipfile
from math import ceil
from typing import Dict, Tuple, List, Any

import requests
from fastapi import HTTPException
from PIL import Image, ImageOps, ImageFile

# Allow loading of truncated images
ImageFile.LOAD_TRUNCATED_IMAGES = True

# Configuration
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

def _img_to_png_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return buf.getvalue()

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

def generate_single_mockup(img_bytes: bytes, style: str) -> Dict[str, Any]:
    """Generate a single mockup for one style using integrated OpenAI API"""
    try:
        # Validate style
        if style not in STYLE_PROMPTS:
            raise HTTPException(400, f"Unknown style '{style}'. Choose from {list(STYLE_PROMPTS.keys())}")
        
        # Process image with simple resize
        art = _ingest_simple_resize(img_bytes, True, DEFAULT_INGEST_LONG_EDGE)
        
        # Build canvas + mask (one geometry)
        canvas, keep_bbox = _pad_canvas_keep_center(art, pad_ratio=0.42, target_side=DEFAULT_TARGET_PX)
        mask = _build_outpaint_mask(canvas.size, keep_bbox)
        
        # API-safe size
        api_w, api_h, api_size_str = _api_edit_size_for(canvas.size)
        canvas_api = canvas.resize((api_w, api_h), Image.Resampling.LANCZOS)
        mask_api = mask.resize((api_w, api_h), Image.Resampling.NEAREST)
        
        prompt = f"{PRESERVE_DIRECTIVE} {STYLE_PROMPTS[style]}"
        
        # Call OpenAI API for single style
        b64_list = _openai_images_edit_multi(
            _img_to_png_bytes(canvas_api), 
            _img_to_png_bytes(mask_api),
            prompt=prompt, 
            n=1, 
            size_str=api_size_str
        )
        
        # Process result - resize back to original canvas size
        b64 = b64_list[0]
        img = Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGBA")
        if img.size != canvas.size:
            img = img.resize(canvas.size, Image.Resampling.LANCZOS)
        
        # Save processed image as JPEG for smaller file size
        buf = io.BytesIO()
        # Convert RGBA to RGB for JPEG
        if img.mode == "RGBA":
            rgb_img = Image.new("RGB", img.size, (255, 255, 255))
            rgb_img.paste(img, mask=img.split()[-1])  # Use alpha channel as mask
            img = rgb_img
        img.save(buf, "JPEG", quality=85, optimize=True)
        final_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        
        return {
            "style": style,
            "api_size": api_size_str,
            "image_b64": final_b64,
            "canvas_size": [canvas.width, canvas.height],
            "art_bbox": keep_bbox,
            "local_generation": True,
            "openai_model": OPENAI_MODEL
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Single mockup generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Single mockup generation failed: {str(e)}")

def generate_local_mockups(img_bytes: bytes, mode: str, template: str) -> Dict[str, Any]:
    """Generate mockups using integrated OpenAI API"""
    try:
        # Determine style list based on mode
        if mode == "single_template":
            style_list = [template]
        else:
            style_list = DEFAULT_STYLE_LIST
        
        # Validate styles
        invalid = [s for s in style_list if s not in STYLE_PROMPTS]
        if invalid:
            raise HTTPException(400, f"Unknown styles {invalid}. Choose from {list(STYLE_PROMPTS.keys())}")
        
        # Process image with simple resize
        art = _ingest_simple_resize(img_bytes, True, DEFAULT_INGEST_LONG_EDGE)
        
        # Build canvas + mask (one geometry)
        canvas, keep_bbox = _pad_canvas_keep_center(art, pad_ratio=0.42, target_side=DEFAULT_TARGET_PX)
        mask = _build_outpaint_mask(canvas.size, keep_bbox)
        
        # API-safe size
        api_w, api_h, api_size_str = _api_edit_size_for(canvas.size)
        canvas_api = canvas.resize((api_w, api_h), Image.Resampling.LANCZOS)
        mask_api = mask.resize((api_w, api_h), Image.Resampling.NEAREST)
        
        n_per_style = 1  # Generate 1 variant per style
        results: List[Dict[str, Any]] = []
        
        for style in style_list:
            prompt = f"{PRESERVE_DIRECTIVE} {STYLE_PROMPTS[style]}"
            
            # Call OpenAI API
            b64_list = _openai_images_edit_multi(
                _img_to_png_bytes(canvas_api), 
                _img_to_png_bytes(mask_api),
                prompt=prompt, 
                n=n_per_style, 
                size_str=api_size_str
            )
            
            # Process results - resize back to original canvas size
            fixed_b64_list: List[str] = []
            for b64 in b64_list:
                img = Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGBA")
                if img.size != canvas.size:
                    img = img.resize(canvas.size, Image.Resampling.LANCZOS)
                
                # Save processed image as JPEG for smaller file size
                buf = io.BytesIO()
                # Convert RGBA to RGB for JPEG
                if img.mode == "RGBA":
                    rgb_img = Image.new("RGB", img.size, (255, 255, 255))
                    rgb_img.paste(img, mask=img.split()[-1])  # Use alpha channel as mask
                    img = rgb_img
                img.save(buf, "JPEG", quality=85, optimize=True)
                fixed_b64_list.append(base64.b64encode(buf.getvalue()).decode("utf-8"))
            
            results.append({
                "style": style,
                "api_size": api_size_str,
                "image_b64": fixed_b64_list[0],
                "variants": fixed_b64_list,
            })
        
        return {
            "styles_requested": style_list,
            "variants_per_style": n_per_style,
            "canvas_size": [canvas.width, canvas.height],
            "art_bbox": keep_bbox,
            "api_size": api_size_str,
            "results": results,
            "local_generation": True,
            "openai_model": OPENAI_MODEL
        }
        
    except Exception as e:
        raise HTTPException(500, f"Mockup generation failed: {str(e)}")