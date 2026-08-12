/**
 * Product photos are uploaded at full resolution (many are 1-2.5 MB PNGs) and
 * the site is a static export, so Next.js image optimisation is unavailable —
 * every image was being served at original size.
 *
 * Supabase Storage can resize and re-encode on the fly: swapping
 * `/object/public/` for `/render/image/public/` and passing width/quality
 * typically cuts a 470 KB photo to under 80 KB. Non-Supabase URLs (local
 * files, placeholders) are returned untouched.
 */
export function storageImage(
  url: string | null | undefined,
  width: number,
  quality = 82
): string {
  if (!url) return "";
  if (!url.includes("/storage/v1/object/public/")) return url;
  const base = url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}width=${width}&quality=${quality}`;
}

/** Widths used across the site, so call sites stay consistent. */
// Widths are ~2x their largest CSS size so the images stay sharp on retina
// screens — dropping below this is where the compression starts to show.
export const IMG = {
  thumb: 400,      // colour swatches, tiny previews
  card: 700,       // product + category cards in grids and carousels
  hero: 1400,      // product page main image
  banner: 1920,    // full-HD full-width banners
  bannerMobile: 1080,
} as const;
