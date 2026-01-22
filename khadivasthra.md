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
- **Build Tool:** Next.js built-in bundler
- **Package Manager:** npm

### Key Dependencies

#### Production Dependencies
- `next`: 16.1.1 - React framework for production
- `react`: 19.2.3 - UI library
- `react-dom`: 19.2.3 - React DOM renderer
- `clsx`: ^2.1.1 - Utility for constructing className strings
- `lucide-react`: ^0.562.0 - Icon library
- `tailwind-merge`: ^3.4.0 - Merge Tailwind CSS classes
- `embla-carousel-react`: ^8.6.0 - Carousel component library for product showcases

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

# Run development servers (starts both Next.js and PHP backend)
npm run dev
# - Next.js Frontend: http://localhost:3000
# - PHP Backend (Admin): http://localhost:8080

# Run only Next.js frontend
npm run dev:next

# Run only PHP backend (requires PHP installed)
npm run dev:backend

# Check if PHP is installed
npm run check:php

# Build for production (static export)
npm run build

# Build static export
npm run build:static

# Start production server
npm start

# Run linter
npm run lint
```

### Build Configuration

#### Next.js Configuration (`next.config.ts`)
- **Output Mode:** Static export (`output: 'export'`)
- **Trailing Slash:** Enabled for static hosting compatibility
- **Image Optimization:** Unoptimized (for static export)
- **Image Domains:** Supports `placehold.co` remote images
- **Webpack Configuration:** Custom module resolution for Tailwind CSS 4.x

#### TypeScript Configuration (`tsconfig.json`)
- **Target:** ES2017
- **Module:** ESNext
- **JSX:** React JSX
- **Path Aliases:** `@/*` → `./src/*`
- **Strict Mode:** Enabled

#### Tailwind Configuration
- **Version:** 4.x
- **PostCSS:** Integrated via `@tailwindcss/postcss`
- **Custom Colors:** Primary (Maroon), Secondary (Cream), Accent (Gold/Saffron)

---

## Project Structure

```
Khadivasthra/
├── admin/                      # PHP Admin Panel (Backend)
│   ├── api/                   # REST API endpoints
│   │   ├── auth.php           # Authentication API
│   │   ├── categories.php     # Categories CRUD API
│   │   ├── products.php       # Products CRUD API
│   │   ├── settings.php       # Settings API
│   │   └── upload.php         # Image upload API
│   ├── data/                  # JSON data storage
│   │   ├── products.json      # Product data
│   │   ├── categories.json    # Category data
│   │   └── settings.json      # Site settings
│   ├── includes/              # PHP includes
│   │   ├── auth-check.php     # Authentication check
│   │   ├── config.php         # Configuration & password
│   │   └── functions.php      # Helper functions
│   ├── uploads/               # Uploaded product images
│   ├── dashboard.php          # Admin panel UI
│   ├── index.php              # Admin login page
│   └── *.md                   # Admin documentation
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── cart/              # Shopping cart page
│   │   ├── contact/           # Contact information page
│   │   ├── product/[id]/      # Individual product detail page
│   │   ├── products/          # Product listing pages
│   │   │   ├── [slug]/        # Category-based product pages
│   │   │   └── layout.tsx     # Products layout
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Homepage
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Footer.tsx     # Site footer
│   │   │   └── Header.tsx     # Site header/navigation
│   │   ├── product/
│   │   │   ├── ProductCard.tsx      # Product card component
│   │   │   └── ProductCarousel.tsx  # Product carousel component
│   │   └── ui/
│   │       └── button.tsx     # Reusable button component
│   ├── context/
│   │   └── CartContext.tsx    # Shopping cart state management
│   ├── data/
│   │   └── products.json      # Product catalog data (fallback)
│   └── lib/
│       └── utils.ts           # Utility functions
├── scripts/                   # Development scripts
│   ├── start-backend.js       # Node script to start PHP server
│   └── start-backend.sh       # Shell script to start PHP server
├── public/                    # Static assets
│   ├── api/                   # PHP API endpoints (for production)
│   ├── data/                  # JSON data (synced from admin)
│   └── images/                # Product images
├── out/                       # Static export output (after build)
│   ├── index.html            # Homepage
│   ├── 404.html              # Error page
│   ├── _next/                # Next.js compiled assets
│   ├── api/                  # PHP API files (auth.php, products.php, etc.)
│   ├── admin/                # Admin frontend pages (HTML)
│   ├── cart/                 # Cart page
│   ├── contact/              # Contact page
│   ├── products/             # Product listing pages
│   ├── product/              # Individual product pages
│   ├── images/               # Product images
│   ├── data/                 # JSON data files
│   └── ...                   # All other static files
├── eslint.config.mjs          # ESLint configuration
├── next.config.ts             # Next.js configuration
├── package.json               # Project dependencies
├── postcss.config.mjs         # PostCSS configuration
├── tailwind.config.ts         # Tailwind CSS configuration
└── tsconfig.json              # TypeScript configuration
```

---

## Features

### Core Functionality

1. **Product Catalog**
   - Category-based filtering (White Mundus, Colored Mundus, Dhotis)
   - Price sorting (Low to High, High to Low)
   - Featured products showcase
   - Product search and filtering

2. **Product Details**
   - High-resolution product images
   - Detailed product information
   - Material and care instructions
   - Related products suggestions

3. **Shopping Cart**
   - Local storage-based cart (no login required)
   - Add/remove items
   - Quantity management
   - Cart persistence across sessions

4. **WhatsApp Checkout**
   - Direct order placement via WhatsApp
   - Automatic cart summary generation
   - Customer-friendly order format

5. **Admin Panel (PHP Backend)**
   - Product management (CRUD operations)
   - Category management
   - Site settings configuration
   - Image upload functionality
   - Password-protected admin access
   - JSON-based data storage (no database required)
   - RESTful API endpoints

6. **Product Carousel**
   - Featured products showcase using Embla Carousel
   - Smooth scrolling and navigation
   - Responsive design

7. **Responsive Design**
   - Mobile-first approach
   - Tablet and desktop optimized
   - Touch-friendly interactions

### Design Features

- **Color Scheme:** Maroon (Primary), Cream (Secondary), Gold/Saffron (Accent)
- **Typography:** Serif fonts for headings, sans-serif for body
- **UI Elements:** Modern cards, hover effects, smooth transitions
- **Hero Section:** Full-width banner with call-to-action
- **Product Carousels:** Featured and trending products with Embla Carousel
- **Instagram Integration:** Embedded Instagram posts showcase
- **Trust Indicators:** Quality badges, delivery info, authenticity markers

### Backend Features

- **PHP Admin Panel:** Password-protected admin interface
- **RESTful API:** JSON-based API for product, category, and settings management
- **Image Upload:** Secure image upload with validation (max 2MB, JPG/PNG/WebP/GIF)
- **CSRF Protection:** All forms protected with CSRF tokens
- **Session Management:** 30-minute session timeout
- **CORS Enabled:** Configured for Next.js frontend integration
- **No Database Required:** JSON file-based data storage

---

## Configuration & Customization

### Product Management

**Option 1: Admin Panel (Recommended)**
- Access admin panel at: `http://localhost:8080` (development) or `https://yourdomain.com/admin/` (production)
- Default password: `admin123` (change immediately!)
- Use the admin dashboard to add, edit, or delete products with image uploads
- Changes are saved to `admin/data/products.json`

**Option 2: Manual JSON Editing**

**Location:** `src/data/products.json` (fallback) or `admin/data/products.json` (primary)

Add or modify products by editing the JSON structure:
```json
{
  "id": "unique-id",
  "name": "Product Name",
  "category": "Category Name",
  "price": 500,
  "description": "Short description",
  "image": "/images/product-image.png",
  "isFeatured": true,
  "details": { ... },
  "careInstructions": [ ... ],
  "longDescription": "Detailed description"
}
```

### Contact Information

Update contact details in:
- `src/app/contact/page.tsx` - Contact page
- `src/components/layout/Footer.tsx` - Footer section

### Admin Panel Configuration

**Location:** `admin/includes/config.php`

1. **Change Default Password:**
   ```php
   // Default password is "admin123"
   // Generate a new hash:
   // php -r "echo password_hash('your_new_password', PASSWORD_DEFAULT);"
   define('ADMIN_PASSWORD_HASH', 'your_new_hash_here');
   ```

2. **Update Settings:**
   - Access admin panel and go to Settings
   - Or edit `admin/data/settings.json` directly:
   ```json
   {
     "storeName": "Khadi Vasthra",
     "whatsapp": "91XXXXXXXXXX",
     "address": "Kurumassery, Aluva, Ernakulam",
     "email": "contact@khadivasthra.com",
     "instagram": "khadivasthra"
   }
   ```

### WhatsApp Integration

**Location:** `src/app/cart/page.tsx` or `admin/data/settings.json`

Update the WhatsApp number:
- In admin panel: Settings section
- Or in code: Update the WhatsApp number in the checkout function:
```typescript
const whatsappNumber = "YOUR_WHATSAPP_NUMBER";
```

### Images

- **Logo:** `/public/Khadi Vasthra White Transparnt.png` - Used on homepage, contact page, header, footer
- **Hero Cover:** `/public/Cover KV.webp` - Homepage hero background
- **Product Images:** Place in `public/images/products/` or category folders
- Update image paths in `products.json` to match (e.g., `/images/my-mundu.jpg`)
- Supported formats: PNG, JPG, WebP
- Recommended size: 800x1000px for product images

**For detailed image usage documentation, see:** `IMAGE_USAGE.md`

### Styling Customization

**Color Scheme:** Edit `tailwind.config.ts` or `globals.css`
- Primary: Maroon (#8B0000 or similar)
- Secondary: Cream (#F5E6D3 or similar)
- Accent: Gold/Saffron (#FFD700 or similar)

---

## Development Guidelines

### Code Style

- **TypeScript:** Strict mode enabled
- **ESLint:** Next.js recommended rules
- **Components:** Functional components with TypeScript
- **Naming:** PascalCase for components, camelCase for functions/variables

### Best Practices

1. **Image Optimization:** Use Next.js `Image` component for all images
2. **Performance:** Leverage Next.js automatic code splitting
3. **SEO:** Use semantic HTML and proper meta tags
4. **Accessibility:** Include alt text for images, proper ARIA labels
5. **State Management:** Use Context API for global state (cart)

### Adding New Features

1. **New Page:** Create directory in `src/app/` with `page.tsx`
2. **New Component:** Add to `src/components/` with appropriate subdirectory
3. **New Route:** Use Next.js App Router file-based routing
4. **Styling:** Use Tailwind utility classes, add custom styles in `globals.css` if needed

---

## Backend API Documentation

### Admin Panel Access

- **Development:** `http://localhost:8080`
- **Production:** `https://yourdomain.com/admin/`
- **Default Password:** `admin123` (CHANGE IMMEDIATELY!)

### API Endpoints

All API endpoints are located in `admin/api/` and return JSON responses.

#### Authentication (`/admin/api/auth.php`)
- `POST` with `action=login` - Login with password
- `POST` with `action=logout` - Logout
- `POST` with `action=check` - Check authentication status

#### Products (`/admin/api/products.php`)
- `GET` - List all products
- `POST` - Add new product
- `POST` with `_method=PUT` - Update product
- `POST` with `_method=DELETE` - Delete product

#### Categories (`/admin/api/categories.php`)
- `GET` - List all categories
- `POST` - Add new category
- `POST` with `_method=PUT` - Update category
- `POST` with `_method=DELETE` - Delete category

#### Settings (`/admin/api/settings.php`)
- `GET` - Get site settings
- `POST` - Update settings

#### Upload (`/admin/api/upload.php`)
- `POST` - Upload image (returns file path)

### PHP Requirements

- **PHP Version:** 8.0 or higher
- **Extensions:** JSON (standard), GD (for image processing, optional)
- **Permissions:** Write access to `admin/data/` and `admin/uploads/` directories

## Deployment

### Build for Production

```bash
npm run build
```

This creates a static export in the `out/` directory (Next.js static export mode).

**Note:** The `out/` folder contains:
- All static HTML, CSS, and JavaScript files (Next.js frontend)
- PHP API files in `out/api/` (auth.php, categories.php, products.php, upload.php)
- All images and assets from `public/`
- JSON data files

### Deploy to Shared Server (public_html)

For shared hosting (like cPanel, Hostinger, etc.), upload the following to `public_html/`:

#### Step 1: Upload Next.js Frontend

**Upload ALL contents from the `out/` folder to `public_html/` root:**

```
public_html/
├── index.html                    ← Main homepage
├── 404.html                     ← Error page
├── favicon.ico                  ← Site icon
├── _next/                       ← Next.js assets (JS, CSS)
│   ├── static/                  ← Compiled JavaScript & CSS
│   └── ...
├── admin/                       ← Admin page (frontend HTML)
├── cart/                        ← Cart page
├── contact/                     ← Contact page
├── products/                    ← Products listing pages
├── product/                     ← Individual product pages
├── api/                         ← PHP API files (from out/api/)
│   ├── auth.php
│   ├── categories.php
│   ├── products.php
│   └── upload.php
├── images/                      ← All product images
├── data/                        ← JSON data files
│   ├── categories.json
│   └── products.json
├── Cover KV.webp               ← Cover image
├── KV Logo Colour.webp         ← Logo
└── ... (all other files from out/)
```

**Important:** Upload the **contents** of `out/` folder to `public_html/`, not the `out/` folder itself!

#### Step 2: Upload Admin Backend (PHP)

**Upload the entire `admin/` folder to `public_html/admin/`:**

```
public_html/admin/
├── api/                         ← PHP API endpoints (full backend)
│   ├── auth.php
│   ├── categories.php
│   ├── products.php
│   ├── settings.php
│   └── upload.php
├── data/                        ← Data storage (must be writable - 755)
│   ├── categories.json
│   ├── products.json
│   └── settings.json
├── includes/                    ← PHP includes
│   ├── config.php               ← Configuration & password
│   ├── auth-check.php
│   └── functions.php
├── uploads/                     ← Image uploads (must be writable - 755)
├── index.php                    ← Admin login page
├── dashboard.php                ← Admin dashboard
└── ... (all other admin files)
```

**File Permissions Required:**
- `admin/data/` folder → **755** (writable)
- `admin/uploads/` folder → **755** (writable)
- `admin/data/*.json` files → **644** (readable/writable)
- All PHP files → **644** (readable)

#### Step 3: Post-Deployment Setup

1. **Change Default Password:**
   - Generate hash: `php -r "echo password_hash('your_password', PASSWORD_DEFAULT);"`
   - Update `public_html/admin/includes/config.php`:
     ```php
     define('ADMIN_PASSWORD_HASH', 'your_new_hash_here');
     ```

2. **Verify PHP Version:**
   - Server must have PHP 8.0 or higher
   - Check in cPanel or via `php -v`

3. **Test Access:**
   - Frontend: `https://yourdomain.com/`
   - Admin Panel: `https://yourdomain.com/admin/`
   - Admin Login: Use your new password

### Deploy Frontend (Next.js) - Alternative Hosting

The frontend is exported as static files in the `out/` directory. Deploy to:
- **Vercel:** Optimal for Next.js (automatic deployments)
- **Netlify:** Good alternative with Next.js support
- **Static Hosting:** Any static hosting service (GitHub Pages, AWS S3, etc.)
- **Shared Hosting:** Upload `out/` contents to `public_html/` (see above)

### Deploy Backend (PHP Admin Panel) - Standalone

If deploying admin separately:

1. **Upload `admin/` folder** to your web server
2. **Set file permissions:**
   ```bash
   chmod 755 admin/data
   chmod 755 admin/uploads
   chmod 644 admin/data/*.json
   ```
3. **Change default password** in `admin/includes/config.php`
4. **Configure CORS** if frontend is on a different domain
5. **Ensure PHP 8+** is installed on the server

### Development Server Setup

For local development, the `npm run dev` command automatically starts both:
- Next.js frontend on port 3000
- PHP backend on port 8080

If PHP is not installed:
- **Ubuntu/Debian:** `sudo apt install php-cli`
- **Fedora/RHEL:** `sudo dnf install php-cli`
- **Windows:** Install XAMPP or add PHP to PATH
- **macOS:** `brew install php`

### Environment Variables

Currently, no environment variables are required for the Next.js frontend. The backend uses PHP configuration files instead.

If needed in the future:
- Create `.env.local` for local development
- Add variables to `.env.production` for production
- Reference in code using `process.env.VARIABLE_NAME`

### Deployment Platforms

**Frontend (Next.js Static Export):**
- **Vercel:** Optimal for Next.js (automatic deployments)
- **Netlify:** Good alternative with Next.js support
- **GitHub Pages:** Free static hosting
- **AWS S3/CloudFront:** Scalable static hosting
- **Any Static Host:** Copy `out/` directory to any web server

**Backend (PHP Admin Panel):**
- **Shared Hosting:** Most shared hosting providers (cPanel, Hostinger, Bluehost)
- **VPS:** DigitalOcean, Linode, AWS EC2
- **Platform as a Service:** Heroku (with PHP buildpack), Railway, Render
- **Self-hosted:** Any server with PHP 8+ and Apache/Nginx

### Production Checklist

**Frontend:**
- [ ] Build static export: `npm run build`
- [ ] Upload all contents from `out/` to `public_html/`
- [ ] Verify all product images are accessible
- [ ] Update contact information in settings
- [ ] Test all navigation links
- [ ] Verify cart functionality
- [ ] Test WhatsApp checkout flow
- [ ] Optimize images (compress if needed)
- [ ] Test responsive design on multiple devices
- [ ] Verify SEO meta tags
- [ ] Test performance (Lighthouse)

**Backend:**
- [ ] Upload entire `admin/` folder to `public_html/admin/`
- [ ] Set `admin/data/` folder permissions to 755
- [ ] Set `admin/uploads/` folder permissions to 755
- [ ] Set `admin/data/*.json` files permissions to 644
- [ ] Change default admin password in `admin/includes/config.php`
- [ ] Verify PHP version (8.0+)
- [ ] Test admin panel login at `https://yourdomain.com/admin/`
- [ ] Test product CRUD operations
- [ ] Test image upload functionality
- [ ] Configure CORS for production domain (if needed)
- [ ] Enable HTTPS (recommended)
- [ ] Set up regular backups of `admin/data/` directory
- [ ] Test API endpoints (`/api/products.php`, etc.)

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
  - Image optimization
  - Code splitting
  - Static generation where possible
  - Font optimization

- **Recommended:**
  - Use Next.js Image component for all images
  - Implement lazy loading for below-fold content
  - Minimize JavaScript bundle size

---

## Support & Maintenance

### Regular Updates

1. **Dependencies:** Keep Next.js, React, and PHP updated
2. **Products:** Use admin panel to add/edit products (or update JSON files)
3. **Images:** Optimize and compress product images before upload
4. **Content:** Update homepage copy and featured products via admin panel
5. **Backups:** Regularly backup `admin/data/` directory

### Troubleshooting

**Frontend Issues:**
- **Build Errors:** Check TypeScript errors with `npm run lint`
- **Image Issues:** Verify image paths and Next.js image configuration
- **Cart Issues:** Check browser localStorage support
- **Styling Issues:** Verify Tailwind classes and custom CSS

**Backend Issues:**
- **Admin Panel Not Loading:** Check if PHP server is running (port 8080 in development)
- **Permission Errors:** Ensure `admin/data/` and `admin/uploads/` are writable (755)
- **Login Not Working:** Verify password hash in `admin/includes/config.php`
- **Image Upload Fails:** Check file size (max 2MB) and permissions on `admin/uploads/`
- **API Returns 401:** Check if session is expired (30 minutes) or if you're logged in
- **CORS Errors:** Verify CORS configuration in `admin/includes/config.php`

**Development Setup:**
- **PHP Not Found:** Install PHP CLI or use XAMPP/WAMP
- **Port Already in Use:** Change port in `scripts/start-backend.js` or package.json
- **Both Servers Not Starting:** Use `npm run dev` which uses `concurrently` to start both

---

## License

Private project - All rights reserved

---

## Contact

For technical support or questions about this build:
- Review the codebase documentation
- Check Next.js documentation: https://nextjs.org/docs
- Check Tailwind CSS documentation: https://tailwindcss.com/docs

---

## Additional Documentation

For more detailed information, see:
- `README.md` - Quick start guide
- `DEPLOY_TO_SHARED_SERVER.md` - **Complete guide for deploying to shared hosting (public_html)**
- `IMAGE_USAGE.md` - Complete image usage and location documentation
- `admin/README.md` - Admin panel documentation
- `admin/README_ACCESS.md` - How to access admin panel
- `admin/DEPLOY_ONLINE.md` - Backend deployment guide
- `admin/DEPLOY_QUICK_GUIDE.md` - Quick deployment guide
- `admin/DEPLOY_CHECKLIST.md` - Deployment checklist
- `admin/QUICK_START.md` - Quick setup guide

---

*Last Updated: December 2024*
*Build Version: 0.1.0*
*Framework: Next.js 16.1.1 (Static Export)*
*Backend: PHP 8.0+ (JSON-based, no database)*

---

## Current Build Structure (Truth)

### Build Output (`out/` folder):
- **Next.js Static Export:** All HTML, CSS, JavaScript compiled files
- **PHP API Files:** Located in `out/api/` (auth.php, products.php, categories.php, upload.php)
- **Images:** All product images from `public/images/` copied to `out/images/`
- **Data:** JSON files copied to `out/data/`
- **Pages:** All Next.js pages exported as static HTML in respective folders

### Admin Backend (`admin/` folder):
- **Full PHP Admin Panel:** Complete admin interface with login, dashboard, CRUD operations
- **PHP API Endpoints:** Located in `admin/api/` (more complete than `out/api/`)
- **Data Storage:** JSON files in `admin/data/` (primary data source)
- **Image Uploads:** `admin/uploads/` for product images uploaded via admin panel

### Deployment to Shared Server:
1. **Upload `out/` contents** → `public_html/` (frontend + API files)
2. **Upload `admin/` folder** → `public_html/admin/` (full admin backend)
3. **Set permissions:** `admin/data/` and `admin/uploads/` → 755
4. **Change password:** Update `admin/includes/config.php`
5. **Test:** Visit `https://yourdomain.com/` and `https://yourdomain.com/admin/`

**See `DEPLOY_TO_SHARED_SERVER.md` for detailed step-by-step instructions.**



