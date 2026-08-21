import sharp from "sharp";

/**
 * Downscaling to 32px destroys the original detail before the blur is applied,
 * so the preview cannot be sharpened or reconstructed into the original.
 */
const PREVIEW_LONG_EDGE = 32;
const PREVIEW_BLUR = 1.5;
/** Rendered size of the preview in the browser; the upscale keeps it smooth. */
const PREVIEW_OUTPUT_LONG_EDGE = 640;

export async function generateImagePreview(original: Buffer): Promise<Buffer> {
  const degraded = await sharp(original, { failOn: "none" })
    .rotate()
    .resize(PREVIEW_LONG_EDGE, PREVIEW_LONG_EDGE, { fit: "inside", withoutEnlargement: true })
    .blur(PREVIEW_BLUR)
    .jpeg({ quality: 60 })
    .toBuffer();

  return sharp(degraded)
    .resize(PREVIEW_OUTPUT_LONG_EDGE, PREVIEW_OUTPUT_LONG_EDGE, { fit: "inside" })
    .jpeg({ quality: 70 })
    .toBuffer();
}
