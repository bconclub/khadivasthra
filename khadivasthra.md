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

#### Development Dependencies
- `@tailwindcss/postcss`: ^4 - PostCSS plugin for Tailwind
- `@types/node`: ^20 - TypeScript types for Node.js
- `@types/react`: ^19 - TypeScript types for React
- `@types/react-dom`: ^19 - TypeScript types for React DOM
- `eslint`: ^9 - Linting tool
- `eslint-config-next`: 16.1.1 - Next.js ESLint configuration
- `tailwindcss`: ^4 - Utility-first CSS framework
- `typescript`: ^5 - TypeScript compiler

### Build Commands

```bash
# Install dependencies
npm install

# Run development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

### Build Configuration

#### Next.js Configuration (`next.config.ts`)
- **Image Optimization:** Configured for `placehold.co` remote images
- **Image Domains:** Supports external image hosting

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
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── cart/              # Shopping cart page
│   │   ├── contact/            # Contact information page
│   │   ├── product/[id]/      # Individual product detail page
│   │   ├── products/           # Product listing pages
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
│   │   │   └── ProductCard.tsx # Product card component
│   │   └── ui/
│   │       └── button.tsx     # Reusable button component
│   ├── context/
│   │   └── CartContext.tsx    # Shopping cart state management
│   ├── data/
│   │   └── products.json      # Product catalog data
│   └── lib/
│       └── utils.ts           # Utility functions
├── public/
│   └── images/                # Product images
│       ├── mundu-white.png
│       ├── mundu-gold.png
│       ├── mundu-saffron.png
│       ├── mundu-pink.png
│       └── mundu-black.png
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

5. **Responsive Design**
   - Mobile-first approach
   - Tablet and desktop optimized
   - Touch-friendly interactions

### Design Features

- **Color Scheme:** Maroon (Primary), Cream (Secondary), Gold/Saffron (Accent)
- **Typography:** Serif fonts for headings, sans-serif for body
- **UI Elements:** Modern cards, hover effects, smooth transitions
- **Hero Section:** Full-width banner with call-to-action
- **Instagram Integration:** Embedded Instagram posts showcase
- **Trust Indicators:** Quality badges, delivery info, authenticity markers

---

## Configuration & Customization

### Product Management

**Location:** `src/data/products.json`

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

### WhatsApp Integration

**Location:** `src/app/cart/page.tsx`

Update the WhatsApp number in the checkout function:
```typescript
const whatsappNumber = "YOUR_WHATSAPP_NUMBER";
```

### Images

- Place product images in `public/images/`
- Update image paths in `products.json` to match (e.g., `/images/my-mundu.jpg`)
- Supported formats: PNG, JPG, WebP
- Recommended size: 800x1000px for product images

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

## Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `.next` directory.

### Environment Variables

Currently, no environment variables are required. If needed in the future:
- Create `.env.local` for local development
- Add variables to `.env.production` for production
- Reference in code using `process.env.VARIABLE_NAME`

### Deployment Platforms

**Recommended:**
- **Vercel:** Optimal for Next.js (automatic deployments)
- **Netlify:** Good alternative with Next.js support
- **Self-hosted:** Requires Node.js server setup

### Production Checklist

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

1. **Dependencies:** Keep Next.js and React updated
2. **Products:** Regularly update `products.json` with new items
3. **Images:** Optimize and compress product images
4. **Content:** Update homepage copy and featured products

### Troubleshooting

- **Build Errors:** Check TypeScript errors with `npm run lint`
- **Image Issues:** Verify image paths and Next.js image configuration
- **Cart Issues:** Check browser localStorage support
- **Styling Issues:** Verify Tailwind classes and custom CSS

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

*Last Updated: 2024*
*Build Version: 0.1.0*



