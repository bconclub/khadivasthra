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
  return `/images/${categorySlug}/${productId}.jpg`;
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
  extensions.forEach(ext => {
    paths.push(`/images/${categorySlug}/${productId}.${ext}`);
  });
  
  return paths;
}

/**
 * Normalizes product image path to use standardized location
 * Uses product name to generate filename, falls back to product ID if name not available
 * Converts legacy paths to new format when possible
 */
export function normalizeProductImagePath(productId: string, imagePath?: string, productName?: string): string {
  // If image path already exists and is in public folder, use it
  if (imagePath && imagePath.startsWith('/images/') && !imagePath.startsWith('blob:') && !imagePath.startsWith('data:')) {
    // If already in new format, return as is
    if (imagePath.startsWith('/images/products/') && !imagePath.includes('/gallery/')) {
      return imagePath;
    }
    // Convert legacy paths to new format
    const ext = imagePath.split('.').pop() || 'jpg';
    const slug = productName ? productNameToSlug(productName) : productId;
    return `/images/products/${slug}.${ext}`;
  }
  
  // Generate new path using product name if available, otherwise use product ID
  if (productName) {
    const slug = productNameToSlug(productName);
    return `/images/products/${slug}.jpg`;
  }
  
  // Fallback to product ID if name not available
  return `/images/products/${productId}.jpg`;
}



