# Product Images Directory

This directory contains product images organized by category.

## Folder Structure

```
public/images/
├── white-mundus/          # White Mundus category
├── offwhite-mundus/       # Offwhite Mundus category
├── double-mundus/         # 4.5m Double Mundus category
├── printed-mundus/        # Printed Mundus category
├── yellow-double-mundus/  # Yellow Double Mundus category
├── single-mundus/         # Single Mundus category
└── kavi-mundus/           # Kavi Mundus category
```

## Image Naming Convention

Use the product ID as the filename:
- Format: `{product-id}.jpg` or `{product-id}.png`
- Example: `wm-001.jpg`, `om-001.png`, `dm-001.jpg`

## Image Specifications

- **Recommended size:** 800x1000px (portrait orientation)
- **Format:** JPG or PNG
- **File size:** Keep under 500KB for optimal performance
- **Quality:** High resolution, clear product photos

## Upload Instructions

1. **Identify the category** of your product
2. **Navigate to the corresponding folder** (e.g., `white-mundus/`)
3. **Name the file** using the product ID from `products.json`
4. **Upload the image** to that folder
5. **Update products.json** if needed (image paths are auto-generated)

## Current Products

### Featured Products (isFeatured: true)
- `wm-001` - Premium Cotton White Mundu
- `om-001` - Tissue Double Mundu Offwhite
- `dm-001` - 4.5m Premium Double Mundu
- `pm-001` - Hand Block Printed Mundu
- `ym-001` - Golden Yellow Double Mundu
- `km-001` - Traditional Kavi Mundu
- `wm-003` - Wedding Special White Mundu

### All Products by Category

**White Mundus:**
- wm-001, wm-002, wm-003

**Offwhite Mundus:**
- om-001, om-002

**4.5m Double Mundus:**
- dm-001, dm-002, dm-003

**Printed Mundus:**
- pm-001, pm-002, pm-003

**Yellow Double Mundus:**
- ym-001, ym-002

**Single Mundus:**
- sm-001, sm-002

**Kavi Mundus:**
- km-001, km-002

## Notes

- Images are automatically referenced in `products.json` using the pattern: `/images/{category-slug}/{product-id}.jpg`
- If an image is missing, the product will use a placeholder
- Always optimize images before uploading for better site performance



