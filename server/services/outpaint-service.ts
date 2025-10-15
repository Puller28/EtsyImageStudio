import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { temporaryDirectory } from "tempy";
import sharp from "sharp";
import OpenAI from "openai";
import { PNG } from "pngjs";

export type SideConfig = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};

type OutpaintOptions = {
  imageBuffer: Buffer;
  prompt: string;
  sideConfig?: SideConfig;
  variations?: number;
};

type ImageSizeVariant = "1024x1024" | "1024x1536" | "1536x1024" | "auto";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_SIDE_CONFIG: Required<SideConfig> = {
  top: 128,
  right: 256,
  bottom: 0,
  left: 128,
};

async function callRembgSidecar(imageBuffer: Buffer): Promise<Buffer> {
  const rembgUrl = process.env.REMBG_URL;
  if (!rembgUrl) {
    throw new Error("REMBG_URL not configured; cannot call rembg sidecar");
  }

  const response = await fetch(`${rembgUrl}/alpha`, {
    method: "POST",
    body: (() => {
      const formData = new FormData();
      formData.set(
        "image",
        new Blob([imageBuffer], { type: "image/png" }),
        "upload.png",
      );
      return formData;
    })(),
  });

  if (!response.ok) {
    throw new Error(`rembg sidecar error: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function callRembgCli(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const bin = process.env.REMBG_CLI_PATH || "rembg";
    const child = spawn(bin, ["i", inputPath, outputPath]);

    let stderr = "";
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`rembg CLI failed with code ${code}: ${stderr}`));
      }
    });
  });
}

async function generateAlphaMask(tempDir: string, inputPath: string, imageBuffer: Buffer): Promise<string> {
  const sidecarAvailable = Boolean(process.env.REMBG_URL);
  const maskPath = path.join(tempDir, "mask.png");

  if (sidecarAvailable) {
    const maskBuffer = await callRembgSidecar(imageBuffer);
    fs.writeFileSync(maskPath, maskBuffer);
    return maskPath;
  }

  await callRembgCli(inputPath, maskPath);
  return maskPath;
}

async function refineMask(maskPath: string, dilatePx = 6): Promise<string> {
  const png = PNG.sync.read(fs.readFileSync(maskPath));
  const { width, height, data } = png;
  const total = width * height;

  const binary = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    binary[i] = data[i * 4 + 3] > 0 ? 255 : 0;
  }

  const maskAlpha = new Uint8Array(total).fill(0);

  for (let i = 0; i < total; i++) {
    if (binary[i] === 255) {
      maskAlpha[i] = 255;
    }
  }

  if (dilatePx > 0) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (maskAlpha[idx] === 255) continue;

        for (let dy = -dilatePx; dy <= dilatePx; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= height) continue;
          for (let dx = -dilatePx; dx <= dilatePx; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= width) continue;
            if (binary[yy * width + xx] === 255) {
              maskAlpha[idx] = 128;
              dy = dilatePx + 1;
              break;
            }
          }
        }
      }
    }
  }

  for (let i = 0; i < total; i++) {
    data[i * 4 + 0] = 0;
    data[i * 4 + 1] = 0;
    data[i * 4 + 2] = 0;
    data[i * 4 + 3] = maskAlpha[i];
  }

  const refinedPath = maskPath.replace(/\.png$/, ".refined.png");
  fs.writeFileSync(refinedPath, PNG.sync.write(png));
  return refinedPath;
}

async function openAiEdit(params: {
  imagePath: string;
  maskPath: string;
  prompt: string;
  size: ImageSizeVariant;
  variations: number;
}): Promise<Buffer[]> {
  const imageFilename = path.basename(params.imagePath);
  const maskFilename = path.basename(params.maskPath);

  const imageBuffer = await fs.promises.readFile(params.imagePath);
  const maskBuffer = await fs.promises.readFile(params.maskPath);

  const imageFile = new File([imageBuffer], imageFilename, { type: inferMime(imageFilename) });
  const maskFile = new File([maskBuffer], maskFilename, { type: inferMime(maskFilename) });

  const allowedSizes = new Set<ImageSizeVariant>(["1024x1024", "1024x1536", "1536x1024", "auto"]);
  const requestedSize: ImageSizeVariant = allowedSizes.has(params.size)
    ? params.size
    : "auto";
  if (requestedSize !== params.size) {
    console.warn(
      `OutpaintService: requested size ${params.size} is not supported, falling back to '${requestedSize}'`,
    );
  }

  const response = await openai.images.edit({
    model: "gpt-image-1",
    image: [imageFile],
    mask: maskFile,
    prompt: params.prompt,
    size: requestedSize,
    n: params.variations,
  });

  const responseData = response.data ?? [];

  return await Promise.all(
    responseData.map(async (item) => {
      if (item.b64_json) {
        return Buffer.from(item.b64_json, "base64");
      }
      if (item.url) {
        const res = await fetch(item.url);
        if (!res.ok) {
          throw new Error(`Failed to download image from ${item.url}: ${res.status} ${res.statusText}`);
        }
        const arrayBuffer = await res.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
      throw new Error("OpenAI image edit response missing image data");
    }),
  );
}

async function pickBestBySize(buffers: Buffer[]): Promise<Buffer> {
  if (buffers.length === 1) {
    return buffers[0];
  }

  const scored = await Promise.all(
    buffers.map(async (buf) => {
      const jpegBuffer = await sharp(buf).jpeg({ quality: 85 }).toBuffer();
      return { buf, score: jpegBuffer.length };
    }),
  );

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.buf ?? buffers[0];
}

async function makeBandMask(
  width: number,
  height: number,
  sides: Required<SideConfig>,
): Promise<Buffer> {
  const base = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 255 },
    },
  })
    .png()
    .toBuffer();

  const composites: { input: Buffer; left: number; top: number }[] = [];
  const transparent = async (w: number, h: number) =>
    sharp({
      create: {
        width: w,
        height: h,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();

  if (sides.left) composites.push({ input: await transparent(sides.left, height), left: 0, top: 0 });
  if (sides.right) composites.push({ input: await transparent(sides.right, height), left: width - sides.right, top: 0 });
  if (sides.top) composites.push({ input: await transparent(width, sides.top), left: 0, top: 0 });
  if (sides.bottom) composites.push({ input: await transparent(width, sides.bottom), left: 0, top: height - sides.bottom });

  return sharp(base).composite(composites).png().toBuffer();
}

async function expandCanvas(
  baseImage: Buffer,
  sides: Required<SideConfig>,
): Promise<{ expandedImage: Buffer; size: { width: number; height: number } }> {
  const meta = await sharp(baseImage).metadata();
  const width = (meta.width ?? 0) + sides.left + sides.right;
  const height = (meta.height ?? 0) + sides.top + sides.bottom;

  const expanded = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: baseImage, left: sides.left, top: sides.top }])
    .png()
    .toBuffer();

  return {
    expandedImage: expanded,
    size: { width, height },
  };
}

export class MockupOutpaintService {
  async generate(options: OutpaintOptions): Promise<{ images: string[]; best: string }> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const tempDir = temporaryDirectory();
    try {
      const inputPath = path.join(tempDir, "input.png");
      await sharp(options.imageBuffer).png().toFile(inputPath);

      const maskPath = await generateAlphaMask(tempDir, inputPath, options.imageBuffer);
      const refinedMaskPath = await refineMask(maskPath);

      const promptBase = options.prompt || "Extend background, preserve subject, photorealistic result";
      const variations = Math.min(Math.max(options.variations ?? 4, 1), 8);

  const pass1Buffers = await openAiEdit({
    imagePath: inputPath,
    maskPath: refinedMaskPath,
    prompt: `Extend the background as ${promptBase}, keep primary subject unchanged, natural lighting, avoid repeated textures, photorealistic`,
    size: "1536x1024",
    variations,
  });

  const pass1Best = await pickBestBySize(pass1Buffers);
      const pass1Path = path.join(tempDir, "pass1.png");
      fs.writeFileSync(pass1Path, pass1Best);

      const sideConfig: Required<SideConfig> = {
        ...DEFAULT_SIDE_CONFIG,
        ...(options.sideConfig ?? {}),
      };

  const { expandedImage, size } = await expandCanvas(pass1Best, sideConfig);
      const expandedPath = path.join(tempDir, "expanded.png");
      fs.writeFileSync(expandedPath, expandedImage);

      const bandMaskBuffer = await makeBandMask(size.width, size.height, sideConfig);
      const bandMaskPath = path.join(tempDir, "bandmask.png");
      fs.writeFileSync(bandMaskPath, bandMaskBuffer);

  const pass2Buffers = await openAiEdit({
    imagePath: expandedPath,
    maskPath: bandMaskPath,
    prompt: `Complete the extended canvas as ${promptBase}, match perspective, shadows and lighting, seamless textures`,
    size: "1536x1024",
    variations,
  });

      const pass2Best = await pickBestBySize(pass2Buffers);
      const images = [pass2Best, ...pass2Buffers.filter((buf) => buf !== pass2Best)].slice(0, variations);

      return {
        best: `data:image/png;base64,${pass2Best.toString("base64")}`,
        images: images.map((buf) => `data:image/png;base64,${buf.toString("base64")}`),
      };
    } finally {
      await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
function inferMime(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}
