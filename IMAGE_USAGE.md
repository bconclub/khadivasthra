# Image Usage Documentation - Khadi Vasthra

This document tracks all images used across the website and their locations.

## Logo Images

### Primary Logo (White Transparent)
- **File:** `/public/Khadi Vasthra White Transparnt.png`
- **Usage:**
  - Homepage hero section (centered, large)
  - Header navigation (after scroll, smaller)
  - Footer (small version)
  - Contact page (top section, centered)
  - Admin panel header
- **Dimensions:** 500x200px (recommended display width)
- **Format:** PNG with transparency
- **Note:** This is the main brand logo used consistently across all pages

### Colored Logo (Optional)
- **File:** `/public/KV Logo Colour.webp`
- **Usage:** Available for colored logo needs
- **Format:** WebP

## Hero/Banner Images

### Homepage Hero Cover
- **File:** `/public/Cover KV.webp`
- **Usage:** Full-screen hero background on homepage
- **Section:** Hero section (`/` route)
- **Display:** Full viewport height with dark overlay
- **Format:** WebP
- **Note:** This is the main background image for the homepage hero section

## Banner/Card Cover Images

### Offer Banner
- **File:** `/public/images/card covers/offer.png`
- **Usage:** Banner/feature cards on homepage
- **Format:** PNG

### Festival Collection Banner
- **File:** `/public/images/card covers/festival collection.png`
- **Usage:** Banner/feature cards on homepage
- **Format:** PNG

## Product Images

### Location Structure
Product images are stored in multiple locations:

1. **New Standardized Location (Recommended):**
   - Path: `/public/images/products/{productId}.{ext}`
   - Example: `/public/images/products/sm-001.jpg`
   - Gallery: `/public/images/products/gallery/{productId}-{number}.{ext}`

2. **Legacy Category-Based Folders:**
   - `/public/images/single-mundus/`
   - `/public/images/double-mundus/`
   - `/public/images/white-mundus/`
   - `/public/images/offwhite-mundus/`
   - `/public/images/printed-mundus/`
   - `/public/images/kavi-mundus/`
   - `/public/images/yellow-double-mundus/`

### Sample Product Images
- `/public/images/mundu-white.png`
- `/public/images/mundu-gold.png`
- `/public/images/mundu-saffron.png`
- `/public/images/mundu-pink.png`
- `/public/images/mundu-black.png`

## Image Usage by Page

### Homepage (`/`)
- **Hero Background:** `/Cover KV.webp`
- **Hero Logo:** `/Khadi Vasthra White Transparnt.png` (large, centered)
- **Banner Cards:** Various from `/images/card covers/`
- **Product Images:** From `/images/products/` or category folders
- **Category Images:** From category folders or product images

### Contact Page (`/contact`)
- **Header Logo:** `/Khadi Vasthra White Transparnt.png` (centered, medium size)
- **Map:** Google Maps embed (no image file)

### Product Pages (`/product/[id]`)
- **Product Images:** From `/images/products/{productId}.{ext}` or product data
- **Gallery Images:** From `/images/products/gallery/` if available

### Admin Panel (`/admin`)
- **Header Logo:** `/Khadi Vasthra White Transparnt.png`

## Component Image Usage

### Header Component
- **Desktop Logo:** `/Khadi Vasthra White Transparnt.png` (180x60px display)
- **Mobile Logo:** `/Khadi Vasthra White Transparnt.png` (120x40px display)
- **Behavior:** Shows on scroll, hidden when at top of page

### Footer Component
- **Logo:** `/Khadi Vasthra White Transparnt.png` (smaller version)

### ProductCard Component
- **Source:** Product image path from product data
- **Fallback:** Placeholder if image not found
- **Path Resolution:** Uses `getProductImagePath()` utility function

### ProductCarousel Component
- **Source:** Featured product images from API or static JSON
- **Carousel Library:** Embla Carousel React

## Image Optimization

### Next.js Image Component
All images use Next.js `Image` component for:
- Automatic optimization
- Lazy loading
- Responsive images
- WebP conversion (when configured)

### Static Export Note
- Since the project uses static export (`output: 'export'`), images are unoptimized
- Images are served as static files
- Use optimized formats (WebP) when possible

## Image File Naming Conventions

### Products
- Format: `{product-id}.{ext}`
- Example: `sm-001.jpg`, `dm-002.webp`
- Gallery: `{product-id}-1.jpg`, `{product-id}-2.jpg`, etc.

### Categories
- Use descriptive names or category slugs
- Example: `white-mundus.jpg`

### Logos and Branding
- Use descriptive names: `Khadi Vasthra White Transparnt.png`
- Keep original high-resolution versions

## Adding New Images

### Product Images
1. Upload to `/public/images/products/` or appropriate category folder
2. Update product data in admin panel or `admin/data/products.json`
3. Image path should start with `/images/` (not `/public/images/`)

### Logo/Branding
1. Add to `/public/` root directory
2. Update components that use the logo
3. Keep both WebP and PNG versions for compatibility

### Banner Images
1. Add to `/public/images/card covers/`
2. Update homepage banner section
3. Recommended size: 1200x800px or similar aspect ratio

## Image Formats Supported

- **PNG:** Logos, transparent images, high-quality graphics
- **WebP:** Product images, banners (better compression)
- **JPG/JPEG:** Product photos, general images
- **SVG:** Icons (via Lucide React library, not files)

## Image Path Resolution

The project uses utility functions for image path resolution:

```typescript
// From src/lib/imageUtils.ts
getProductImagePath(productId, category, providedPath)
```

Priority order:
1. Provided path in product data
2. `/images/products/{productId}.{ext}`
3. Legacy category folder: `/images/{category-slug}/{productId}.{ext}`

## Admin Panel Image Upload

- **Location:** Admin panel → Products → Upload Image
- **Storage:** `/admin/uploads/`
- **Public Path:** `/admin/uploads/{filename}`
- **Limits:** Max 2MB, JPG/PNG/WebP/GIF only
- **Auto-naming:** Uses timestamp or original filename

## Production Considerations

### Image Optimization
- Compress images before upload
- Use WebP format for better compression
- Recommended sizes:
  - Hero images: 1920x1080px
  - Product images: 800x1000px
  - Logos: Original size, scaled in CSS

### CDN (Future)
- Consider using a CDN for images in production
- Update image paths to CDN URLs
- Maintain fallback to local images

## Checklist for New Images

- [ ] Image added to correct directory
- [ ] File name follows naming convention
- [ ] Image optimized/compressed
- [ ] Path updated in product data or component
- [ ] Alt text added for accessibility
- [ ] Image displays correctly on all pages
- [ ] Responsive behavior tested
- [ ] File size reasonable (< 500KB for product images)

---

*Last Updated: December 2024*
*This document should be updated when new images are added or image paths change.*
