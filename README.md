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

2. Run the development server (starts both Next.js and PHP backend):
   ```bash
   npm run dev
   ```
   
   This command automatically starts:
   - **Next.js Frontend**: http://localhost:3000
   - **PHP Backend (Admin)**: http://localhost:8080

3. Open [http://localhost:3000](http://localhost:3000) with your browser.

## Development Scripts

- `npm run dev` - Starts both Next.js and PHP backend servers together
- `npm run dev:next` - Starts only the Next.js frontend server
- `npm run dev:backend` - Starts only the PHP backend server (requires PHP installed)

**Note**: If PHP is not installed, the backend will show an error but the frontend will still run. To install PHP:
- **Ubuntu/Debian**: `sudo apt install php-cli`
- **Fedora/RHEL**: `sudo dnf install php-cli`
- **Windows**: Install XAMPP or add PHP to your PATH

## Customization

- **Products**: Edit `src/data/products.json` to add or modify products.
- **Contact Info**: Update `src/app/contact/page.tsx` and `src/components/layout/Footer.tsx`.
- **WhatsApp Number**: Update the phone number in `src/app/cart/page.tsx`.

## Images

Place your product images in `public/images/`. Update the `image` paths in `src/data/products.json` to match (e.g., `/images/my-mundu.jpg`).
Currently, the app uses `placehold.co` for demo images if local images are missing.
