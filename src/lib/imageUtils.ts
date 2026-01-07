/**
 * Utility functions for product images
 */

/**
 * Converts category name to folder slug
 */
export function categoryToSlug(category: string): string {
  const slugMap: Record<string, string> = {
    "White Mundus": "white-mundus",
    "Offwhite Mundus": "offwhite-mundus",
    "4.5m Double Mundus": "double-mundus",
    "Printed Mundus": "printed-mundus",
    "Yellow Double Mundus": "yellow-double-mundus",
    "Single Mundus": "single-mundus",
    "Kavi Mundus": "kavi-mundus",
  };
  
  return slugMap[category] || category.toLowerCase().replace(/\s+/g, "-");
}

/**
 * Generates image path based on product ID and category
 * Tries multiple extensions (jpg, png, webp)
 */
export function getProductImagePath(productId: string, category: string): string {
  const categorySlug = categoryToSlug(category);
  // Try common extensions - Next.js Image will handle fallback
  return `/images/${categorySlug}/${productId}.jpg`;
}

/**
 * Gets all possible image paths for a product (for fallback)
 */
export function getProductImagePaths(productId: string, category: string): string[] {
  const categorySlug = categoryToSlug(category);
  const extensions = ['jpg', 'png', 'webp'];
  return extensions.map(ext => `/images/${categorySlug}/${productId}.${ext}`);
}



