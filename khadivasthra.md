# Khadi Vasthra - Build Details & Documentation

## Project Overview

**Khadi Vasthra** is a modern ecommerce platform showcasing traditional Kerala handloom products, specifically Mundus and Dhotis. The website combines contemporary web technologies with traditional design aesthetics, featuring a maroon and cream color scheme that reflects the heritage of Kerala's textile industry.

**Established:** 1990  
**Location:** Aluva, Kerala  
**Focus:** Authentic Kerala Handloom - Mundus, Dhotis, and Traditional Attire

---

## Build Details

### Technology Stack

- **Framework:** Next.js 16.1.1 (App Router)
- **React:** 19.2.3
- **TypeScript:** 5.x
- **Styling:** Tailwind CSS 4.x
- **UI Components:** Custom components with Lucide React icons
- **State Management:** React Context API (CartContext)
- **Carousel:** Embla Carousel React 8.6.0
- **Build Tool:** Next.js built-in bundler (Webpack/Turbopack)
- **Package Manager:** npm
- **Backend:** PHP 8+ (Admin Panel)

### Key Dependencies

#### Production Dependencies
- `next`: 16.1.1 - React framework for production
- `react`: 19.2.3 - UI library
- `react-dom`: 19.2.3 - React DOM renderer
- `clsx`: ^2.1.1 - Utility for constructing className strings
- `lucide-react`: ^0.562.0 - Icon library
- `tailwind-merge`: ^3.4.0 - Merge Tailwind CSS classes
- `embla-carousel-react`: ^8.6.0 - Carousel component library

#### Development Dependencies
- `@tailwindcss/postcss`: ^4 - PostCSS plugin for Tailwind
- `@types/node`: ^20 - TypeScript types for Node.js
- `@types/react`: ^19 - TypeScript types for React
- `@types/react-dom`: ^19 - TypeScript types for React DOM
- `concurrently`: ^9.2.1 - Run multiple commands concurrently
- `eslint`: ^9 - Linting tool
- `eslint-config-next`: 16.1.1 - Next.js ESLint configuration
- `tailwindcss`: ^4 - Utility-first CSS framework
- `typescript`: ^5 - TypeScript compiler

### Build Commands

```bash
# Install dependencies
npm install

# Run development server (Next.js + PHP Admin)
# Next.js: http://localhost:3000
# PHP Admin: http://localhost:8080
npm run dev

# Run Next.js development server only
npm run dev:next

# Run PHP admin server only
npm run dev:php

# Check PHP installation
npm run check:php

# Build for production (Node.js server)
npm run build

# Build for static export (HTML files in /out folder)
npm run build:static

# Start production server
npm start

# Run linter
npm run lint
```

### Build Configuration

#### Next.js Configuration (`next.config.ts`)
- **Output Mode:** Static Export (`output: 'export'`)
- **Trailing Slash:** Enabled for better static hosting compatibility
- **Image Optimization:** Unoptimized (for static export)
- **Image Domains:** Supports `placehold.co` remote images
- **Webpack Configuration:** Custom module resolution for PostCSS/Tailwind
- **Turbopack:** Enabled for faster builds

**Key Features:**
- Static HTML export to `/out` directory
- All dynamic routes pre-rendered using `generateStaticParams`
- Images exported without optimization (can be optimized separately)
- Admin routes excluded from static export (requires PHP server)

#### TypeScript Configuration (`tsconfig.json`)
- **Target:** ES2017
- **Module:** ESNext
- **JSX:** React JSX
- **Path Aliases:** `@/*` → `./src/*`
- **Strict Mode:** Enabled

#### Tailwind Configuration
- **Version:** 4.x
- **PostCSS:** Integrated via `@tailwindcss/postcss`
- **Custom Colors:**
  - Primary: Coral/Pink (`#E8657B`)
  - Secondary: Cream (`#F5E6D3`)
  - Accent: Orange (`#F5A623`)
  - Text: Dark (`#1A1A1A`)
  - Text Muted: Gray

---

## Project Structure

