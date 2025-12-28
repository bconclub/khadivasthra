# Khadi Vasthra Ecommerce

A Next.js 14 ecommerce website for Khadi Vasthra, featuring a traditional design, product catalog, and WhatsApp checkout integration.

## Features

- **Next.js 14 App Router**: Modern and fast.
- **Tailwind CSS**: Custom Maroon & Cream design system.
- **Product Catalog**: Filter by category, sort by price.
- **Product Details**: Image, description, related products.
- **Cart System**: Local storage based cart (no login required).
- **WhatsApp Checkout**: Direct order placement via WhatsApp.
- **Responsive**: Mobile-friendly design.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) with your browser.

## Customization

- **Products**: Edit `src/data/products.json` to add or modify products.
- **Contact Info**: Update `src/app/contact/page.tsx` and `src/components/layout/Footer.tsx`.
- **WhatsApp Number**: Update the phone number in `src/app/cart/page.tsx`.

## Images

Place your product images in `public/images/`. Update the `image` paths in `src/data/products.json` to match (e.g., `/images/my-mundu.jpg`).
Currently, the app uses `placehold.co` for demo images if local images are missing.
