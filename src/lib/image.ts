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
  quality = 70
): string {
  if (!url) return "";
  if (!url.includes("/storage/v1/object/public/")) return url;
  const base = url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}width=${width}&quality=${quality}`;
}

/** Widths used across the site, so call sites stay consistent. */
export const IMG = {
  thumb: 200,      // colour swatches, tiny previews
  card: 500,       // product + category cards in grids and carousels
  hero: 1200,      // product page main image
  banner: 1600,    // full-width banners
  bannerMobile: 800,
} as const;