```
Khadivasthra/
├── src/
│   ├── app/                          # Next.js App Router pages
│   │   ├── cart/                     # Shopping cart page
│   │   ├── contact/                  # Contact information page
│   │   ├── product/
│   │   │   └── [id]/
│   │   │       ├── layout.tsx        # Server component with generateStaticParams
│   │   │       └── page.tsx           # Individual product detail page (client)
│   │   ├── products/                 # Product listing pages
│   │   │   ├── [slug]/
│   │   │   │   ├── layout.tsx        # Server component with generateStaticParams
│   │   │   │   └── page.tsx           # Category-based product pages (client)
│   │   │   ├── layout.tsx            # Products layout with sidebar
│   │   │   └── page.tsx              # All products page
│   │   ├── globals.css               # Global styles
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Homepage
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Footer.tsx            # Site footer
│   │   │   └── Header.tsx            # Sticky header with scroll transitions
│   │   ├── product/
│   │   │   ├── ProductCard.tsx       # Product card component
│   │   │   └── ProductCarousel.tsx   # Embla carousel for products
│   │   └── ui/
│   │       └── button.tsx            # Reusable button component
│   ├── context/
│   │   └── CartContext.tsx           # Shopping cart state management
│   ├── data/
│   │   └── products.json             # Product catalog data
│   └── lib/
│       └── utils.ts                   # Utility functions (cn, etc.)
├── admin/                             # PHP Admin Panel
│   ├── api/                           # REST API endpoints
│   │   ├── auth.php                  # Authentication API
│   │   ├── categories.php            # Categories CRUD API
│   │   ├── products.php              # Products CRUD API
│   │   ├── settings.php              # Settings API
│   │   └── upload.php                # Image upload API
│   ├── data/                          # JSON data files
│   │   ├── categories.json
│   │   ├── products.json
│   │   └── settings.json
│   ├── includes/                      # PHP includes
│   │   ├── auth-check.php            # Authentication check
│   │   ├── config.php                # Configuration
│   │   └── functions.php             # Helper functions
│   ├── uploads/                       # Uploaded product images
│   ├── dashboard.php                  # Admin dashboard UI
│   └── index.php                     # Admin entry point
├── public/
│   └── images/                        # Static product images
│       ├── single-mundus/            # Single Mundu product images
│       └── [other product images]
├── out/                               # Static export output (generated)
├── .next/                             # Next.js build cache (generated)
├── eslint.config.mjs                  # ESLint configuration
├── next.config.ts                     # Next.js configuration
├── package.json                       # Project dependencies
├── postcss.config.mjs                 # PostCSS configuration
├── tailwind.config.ts                 # Tailwind CSS configuration
├── tsconfig.json                      # TypeScript configuration
└── .gitignore                         # Git ignore rules
```

---

## Features

### Core Functionality

1. **Product Catalog**
   - Category-based filtering (White Mundus, Single Mundus, etc.)
   - Price sorting (Low to High, High to Low, Featured)
   - Featured products showcase on homepage
   - Product search and filtering
   - Horizontal scrollable carousel with touchpad/mobile support

2. **Product Details**
   - High-resolution product images
   - Detailed product information
   - Material and care instructions
   - Product specifications
   - Related products suggestions
   - Quantity selector
   - Add to cart functionality

3. **Shopping Cart**
   - Local storage-based cart (no login required)
   - Add/remove items
   - Quantity management
   - Cart persistence across sessions
   - WhatsApp checkout integration

4. **Sticky Header with Scroll Animation**
   - Header initially hidden, appears on scroll
   - Hero logo scales up as user scrolls
   - Smooth transition to header logo
   - Logo appears in header when hero logo scrolls past ~80px
   - Dark background on scroll for logo visibility
   - Centered menu on desktop, responsive mobile layout

5. **Product Carousel**
   - Embla Carousel integration
   - Horizontal scrolling with touchpad support
   - Mobile touch gestures
   - Navigation arrows
   - Smooth animations
   - Drag-free scrolling

6. **WhatsApp Checkout**
   - Direct order placement via WhatsApp
   - Automatic cart summary generation
   - Customer-friendly order format
   - Pre-filled message with product details

7. **Responsive Design**
   - Mobile-first approach
   - Tablet and desktop optimized
   - Touch-friendly interactions
   - Responsive grid layouts

### Design Features

- **Color Scheme:** Coral/Pink (Primary), Cream (Secondary), Orange (Accent)
- **Typography:** Serif fonts for headings, sans-serif for body
- **UI Elements:** Modern cards, hover effects, smooth transitions
- **Hero Section:** Full-width banner with centered logo, badge, description, and CTA
- **Scroll Animations:** Logo scaling, header transitions, smooth scrolling
- **Trust Indicators:** Quality badges, delivery info, authenticity markers
- **Spacing:** Consistent 15px+ spacing between sections and elements

### Admin Panel Features

- **Product Management:** Add, edit, delete products with image uploads
- **Category Management:** Manage product categories
- **Featured Products:** Mark products as featured
- **Image Upload:** Upload product images (max 2MB, JPG/PNG/WebP/GIF)
- **CSRF Protection:** All forms protected with CSRF tokens
- **No Authentication:** Admin panel is freely accessible (can be secured)
- **JSON Storage:** No database required, uses JSON files

---

## Configuration & Customization

### Product Management

