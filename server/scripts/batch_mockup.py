#!/usr/bin/env python3
"""
Batch Mockup Generator - Process multiple templates in a single Python call
This is 5-10x faster than spawning separate processes for each template
"""
import sys
import json
import base64
import io
import math
import os
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import numpy as np
import cv2
from PIL import Image, ImageOps


def _load_manifest(room, template_id):
    """Load template manifest and validate paths"""
    # Use TEMPLATES_PATH environment variable if set (for production with dist/templates)
    templates_path = os.environ.get('TEMPLATES_PATH', './templates')
    template_root = Path(templates_path)
    room_dir = template_root / room
    if not room_dir.exists():
        raise Exception(f"Room folder not found: {room_dir}")
    tdir = room_dir / template_id
    if not tdir.exists():
        raise Exception(f"Template '{template_id}' not found under {room_dir}")
    
    mpath = tdir / "manifest.json"
    if not mpath.exists():
        raise Exception(f"manifest.json missing in {tdir}")
    
    try:
        manifest = json.loads(mpath.read_text())
    except Exception as e:
        raise Exception(f"manifest.json not valid JSON: {e}")
    
    bg_name = manifest.get("background")
    if not bg_name:
        raise Exception("manifest.json missing 'background'")
    bg_path = tdir / bg_name
    if not bg_path.exists():
        raise Exception(f"Background not found: {bg_path}")
    
    corners = manifest.get("corners")
    if not (isinstance(corners, list) and len(corners) == 4):
        raise Exception("manifest.json 'corners' must be 4 points [TL,TR,BR,BL]")
    
    return manifest, bg_path


def _fit_size(src_w, src_h, dst_w, dst_h, mode):
    """Calculate fitted dimensions based on mode (cover/contain)"""
    r_src = src_w / src_h
    r_dst = dst_w / dst_h
    if mode == "cover":
        if r_src < r_dst:
            w = dst_w
            h = int(round(w / r_src))
        else:
            h = dst_h
            w = int(round(h * r_src))
    else:
        if r_src > r_dst:
            w = dst_w
            h = int(round(w / r_src))
        else:
            h = dst_h
            w = int(round(h * r_src))
    return w, h


def _pil_to_np(img):
    """Convert PIL image to numpy array (BGRA)"""
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    arr = np.array(img)
    bgr = cv2.cvtColor(arr, cv2.COLOR_RGBA2BGRA)
    return bgr


def _np_to_pil(arr):
    """Convert numpy array (BGRA) to PIL image"""
    rgba = cv2.cvtColor(arr, cv2.COLOR_BGRA2RGBA)
    return Image.fromarray(rgba)


def _polygon_mask(shape_hw, polygon, feather_px):
    """Create polygon mask with optional feathering"""
    h, w = shape_hw
    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.fillConvexPoly(mask, polygon.astype(np.int32), 255)
    if feather_px and feather_px > 0:
        k = max(1, int(round(feather_px)) | 1)
        mask = cv2.GaussianBlur(mask, (k, k), 0)
    return mask


def _blend(bg_bgra, fg_bgra, mask, mode, opacity):
    """Blend foreground onto background with mask and opacity"""
    opacity = max(0.0, min(1.0, float(opacity)))
    a = (mask.astype(np.float32) / 255.0) * opacity
    a3 = np.dstack([a, a, a, a])
    
    if mode == "multiply":
        bg_rgb = bg_bgra[..., :3].astype(np.float32) / 255.0
        fg_rgb = fg_bgra[..., :3].astype(np.float32) / 255.0
        mul_rgb = bg_rgb * fg_rgb
        out_rgb = mul_rgb * a[..., None] + bg_rgb * (1.0 - a[..., None])
        out_a = np.clip(bg_bgra[..., 3].astype(np.float32)/255.0 + a - bg_bgra[..., 3].astype(np.float32)/255.0 * a, 0, 1)
        out = np.dstack([np.clip(out_rgb*255,0,255).astype(np.uint8), (out_a*255).astype(np.uint8)])
        return out
    
    fg = fg_bgra.astype(np.float32)
    bg = bg_bgra.astype(np.float32)
    out = (fg * a3 + bg * (1.0 - a3)).astype(np.uint8)
    return out


