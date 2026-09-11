import { brandIconImage } from "../lib/brand-icon";

/**
 * App Router icon slot. `generateImageMetadata` is how Next.js emits
 * multiple PNG sizes from this one module (paired with `apple-icon.tsx`
 * for the 180px Apple touch icon, and `favicon.ico` for the ICO URL).
 */
export function generateImageMetadata() {
  return [
    { contentType: "image/png" as const, size: { width: 32, height: 32 }, id: "32" },
    { contentType: "image/png" as const, size: { width: 192, height: 192 }, id: "192" }
  ];
}

export default function Icon({ id }: { id: string }) {
  const size = Number(id) || 32;
  return brandIconImage(size);
}
