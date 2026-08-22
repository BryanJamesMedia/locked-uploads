import sharp from "sharp";

/**
 * Downscaling to 32px destroys the original detail before the blur is applied,
 * so the preview cannot be sharpened or reconstructed into the original.
 */
const PREVIEW_LONG_EDGE = 32;
const PREVIEW_BLUR = 1.5;
/** Rendered size of the preview in the browser; the upscale keeps it smooth. */
const PREVIEW_OUTPUT_LONG_EDGE = 640;

const AVATAR_EDGE = 512;

/** Avatars are served publicly, so they are re-encoded and stripped of metadata. */
export async function generateAvatar(original: Buffer): Promise<Buffer> {
  return sharp(original, { failOn: "none" })
    .rotate()
    .resize(AVATAR_EDGE, AVATAR_EDGE, { fit: "cover", position: "attention" })
    .jpeg({ quality: 85 })
    .toBuffer();
}

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