**Frontend Location:** `src/data/products.json`  
**Admin Panel Location:** `admin/data/products.json`

Add or modify products by editing the JSON structure:
```json
{
  "id": "unique-id",
  "name": "Product Name",
  "slug": "product-slug",
  "category": "Category Name",
  "price": 500,
  "comparePrice": 600,
  "description": "Short description",
  "longDescription": "Detailed description",
  "image": "/images/product-image.png",
  "images": ["/images/img1.png", "/images/img2.png"],
  "isFeatured": true,
  "isNew": false,
  "isBestSeller": false,
  "inStock": true,
  "details": {
    "material": "100% Cotton",
    "weave": "Handloom",
    "fit": "Regular Fit",
    "pattern": "Solid/Plain",
    "origin": "Aluva, Kerala",
    "dimensions": "2.0m x 1.25m"
  },
  "careInstructions": [
    "Hand wash separately in cold water",
    "Do not wring forcefully"
  ]
}
```

### Contact Information

Update contact details in:
- `src/app/contact/page.tsx` - Contact page
- `src/components/layout/Footer.tsx` - Footer section

### WhatsApp Integration

**Location:** `src/app/cart/page.tsx`

Update the WhatsApp number in the checkout function:
```typescript
const whatsappNumber = "YOUR_WHATSAPP_NUMBER";
```

### Images

- Place product images in `public/images/`
- Single Mundus images: `public/images/single-mundus/`
- Update image paths in `products.json` to match (e.g., `/images/single-mundus/Product Name.png`)
- Supported formats: PNG, JPG, WebP
- Recommended size: 800x1000px for product images
- Max upload size: 2MB (admin panel)

### Styling Customization

**Color Scheme:** Edit `tailwind.config.ts` or `src/app/globals.css`
- Primary: Coral (`#E8657B`)
- Secondary: Cream (`#F5E6D3`)
- Accent: Orange (`#F5A623`)
- Text: Dark (`#1A1A1A`)

**Hero Section:**
- Logo size: Adjustable via width/height props
- Description width: Currently 30% of container
- Badge text: "Est. 1990"
- Button: Pink coral background with white text

**Header:**
- Height: 80px (sticky)
- Logo appears on scroll when hero logo passes ~80px from top
- Dark background on scroll for visibility

---

## Development Guidelines

### Code Style

- **TypeScript:** Strict mode enabled
- **ESLint:** Next.js recommended rules
- **Components:** Functional components with TypeScript
- **Naming:** PascalCase for components, camelCase for functions/variables
- **Client Components:** Marked with `"use client"` directive
- **Server Components:** Default (no directive) for layouts with `generateStaticParams`

### Best Practices

1. **Image Optimization:** Use Next.js `Image` component for all images
2. **Performance:** Leverage Next.js automatic code splitting
3. **SEO:** Use semantic HTML and proper meta tags
4. **Accessibility:** Include alt text for images, proper ARIA labels
5. **State Management:** Use Context API for global state (cart)
6. **Static Export:** Use `generateStaticParams` in layout files for dynamic routes
7. **Scroll Behavior:** Implement smooth scroll with CSS `scroll-behavior: smooth`

### Adding New Features

1. **New Page:** Create directory in `src/app/` with `page.tsx`
2. **New Component:** Add to `src/components/` with appropriate subdirectory
3. **New Route:** Use Next.js App Router file-based routing
4. **Dynamic Route:** Create `layout.tsx` with `generateStaticParams` for static export
5. **Styling:** Use Tailwind utility classes, add custom styles in `globals.css` if needed

---

## Deployment

### Build for Production

#### Static Export (Recommended for public_html)

```bash
# Build static HTML files
npm run build:static

# Output will be in /out directory
# Copy contents of /out to your public_html folder
```

**Static Export Features:**
- All pages pre-rendered as static HTML
- Dynamic routes generated via `generateStaticParams`
- No Node.js server required
- Can be hosted on any static hosting service
- Admin panel requires separate PHP server

#### Node.js Server Build

```bash
# Build for Node.js server
npm run build

# Start production server
npm start
```

**Server Build Features:**
- Requires Node.js runtime
- Server-side rendering for dynamic routes
- Can integrate with admin panel via proxy

### Environment Variables

Currently, no environment variables are required. If needed in the future:
- Create `.env.local` for local development
- Add variables to `.env.production` for production
- Reference in code using `process.env.VARIABLE_NAME`

### Deployment Platforms

**Static Hosting (Recommended):**
- **Any static host:** Upload `/out` folder contents
- **GitHub Pages:** Deploy from `/out` folder
- **Netlify:** Automatic deployment from Git
- **Vercel:** Optimal for Next.js (supports both static and server)

