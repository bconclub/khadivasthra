// Meta Pixel (Facebook Pixel) event helper
// Safely calls fbq() which is loaded via script tag in layout.tsx

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function fbq(...args: unknown[]) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq(...args);
  }
}

/** Product page viewed */
export function trackViewContent(product: { id: string; name: string; price: number; category?: string }) {
  fbq('track', 'ViewContent', {
    content_ids: [product.id],
    content_name: product.name,
    content_type: 'product',
    content_category: product.category || '',
    value: product.price,
    currency: 'INR',
  });
}

/** Item added to cart */
export function trackAddToCart(product: { id: string; name: string; price: number }, quantity: number) {
  fbq('track', 'AddToCart', {
    content_ids: [product.id],
    content_name: product.name,
    content_type: 'product',
    value: product.price * quantity,
    currency: 'INR',
    num_items: quantity,
  });
}

/** Checkout started */
export function trackInitiateCheckout(items: { id: string; price: number; quantity: number }[], total: number) {
  fbq('track', 'InitiateCheckout', {
    content_ids: items.map((i) => i.id),
    content_type: 'product',
    value: total,
    currency: 'INR',
    num_items: items.reduce((sum, i) => sum + i.quantity, 0),
  });
}

/** Purchase completed */
export function trackPurchase(orderNumber: string, total: number) {
  fbq('track', 'Purchase', {
    content_type: 'product',
    value: total,
    currency: 'INR',
    order_id: orderNumber,
  });
}