def process_single_template(artwork_path, template):
    """Process one template and return result"""
    try:
        room = template['room']
        template_id = template['id']
        name = template.get('name', f"{room}_{template_id}")
        
        # Load manifest and background
        manifest, bg_path = _load_manifest(room, template_id)
        
        with Image.open(bg_path) as P:
            bg = P.convert("RGBA")
        
        bg_w, bg_h = bg.size
        corners = manifest["corners"]
        TL, TR, BR, BL = [tuple(map(float, p)) for p in corners]
        
        # Load and prepare artwork
        with Image.open(artwork_path) as art_img:
            art = art_img.convert("RGBA")
            art = ImageOps.exif_transpose(art)
        
        dst_w = math.dist(TL, TR)
        dst_h = math.dist(TL, BL)
        
        mx = 0  # margin_px = 0
        dst_quad = np.array([TL, TR, BR, BL], dtype=np.float32)
        
        # Fit artwork to destination
        aw, ah = art.size
        sw, sh = _fit_size(aw, ah, int(round(dst_w))-2*mx, int(round(dst_h))-2*mx, "cover")
        
        art_resized = art.resize((max(1,sw), max(1,sh)), Image.LANCZOS)
        
        # Create canvas and center artwork
        canvas_w = int(round(dst_w))
        canvas_h = int(round(dst_h))
        art_canvas = Image.new("RGBA", (canvas_w, canvas_h), (0,0,0,0))
        ox = (canvas_w - sw)//2
        oy = (canvas_h - sh)//2
        ox = max(0, ox + (mx if sw <= canvas_w-2*mx else 0))
        oy = max(0, oy + (mx if sh <= canvas_h-2*mx else 0))
        art_canvas.paste(art_resized, (ox, oy), art_resized)
        
        # Apply perspective transform
        src_quad = np.array([[0,0],[canvas_w,0],[canvas_w,canvas_h],[0,canvas_h]], dtype=np.float32)
        H, ok = cv2.findHomography(src_quad, dst_quad, method=0)
        
        bg_bgra = _pil_to_np(bg)
        art_bgra = _pil_to_np(art_canvas)
        warped = cv2.warpPerspective(art_bgra, H, (bg_w, bg_h), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_TRANSPARENT)
        
        # Apply mask and blend
        feather_px = manifest.get("feather_px", 0)
        quad_mask = _polygon_mask((bg_h, bg_w), dst_quad, feather_px)
        opacity_val = manifest.get("blend", {}).get("opacity", 1.0)
        blend_mode = manifest.get("blend", {}).get("mode", "normal").lower()
        
        composed = _blend(bg_bgra, warped, quad_mask, blend_mode, opacity_val)
        out_img = _np_to_pil(composed)
        
        # Convert to base64
        buf = io.BytesIO()
        out_img.save(buf, "PNG")
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        
        return {
            'success': True,
            'template': {'room': room, 'id': template_id, 'name': name},
            'image_data': b64
        }
        
    except Exception as e:
        return {
            'success': False,
            'template': template,
            'error': str(e)
        }


def main():
    """Main entry point - process all templates in parallel"""
    if len(sys.argv) < 3:
        print(json.dumps({'error': 'Usage: batch_mockup.py <artwork_path> <templates_json>'}), file=sys.stderr)
        sys.exit(1)
    
    artwork_path = sys.argv[1]
    templates = json.loads(sys.argv[2])
    
    # Process templates in parallel (2 workers to avoid memory issues on Render)
    results = []
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = {
            executor.submit(process_single_template, artwork_path, t): t 
            for t in templates
        }
        
        for future in as_completed(futures):
            results.append(future.result())
    
    # Output results as JSON
    print(json.dumps({'mockups': results}))


if __name__ == '__main__':
    main()
