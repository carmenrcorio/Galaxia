/**
 * Client-side PNG capture helpers for ShareImageButton.
 *
 * The galaxy constellation is two live <canvas> layers. html-to-image's
 * toSvg path clones those via canvas.toDataURL() into an SVG foreignObject
 * and then rasterizes the SVG onto a new canvas. WebKit (iOS Safari) paints
 * that nested canvas-in-SVG as a solid background. Reading the on-screen
 * canvases with drawImage / toDataURL is also empty on iOS when they are
 * GPU-promoted (`position: absolute`). /app therefore redraws THIS
 * account's settled sky onto offscreen canvases (`willReadFrequently`) and
 * composeGalaxySharePng() composites those. Natal / compare stay on the
 * HTML/SVG html-to-image path.
 */

export const SHARE_IMAGE_BG = "#0a0717";
/** iOS Safari silently returns a blank bitmap past ~4096px on a side. */
export const SHARE_IMAGE_MAX_DIM = 4096;
export const SHARE_IMAGE_FAIL = "Could not create the image. Try again.";
export const SHARE_SUCCESS_REVERT_MS = 2800;

export const SHARE_IMAGE_BG_RGB: [number, number, number] = [10, 7, 23];

export type ShareRaster = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

export function shareImageOutputSize(
  srcW: number,
  srcH: number,
  maxDim = SHARE_IMAGE_MAX_DIM,
): { width: number; height: number; scale: number } {
  const w = Math.max(1, Math.round(srcW));
  const h = Math.max(1, Math.round(srcH));
  const longest = Math.max(w, h);
  if (longest <= maxDim) return { width: w, height: h, scale: 1 };
  const scale = maxDim / longest;
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
    scale,
  };
}

export function countNonBackgroundSamples(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  bg: [number, number, number] = SHARE_IMAGE_BG_RGB,
  step?: number,
): { nonBg: number; sampled: number } {
  const stride = step ?? Math.max(1, Math.floor(Math.max(width, height) / 64));
  let nonBg = 0;
  let sampled = 0;
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const i = (y * width + x) * 4;
      sampled++;
      if (data[i + 3]! < 8) continue;
      if (
        Math.abs(data[i]! - bg[0]) > 8 ||
        Math.abs(data[i + 1]! - bg[1]) > 8 ||
        Math.abs(data[i + 2]! - bg[2]) > 8
      ) {
        nonBg++;
      }
    }
  }
  return { nonBg, sampled };
}

/** A successful sky/wheel capture has well above this ratio of non-background samples. */
export const SHARE_BLANK_RATIO = 0.004;

export function isBlankShareRaster(nonBg: number, sampled: number, minRatio = SHARE_BLANK_RATIO): boolean {
  if (sampled <= 0) return true;
  return nonBg / sampled < minRatio;
}

export function assertShareRasterHasContent(nonBg: number, sampled: number): void {
  if (isBlankShareRaster(nonBg, sampled)) {
    throw new Error(SHARE_IMAGE_FAIL);
  }
}

function fillRaster(dst: ShareRaster, rgb: [number, number, number]) {
  const { data } = dst;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
    data[i + 3] = 255;
  }
}

function blitSrcOver(dst: ShareRaster, src: ShareRaster) {
  const dw = dst.width;
  const dh = dst.height;
  const sw = src.width;
  const sh = src.height;
  if (sw < 1 || sh < 1) return;
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(sh - 1, Math.floor((y * sh) / dh));
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(sw - 1, Math.floor((x * sw) / dw));
      const si = (sy * sw + sx) * 4;
      const a = src.data[si + 3]! / 255;
      if (a <= 0) continue;
      const di = (y * dw + x) * 4;
      const inv = 1 - a;
      dst.data[di] = Math.round(src.data[si]! * a + dst.data[di]! * inv);
      dst.data[di + 1] = Math.round(src.data[si + 1]! * a + dst.data[di + 1]! * inv);
      dst.data[di + 2] = Math.round(src.data[si + 2]! * a + dst.data[di + 2]! * inv);
      dst.data[di + 3] = Math.round(a * 255 + dst.data[di + 3]! * inv);
    }
  }
}

/**
 * Pure compositing used by unit tests (jsdom has no real canvas). The
 * browser wrapper composeGalaxySharePng() does the same blit with
 * CanvasRenderingContext2D.drawImage.
 */
export function composeGalaxyRasters(
  atm: ShareRaster,
  motion: ShareRaster,
  maxDim = SHARE_IMAGE_MAX_DIM,
): ShareRaster & { nonBg: number; sampled: number } {
  const srcW = Math.max(atm.width, motion.width);
  const srcH = Math.max(atm.height, motion.height);
  if (srcW < 1 || srcH < 1) throw new Error(SHARE_IMAGE_FAIL);
  const { width, height } = shareImageOutputSize(srcW, srcH, maxDim);
  const data = new Uint8ClampedArray(width * height * 4);
  const dst: ShareRaster = { width, height, data };
  fillRaster(dst, SHARE_IMAGE_BG_RGB);
  blitSrcOver(dst, atm);
  blitSrcOver(dst, motion);
  const { nonBg, sampled } = countNonBackgroundSamples(data, width, height);
  return { ...dst, nonBg, sampled };
}

