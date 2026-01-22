# Product Images Directory

This directory contains product images organized for easy management and updates.

## Folder Structure

```
public/images/products/
├── {productId}.jpg          # Main product image (e.g., wm-001.jpg)
├── {productId}.png          # Alternative format (e.g., wm-001.png)
├── gallery/                 # Product gallery images
│   ├── {productId}_1.jpg    # First gallery image
│   ├── {productId}_2.jpg    # Second gallery image
│   └── {productId}_3.jpg    # Third gallery image
└── README.md               # This file
```

## Image Naming Convention

### Main Product Images
- **Format**: `{productId}.{extension}`
- **Location**: `/images/products/`
- **Example**: `/images/products/wm-001.jpg`
- **Purpose**: Primary product image shown in listings, featured products, and product cards

### Gallery Images
- **Format**: `{productId}_{index}.{extension}`
- **Location**: `/images/products/gallery/`
- **Example**: `/images/products/gallery/wm-001_1.jpg`
- **Purpose**: Additional images for product detail pages

## Image Specifications

### Main Product Images
- **Recommended size**: 800x1000px (portrait orientation)
- **Format**: JPG, PNG, or WebP
- **File size**: Keep under 500KB for optimal performance
- **Quality**: High resolution, clear product photos

### Gallery Images
- **Recommended size**: 1200x1600px (portrait orientation)
- **Format**: JPG, PNG, or WebP
- **File size**: Keep under 800KB per image
- **Quality**: High resolution, multiple angles

## Benefits of This Structure

1. **Easy to Update**: All product images in one organized location
2. **Consistent Paths**: Featured products use the same image paths as regular products
3. **Clear Organization**: Easy to find images by product ID
4. **Scalable**: Simple to add gallery images
5. **Backward Compatible**: Legacy category folders still work as fallback

## Upload Instructions

### Via Admin Panel
1. Go to Admin Panel → Products
2. Click "Add Product" or edit existing product
3. Click "Upload Image" button
4. Select your image file
5. The system automatically:
   - Names the file using the product ID
   - Saves it to `/images/products/`
   - Updates the product record

### Manual Upload
1. Identify the product ID (e.g., `wm-001`)
2. Name your image file: `{productId}.jpg` (e.g., `wm-001.jpg`)
3. Upload to `/public/images/products/` folder
4. For gallery images, use: `{productId}_1.jpg`, `{productId}_2.jpg`, etc.
5. Upload gallery images to `/public/images/products/gallery/` folder

## Featured Products

Featured products automatically use images from `/images/products/{productId}.{ext}`. This ensures:
- Same image appears in featured section and product listings
- Consistent image paths across the site
- Easy updates - change one image file, updates everywhere

## Image Path Examples

- Main image: `/images/products/wm-001.jpg`
- Gallery image 1: `/images/products/gallery/wm-001_1.jpg`
- Gallery image 2: `/images/products/gallery/wm-001_2.jpg`

## Notes

- Images are automatically referenced in `products.json` using the standardized path
- If an image is missing, the product will use a placeholder
- Always optimize images before uploading for better site performance
- Use JPG for photographs, PNG for images with transparency, WebP for best compression
