// Direct port of your template API logic to Node.js using opencv4nodejs
import cv from 'opencv4nodejs';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MockupProcessor {
  constructor(templateRoot = './templates') {
    this.templateRoot = templateRoot;
  }

  async loadManifest(room, templateId) {
    const roomDir = path.join(this.templateRoot, room);
    if (!fs.existsSync(roomDir)) {
      throw new Error(`Room folder not found: ${roomDir}`);
    }
    
    const tdir = path.join(roomDir, templateId);
    if (!fs.existsSync(tdir)) {
      throw new Error(`Template '${templateId}' not found under ${roomDir}`);
    }

    const manifestPath = path.join(tdir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`manifest.json missing in ${tdir}`);
    }

    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) {
      throw new Error(`manifest.json not valid JSON: ${e.message}`);
    }

    const bgName = manifest.background;
    if (!bgName) {
      throw new Error("manifest.json missing 'background'");
    }
    
    const bgPath = path.join(tdir, bgName);
    if (!fs.existsSync(bgPath)) {
      throw new Error(`Background not found: ${bgPath}`);
    }

    const corners = manifest.corners;
    if (!Array.isArray(corners) || corners.length !== 4) {
      throw new Error("manifest.json 'corners' must be 4 points [TL,TR,BR,BL]");
    }

    return { manifest, bgPath };
  }

  fitSize(srcW, srcH, dstW, dstH, mode) {
    const rSrc = srcW / srcH;
    const rDst = dstW / dstH;
    
    if (mode === 'cover') {
      if (rSrc < rDst) { // too tall, scale by width
        const w = dstW;
        const h = Math.round(w / rSrc);
        return [w, h];
      } else {
        const h = dstH;
        const w = Math.round(h * rSrc);
        return [w, h];
      }
    } else { // contain
      if (rSrc > rDst) { // too wide, scale by width
        const w = dstW;
        const h = Math.round(w / rSrc);
        return [w, h];
      } else {
        const h = dstH;
        const w = Math.round(h * rSrc);
        return [w, h];
      }
    }
  }

  polygonMask(shapeHW, polygon, featherPx) {
    const [h, w] = shapeHW;
    const mask = new cv.Mat(h, w, cv.CV_8UC1, 0);
    
    // Convert polygon to the right format for OpenCV
    const points = polygon.map(p => new cv.Point(Math.round(p[0]), Math.round(p[1])));
    const contour = new cv.Contour(points);
    
    mask.fillPoly([contour], new cv.Vec(255));
    
    if (featherPx && featherPx > 0) {
      const k = Math.max(1, Math.round(featherPx)) | 1; // ensure odd
      const ksize = new cv.Size(k, k);
      return mask.gaussianBlur(ksize, 0);
    }
    
    return mask;
  }

  async processTemplate(artworkBuffer, room, templateId, options = {}) {
    const {
      fit = 'contain',
      marginPx = 0,
      featherPx = -1,
      opacity = -1,
      returnFormat = 'json'
    } = options;

    // Load template and manifest
    const { manifest, bgPath } = await this.loadManifest(room, templateId);
    
    // Load background image
    const bgImage = sharp(bgPath);
    const bgMetadata = await bgImage.metadata();
    const bgW = bgMetadata.width;
    const bgH = bgMetadata.height;

    // Parse corners [TL, TR, BR, BL]
    const corners = manifest.corners;
    if (corners.length !== 4) {
      throw new Error('corners must have 4 points');
    }
    
    const [TL, TR, BR, BL] = corners.map(p => [parseFloat(p[0]), parseFloat(p[1])]);

    // Load artwork
    const artSharp = sharp(artworkBuffer);
    const artMetadata = await artSharp.metadata();
    const aw = artMetadata.width;
    const ah = artMetadata.height;

    // Calculate destination dimensions
    const dstW = Math.sqrt((TR[0] - TL[0]) ** 2 + (TR[1] - TL[1]) ** 2);
    const dstH = Math.sqrt((BL[0] - TL[0]) ** 2 + (BL[1] - TL[1]) ** 2);

    // Apply margin
    const mx = Math.max(0, parseInt(marginPx));
    const targetW = Math.round(dstW) - 2 * mx;
    const targetH = Math.round(dstH) - 2 * mx;

    // Fit artwork size
    const [sw, sh] = this.fitSize(aw, ah, targetW, targetH, fit.toLowerCase());

    // Resize artwork
    const artResized = await artSharp.resize(Math.max(1, sw), Math.max(1, sh)).png().toBuffer();

    // Create canvas
    const canvasW = Math.round(dstW);
    const canvasH = Math.round(dstH);
    
    if (canvasW < 2 || canvasH < 2) {
      throw new Error('Destination frame too small from corners');
    }

    // Create transparent canvas and place artwork
    const canvas = sharp({
      create: {
        width: canvasW,
        height: canvasH,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    });

    const ox = Math.max(0, Math.floor((canvasW - sw) / 2) + (mx > 0 && sw <= canvasW - 2*mx ? mx : 0));
    const oy = Math.max(0, Math.floor((canvasH - sh) / 2) + (mx > 0 && sh <= canvasH - 2*mx ? mx : 0));

    const artCanvas = await canvas.composite([{
      input: artResized,
      left: ox,
      top: oy
    }]).png().toBuffer();

    // Convert to OpenCV format for homography
    const artMat = cv.imdecode(artCanvas);
    const bgMat = cv.imdecode(fs.readFileSync(bgPath));

    // Define source and destination quadrilaterals
    const srcQuad = [
      [0, 0],
      [canvasW, 0], 
      [canvasW, canvasH],
      [0, canvasH]
    ];
    
    const dstQuad = [TL, TR, BR, BL];

    // Calculate homography
    const srcPoints = srcQuad.map(p => new cv.Point2(p[0], p[1]));
    const dstPoints = dstQuad.map(p => new cv.Point2(p[0], p[1]));
    
    const H = cv.findHomography(srcPoints, dstPoints);

    // Warp perspective
    const warped = artMat.warpPerspective(H, new cv.Size(bgW, bgH), cv.INTER_LANCZOS4, cv.BORDER_TRANSPARENT);

    // Apply feathering if needed
    const actualFeatherPx = featherPx >= 0 ? featherPx : (manifest.feather_px || 0);
    let mask;
    if (actualFeatherPx > 0) {
      mask = this.polygonMask([bgH, bgW], dstQuad, actualFeatherPx);
    }

    // Apply opacity
    const actualOpacity = opacity >= 0 ? opacity : (manifest.blend?.opacity || 1.0);

    // Composite result
    let result = bgMat.copy();
    
    // Simple alpha blending (simplified version)
    const warpedRgba = warped.cvtColor(cv.COLOR_BGR2BGRA);
    const alpha = actualOpacity;
    
    // Blend warped onto background
    for (let y = 0; y < bgH; y++) {
      for (let x = 0; x < bgW; x++) {
        const wPixel = warpedRgba.at(y, x);
        if (wPixel[3] > 0) { // If warped pixel has alpha
          const bPixel = result.at(y, x);
          const blendAlpha = (wPixel[3] / 255.0) * alpha;
          
          for (let c = 0; c < 3; c++) {
            result.set(y, x, c, Math.round(wPixel[c] * blendAlpha + bPixel[c] * (1 - blendAlpha)));
          }
        }
      }
    }

    // Convert back to buffer
    const resultBuffer = cv.imencode('.png', result);

    if (returnFormat.toLowerCase() === 'json') {
      const b64 = resultBuffer.toString('base64');
      return { image_b64: b64, w: bgW, h: bgH };
    }

    return resultBuffer;
  }
}

export { MockupProcessor };
export default MockupProcessor;
