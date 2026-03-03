// Database row types (matching Supabase table schemas)

export interface ProductDetails {
  material?: string;
  weave?: string;
  fit?: string;
  pattern?: string;
  origin?: string;
  dimensions?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  price: number;
  compare_price: number | null;
  description: string;
  long_description: string | null;
  image_url: string | null;
  images: string[];
  material: string | null;
  care_instructions: string[];
  details: ProductDetails | null;
  in_stock: boolean;
  stock_quantity: number;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  is_best_seller: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductWithCategory extends Product {
  category: Category;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  product_image: string | null;
  price: number;
  quantity: number;
  subtotal: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_address: string;
  customer_city: string;
  customer_state: string;
  customer_pincode: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  notes: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  payment_status: PaymentStatus;
  shiprocket_order_id: string | null;
  shipment_id: string | null;
  awb_code: string | null;
  courier_name: string | null;
  tracking_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShippingRate {
  courier_company_id: number;
  courier_name: string;
  rate: number;
  etd: string;
  estimated_delivery_days: number;
}

export interface ServiceabilityResult {
  available: boolean;
  rates: ShippingRate[];
  cheapest_rate: number;
  fastest_etd: string;
}

export interface TrackingScan {
  date: string;
  activity: string;
  location: string;
}

export interface TrackingResult {
  status: string;
  current_status: string;
  tracking_url: string | null;
  etd: string | null;
  scans: TrackingScan[];
}

export interface SiteSettings {
  id: string;
  whatsapp_number: string;
  store_name: string;
  store_email: string | null;
  store_phone: string;
  store_address: string;
  shipping_info: string | null;
  return_policy: string | null;
  announcement_text: string | null;
  is_store_open: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductView {
  id: string;
  product_id: string;
  viewed_at: string;
  session_id: string | null;
}

// Banner types
export type BannerSize = 'hero' | 'wide' | 'square' | 'tall';
export type BannerLinkType = 'product' | 'category' | 'url' | 'none';

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  size: BannerSize;
  link_type: BannerLinkType;
  link_value: string | null;  // product slug, category slug, or external URL
  display_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

// Form types for admin CRUD
export type ProductFormData = Omit<Product, 'id' | 'created_at' | 'updated_at'>;
export type CategoryFormData = Omit<Category, 'id' | 'created_at' | 'updated_at'>;
export type BannerFormData = Omit<Banner, 'id' | 'created_at' | 'updated_at'>;

// Cart item type (compatible with existing CartContext)
export interface CartItem {
  id: string;
  name: string;
  slug?: string;
  price: number;
  image: string;
  quantity: number;
}

// Checkout form data
export interface CheckoutFormData {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  notes: string;
}
