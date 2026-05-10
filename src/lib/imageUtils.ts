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
 * Maps product IDs to actual image filenames in category folders
 * This handles cases where filenames don't match product IDs
 */
export function getProductImageFilename(productId: string, category: string): string | null {
  // Mapping of product IDs to actual image filenames in category folders
  const imageMap: Record<string, string> = {
    // White Mundus
    "wm-001": "blur-border-white.webp",
    "wm-002": "grey-border-white.webp",
    "wm-003": "purple borde sitiing.webp",
    // Offwhite Mundus
    "om-001": "goldern border white.webp",
    // Add more mappings as needed
  };
  
  if (imageMap[productId]) {
    const categorySlug = categoryToSlug(category);
    return `/images/products/${categorySlug}/${imageMap[productId]}`;
  }
  
  return null;
}

/**
 * Creates a URL-friendly slug from product name/title
 * Converts to lowercase, replaces spaces with hyphens, removes special chars
 */
export function productNameToSlug(productName: string): string {
  return productName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Gets the main product image path (standardized location)
 * Priority: 1. /images/products/{productId}.{ext} 2. Legacy category folder 3. Provided image path
 */
export function getProductImagePath(productId: string, category: string, providedPath?: string): string {
  // If product already has an image path that's in the new format, use it
  if (providedPath && providedPath.startsWith('/images/products/') && !providedPath.includes('/gallery/')) {
    return providedPath;
  }
  
  // Try new standardized location first
  const extensions = ['jpg', 'jpeg', 'png', 'webp'];
  for (const ext of extensions) {
    const newPath = `/images/products/${productId}.${ext}`;
    // Return the path (actual file existence will be checked by Next.js Image component)
    if (ext === 'jpg') return newPath; // Default to jpg
  }
  
  // Fallback to legacy category-based path if new format doesn't exist
  const categorySlug = categoryToSlug(category);
    return `/images/products/${categorySlug}/${productId}.jpg`;
}

/**
 * Gets gallery images for a product
 */
export function getProductGalleryImages(productId: string, providedImages?: string[]): string[] {
  if (providedImages && providedImages.length > 0) {
    // Filter to only gallery images or return all if they're in the gallery folder
    return providedImages.filter(img => 
      img && (img.includes('/gallery/') || img.startsWith('/images/products/gallery/'))
    );
  }
  
  // Generate gallery paths (assuming they follow the pattern productId_1.jpg, productId_2.jpg, etc.)
  // In practice, these should come from the product data
  return [];
}

/**
 * Gets all possible image paths for a product (for fallback)
 */
export function getProductImagePaths(productId: string, category: string): string[] {
  const paths: string[] = [];
  
  // New standardized paths
  const extensions = ['jpg', 'jpeg', 'png', 'webp'];
  extensions.forEach(ext => {
    paths.push(`/images/products/${productId}.${ext}`);
  });
  
  // Legacy category-based paths
  const categorySlug = categoryToSlug(category);
    extensions.forEach((ext) => {
      paths.push(`/images/products/${categorySlug}/${productId}.${ext}`);
    });
  
  return paths;
}

/**
 * Normalizes product image path to use standardized location
 * Preserves valid existing paths, only converts when necessary
 * Uses product name to generate filename, falls back to product ID if name not available
 * Also tries category folder images as fallback
 */
export function normalizeProductImagePath(productId: string, imagePath?: string, productName?: string, category?: string): string {
  // Reject blob/data URLs - these are in browser memory
  if (imagePath && (imagePath.startsWith('blob:') || imagePath.startsWith('data:'))) {
    imagePath = '';
  }
  
  // If image path already exists and is in public folder, use it as-is
  // Prefer the provided product image path (it often contains the correct subfolder)
  if (imagePath && imagePath.startsWith('/images/') && !imagePath.includes('..')) {
    return imagePath;
  }

  // Next, try to get mapped image filename if available (handles cases where filenames don't match product IDs)
  if (category) {
    const mappedImage = getProductImageFilename(productId, category);
    if (mappedImage) {
      return mappedImage;
    }
  }
  
  // Only generate new path if no valid path was provided or imagePath is empty
  // Try category folder first with product ID (e.g., /images/white-mundus/{productId}.png)
  if (category && (!imagePath || imagePath === '' || imagePath.trim() === '')) {
    const categorySlug = categoryToSlug(category);
    // Try common extensions in category folder - start with png as most images in white-mundus are png
     return `/images/products/${categorySlug}/${productId}.webp`;
  }
  
  // Try new standardized location (product name slug)
  if (productName) {
    const slug = productNameToSlug(productName);
    return `/images/products/${slug}.jpg`;
  }
  
  // Fallback to product ID if name not available
  return `/images/products/${productId}.jpg`;
}



