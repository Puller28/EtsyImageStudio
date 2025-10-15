import sharp from "sharp";

type RGBA = { r: number; g: number; b: number; alpha: number };

export type FramedMockupOptions = {
  canvasWidth?: number;
  canvasHeight?: number;
  backgroundColor?: string;
  frameColor?: string;
  matColor?: string;
  artBackgroundColor?: string;
  shadowOffset?: { x: number; y: number };
};

function parseHexColor(input: string | undefined, fallback: string): RGBA {
  const value = (input ?? fallback).trim();
  if (!value.startsWith("#")) {
    return parseHexColor(`#${value}`, fallback);
  }

  const hex = value.slice(1);
  const expand = (segment: string) =>
    segment.length === 1 ? segment.repeat(2) : segment;

  if (hex.length === 3 || hex.length === 4) {
    const r = parseInt(expand(hex[0]), 16);
    const g = parseInt(expand(hex[1]), 16);
    const b = parseInt(expand(hex[2]), 16);
    const a =
      hex.length === 4 ? parseInt(expand(hex[3]), 16) / 255 : 1;
    return { r, g, b, alpha: a };
  }

  if (hex.length === 6 || hex.length === 8) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a =
      hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, alpha: a };
  }

  return parseHexColor(fallback, fallback);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export class MockupCompositor {
  async createFramedMockup(
    artworkBuffer: Buffer,
    options: FramedMockupOptions = {}
  ): Promise<Buffer> {
    const canvasWidth = options.canvasWidth ?? 1536;
    const canvasHeight = options.canvasHeight ?? 1024;
    const backgroundColor = parseHexColor(
      options.backgroundColor,
      "#f5f1e9"
    );
    const frameColor = parseHexColor(options.frameColor, "#c7b299");
    const matColor = parseHexColor(options.matColor, "#ffffff");
    const artworkBackground = parseHexColor(
      options.artBackgroundColor,
      "#ffffff"
    );
    const shadowOffset = options.shadowOffset ?? { x: 32, y: 48 };

    const background = sharp({
      create: {
        width: canvasWidth,
        height: canvasHeight,
        channels: 4,
        background: backgroundColor,
      },
    });

    const artworkMeta = await sharp(artworkBuffer).metadata();
    const aspectRatio =
      artworkMeta.width && artworkMeta.height
        ? artworkMeta.width / artworkMeta.height
        : 1;

    const maxFrameWidth = Math.floor(canvasWidth * 0.55);
    const maxFrameHeight = Math.floor(canvasHeight * 0.65);

    let innerWidth = maxFrameWidth;
    let innerHeight = Math.round(innerWidth / aspectRatio);

    if (innerHeight > maxFrameHeight) {
      innerHeight = maxFrameHeight;
      innerWidth = Math.round(innerHeight * aspectRatio);
    }

    const frameThickness = clamp(Math.round(innerWidth * 0.06), 30, 80);
    const matThickness = clamp(Math.round(innerWidth * 0.05), 25, 70);

    const frameOuterWidth =
      innerWidth + (frameThickness + matThickness) * 2;
    const frameOuterHeight =
      innerHeight + (frameThickness + matThickness) * 2;

    const frameCanvas = sharp({
      create: {
        width: frameOuterWidth,
        height: frameOuterHeight,
        channels: 4,
        background: frameColor,
      },
    });

    const matBuffer = await sharp({
      create: {
        width: frameOuterWidth - frameThickness * 2,
        height: frameOuterHeight - frameThickness * 2,
        channels: 4,
        background: matColor,
      },
    })
      .png()
      .toBuffer();

    const artworkPlacementBuffer = await sharp(artworkBuffer)
      .resize(innerWidth, innerHeight, {
        fit: "contain",
        background: artworkBackground,
      })
      .png()
      .toBuffer();

    const matWithArt = await sharp(matBuffer)
      .composite([
        {
          input: artworkPlacementBuffer,
          left: matThickness,
          top: matThickness,
        },
      ])
      .png()
      .toBuffer();

    const framedArtwork = await frameCanvas
      .composite([
        {
          input: matWithArt,
          left: frameThickness,
          top: frameThickness,
        },
      ])
      .png()
      .toBuffer();

    const shadow = await sharp({
      create: {
        width: frameOuterWidth,
        height: frameOuterHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0.35 },
      },
    })
      .blur(clamp(Math.round(frameOuterWidth * 0.04), 20, 45))
      .png()
      .toBuffer();

    const offsetX = Math.round((canvasWidth - frameOuterWidth) / 2);
    const offsetY = Math.round(
      (canvasHeight - frameOuterHeight) / 2 - canvasHeight * 0.04
    );

    const result = await background
      .composite([
        {
          input: shadow,
          left: offsetX + shadowOffset.x,
          top: offsetY + shadowOffset.y,
        },
        {
          input: framedArtwork,
          left: offsetX,
          top: offsetY,
        },
      ])
      .png()
      .toBuffer();

    return result;
  }
}