export function paintConstellationFixture(
  width: number,
  height: number,
  people: number,
): { atm: ShareRaster; motion: ShareRaster } {
  const atmData = new Uint8ClampedArray(width * height * 4);
  const motionData = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < atmData.length; i += 4) {
    const y = Math.floor(i / 4 / width);
    const t = y / Math.max(1, height - 1);
    atmData[i] = Math.round(22 - t * 10);
    atmData[i + 1] = Math.round(16 - t * 8);
    atmData[i + 2] = Math.round(46 - t * 16);
    atmData[i + 3] = 255;
  }
  const n = Math.max(1, people);
  for (let p = 0; p < n; p++) {
    const cx = Math.round(width * (0.2 + (0.6 * (p + 1)) / (n + 1)));
    const cy = Math.round(height * (0.25 + 0.5 * ((p % 5) / 4)));
    const r = p === 0 ? 8 : 5;
    for (let y = cy - r * 3; y <= cy + r * 3; y++) {
      for (let x = cx - r * 3; x <= cx + r * 3; x++) {
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const d = Math.hypot(x - cx, y - cy);
        const i = (y * width + x) * 4;
        if (d <= r) {
          motionData[i] = 230;
          motionData[i + 1] = 174;
          motionData[i + 2] = 108;
          motionData[i + 3] = 255;
        } else if (d <= r * 3) {
          const a = 0.35 * (1 - (d - r) / (r * 2));
          motionData[i] = 230;
          motionData[i + 1] = 174;
          motionData[i + 2] = 108;
          motionData[i + 3] = Math.max(motionData[i + 3]!, Math.round(a * 255));
        }
      }
    }
  }
  return {
    atm: { width, height, data: atmData },
    motion: { width, height, data: motionData },
  };
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob || blob.size < 64) {
        console.error("Share image toBlob produced an empty file", { size: blob?.size ?? 0 });
        reject(new Error(SHARE_IMAGE_FAIL));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

/**
 * Composite atmosphere + motion. Sources should be CPU-backed (offscreen,
 * `willReadFrequently`) — iOS Safari's GPU-promoted on-screen canvases
 * (`position: absolute`) often `drawImage` as empty even though they paint
 * on screen. Asserts content BEFORE the watermark so a gold "galaxiamea.com"
 * cannot mask a blank sky. Returns a PNG Blob (no data-URL); iOS Web Share
 * of a large `data:` URL is a known empty-file failure.
 */
export async function composeGalaxySharePng(
  atm: HTMLCanvasElement,
  motion: HTMLCanvasElement,
  options?: { maxDim?: number; cssWidth?: number },
): Promise<Blob> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready.catch(() => {});
  }
  const srcW = Math.max(atm.width, motion.width);
  const srcH = Math.max(atm.height, motion.height);
  const { width, height } = shareImageOutputSize(srcW, srcH, options?.maxDim);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error(SHARE_IMAGE_FAIL);
  ctx.fillStyle = SHARE_IMAGE_BG;
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(atm, 0, 0, width, height);
  ctx.drawImage(motion, 0, 0, width, height);
  assertCanvasHasContent(canvas, "galaxy");
  const cssW = options?.cssWidth || motion.clientWidth || atm.clientWidth || width;
  const cssScale = width / Math.max(cssW, 1);
  ctx.fillStyle = "rgba(230,174,108,0.5)";
  ctx.font = `${Math.max(9, Math.round(10 * cssScale))}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("galaxiamea.com", width - 14 * cssScale, height - 10 * cssScale);
  return canvasToPngBlob(canvas);
}

export function assertCanvasHasContent(canvas: HTMLCanvasElement, label = "share"): void {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error(SHARE_IMAGE_FAIL);
  if (canvas.width < 1 || canvas.height < 1) {
    console.error("Share image capture produced an empty canvas", { label, width: canvas.width, height: canvas.height });
    throw new Error(SHARE_IMAGE_FAIL);
  }
  const sample = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { nonBg, sampled } = countNonBackgroundSamples(sample.data, canvas.width, canvas.height);
  if (isBlankShareRaster(nonBg, sampled)) {
    console.error("Share image capture produced a blank raster", {
      label,
      width: canvas.width,
      height: canvas.height,
      nonBg,
      sampled,
    });
    throw new Error(SHARE_IMAGE_FAIL);
  }
}

export function shareButtonLabel(idleLabel: string, busy: boolean, status: string | null): string {
  if (busy) return "Creating image…";
  return status ?? idleLabel;
}

export function shouldRevertShareStatus(hidden: boolean): boolean {
  return hidden;
}