**Server Hosting:**
- **Vercel:** Automatic deployments, zero config
- **Netlify:** Good alternative with Next.js support
- **Self-hosted:** Requires Node.js server setup
- **Docker:** Containerized deployment

### Admin Panel Deployment

The admin panel requires PHP 8+ and should be deployed separately:

```bash
# Start PHP server locally
php -S localhost:8080 -t admin

# Or configure web server (Apache/Nginx) to serve admin/ directory
```

**Admin Panel Access:**
- Default: No authentication (can be enabled)
- Dashboard: `http://yourdomain.com/admin/dashboard.php`
- API: `http://yourdomain.com/admin/api/`

### Production Checklist

- [ ] Build static export: `npm run build:static`
- [ ] Copy `/out` contents to `public_html`
- [ ] Update WhatsApp number in cart page
- [ ] Verify all product images are uploaded
- [ ] Update contact information
- [ ] Test all navigation links
- [ ] Verify cart functionality
- [ ] Test WhatsApp checkout flow
- [ ] Optimize images (compress if needed)
- [ ] Test responsive design on multiple devices
- [ ] Verify SEO meta tags
- [ ] Test performance (Lighthouse)
- [ ] Verify header scroll animations
- [ ] Test product carousel scrolling
- [ ] Deploy admin panel separately (if needed)

---

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Performance

- **Next.js Automatic Optimizations:**
  - Static HTML generation
  - Code splitting
  - Image optimization (when not using static export)
  - Font optimization

- **Static Export Optimizations:**
  - All pages pre-rendered
  - No JavaScript required for initial render
  - Fast page loads
  - SEO-friendly

- **Recommended:**
  - Use Next.js Image component for all images
  - Implement lazy loading for below-fold content
  - Minimize JavaScript bundle size
  - Compress images before upload
  - Use CDN for static assets

---

## Admin Panel

### Features

- **Product Management:** Full CRUD operations
- **Category Management:** Create and manage categories
- **Featured Products:** Mark products as featured
- **Image Upload:** Drag-and-drop image uploads
- **JSON Storage:** No database required
- **CSRF Protection:** Secure form submissions
- **Responsive UI:** Works on mobile and desktop

### Access

- **URL:** `/admin/dashboard.php`
- **Authentication:** Currently disabled (can be enabled in `admin/includes/config.php`)
- **Default Password:** `admin123` (change immediately in production)

### API Endpoints

- `GET /admin/api/products.php` - List all products
- `POST /admin/api/products.php` - Create product
- `PUT /admin/api/products.php` - Update product
- `DELETE /admin/api/products.php` - Delete product
- `GET /admin/api/categories.php` - List categories
- `POST /admin/api/categories.php` - Create category
- `POST /admin/api/upload.php` - Upload image

### Setup

1. Ensure PHP 8+ is installed
2. Set proper file permissions:
   ```bash
   chmod 755 admin/
   chmod 755 admin/data/
   chmod 755 admin/uploads/
   chmod 644 admin/data/*.json
   ```
3. Change default password in `admin/includes/config.php`
4. Start PHP server: `php -S localhost:8080 -t admin`

---

## Support & Maintenance

### Regular Updates

1. **Dependencies:** Keep Next.js and React updated
2. **Products:** Regularly update `products.json` with new items via admin panel
3. **Images:** Optimize and compress product images
4. **Content:** Update homepage copy and featured products
5. **Security:** Keep PHP updated if using admin panel

### Troubleshooting

- **Build Errors:** Check TypeScript errors with `npm run lint`
- **Image Issues:** Verify image paths and Next.js image configuration
- **Cart Issues:** Check browser localStorage support
- **Styling Issues:** Verify Tailwind classes and custom CSS
- **Static Export Issues:** Ensure `generateStaticParams` in layout files
- **Admin Panel Issues:** Check PHP version and file permissions
- **Scroll Issues:** Verify `scroll-behavior: smooth` in globals.css

### Common Issues

1. **Static Export Fails:** Ensure all dynamic routes have `generateStaticParams` in layout files
2. **Admin Panel Not Loading:** Check PHP server is running on port 8080
3. **Images Not Loading:** Verify paths in `products.json` match actual file locations
4. **Carousel Not Scrolling:** Check Embla Carousel configuration and touch events

---

## License

Private project - All rights reserved

---

## Contact

For technical support or questions about this build:
- Review the codebase documentation
- Check Next.js documentation: https://nextjs.org/docs
- Check Tailwind CSS documentation: https://tailwindcss.com/docs
- Check Embla Carousel documentation: https://www.embla-carousel.com/

---

*Last Updated: January 2025*  
*Build Version: 0.1.0*  
*Next.js Version: 16.1.1*  
*React Version: 19.2.3*
