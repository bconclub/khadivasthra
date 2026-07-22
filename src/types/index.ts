// Database row types (matching Supabase table schemas)

// Admin access control -------------------------------------------------------
// Per-section permission keys. 'super_admin' role implies all of these.
export const ADMIN_SECTIONS = [
  'dashboard',
  'products',
  'categories',
  'orders',
  'banners',
  'settings',
  'users',
  'investors',
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];

export type AdminRole = 'super_admin' | 'staff';

export interface AdminProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: AdminRole;
  permissions: AdminSection[];
  is_active: boolean;
  created_at: string;
}

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

// Product color with images
export interface ProductColor {
  id: string;
  product_id: string;
  name: string;
  hex_code: string;
  images: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
  variants?: ProductVariant[];
}

// Product variant (size-level stock)
export interface ProductVariant {
  id: string;
  product_id: string;
  color_id: string;
  size: string;
  sku: string;
  stock_quantity: number;
  price_adjustment: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  color?: ProductColor;
  // Used during form submission to resolve new colors
  color_name?: string;
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
  colours: string[];
  sizes: string[];
  care_instructions: string[];
  details: ProductDetails | null;
  in_stock: boolean;
  stock_quantity: number;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  is_best_seller: boolean;
  has_variants: boolean;
  display_order: number;
  weight: number;
  length: number;
  breadth: number;
  height: number;
  // Investable bifurcation + design metadata
  is_investable: boolean;
  design_name: string | null;
  design_code: string | null;        // human "Design ID"
  design_preview_url: string | null; // Design Photo (distinct from product photo)
  product_type: ProductType | null;
  manufactured_quantity: number;
  unit_cost: number | null;
  created_at: string;
  updated_at: string;
}

export type ProductType = 'single_mundu' | 'double_mundu';

export interface ProductWithCategory extends Product {
  category: Category;
  colors?: ProductColor[];
  variants?: ProductVariant[];
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  product_image: string | null;
  price: number;
  quantity: number;
  subtotal: number;
  variant_id?: string | null;
  color_id?: string | null;
  color_name?: string | null;
  size?: string | null;
}

export type OrderStatus = 'pending' | 'confirmed' | 'billed' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cod';
export type PaymentMethod = 'online' | 'cod';

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
  payment_method: PaymentMethod;
  article_number: string | null;
  cod_charges: number;
  settlement_status: 'pending' | 'received' | 'settled';
  amount_received: number | null;
  settlement_date: string | null;
  is_billed: boolean;
  billed_at: string | null;
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
  cod_available: boolean;
  cod_cheapest_rate: number;
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
  cod_enabled: boolean;
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
export type BannerPlacement = 'homepage_hero' | 'shop' | 'offers' | 'general';

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  mobile_image_url: string | null;
  size: BannerSize;
  placement: BannerPlacement;
  link_type: BannerLinkType;
  link_value: string | null;
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
  variant_id?: string;
  color_id?: string;
  color_name?: string;
  size?: string;
  /** Available stock snapshot — caps quantity in cart/checkout. */
  stock?: number;
}

// Investor portal -----------------------------------------------------------

export type InvestmentStatus = 'active' | 'completed';
export type SettlementStatus = 'pending' | 'paid';
export type InvestorDocType =
  | 'agreement'
  | 'settlement_statement'
  | 'sales_report'
  | 'tax_gst'
  | 'other';

export interface Investor {
  id: string;
  investor_code: string | null;
  full_name: string;
  mobile: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Investment {
  id: string;
  investor_id: string;
  product_id: string;
  start_date: string;
  end_date: string | null;
  status: InvestmentStatus;
  amount_invested: number;
  units_allocated: number;
  per_unit_payout: number;
  next_settlement_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  product?: Product;
  investor?: Investor;
}

export interface Settlement {
  id: string;
  investment_id: string;
  period_start: string | null;
  period_end: string | null;
  units_settled: number;
  amount: number;
  settlement_date: string;
  next_due_date: string | null;
  status: SettlementStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface InvestorDocument {
  id: string;
  investor_id: string;
  investment_id: string | null;
  doc_type: InvestorDocType;
  title: string;
  file_path: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface InvestorNotification {
  id: string;
  investor_id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_by: string | null;
  created_at: string;
}

export interface ActivityLogEntry {
  id: string;
  actor_id: string | null;
  actor_type: 'admin' | 'investor' | 'system';
  action: string;
  entity: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// Row returned by the get_investor_dashboard() RPC — one per investment.
export interface DesignPerformance {
  investment_id: string;
  product_id: string;
  design_code: string | null;
  design_name: string | null;
  product_name: string;
  product_image: string | null;
  design_preview: string | null;
  category_name: string | null;
  product_type: ProductType | null;
  status: InvestmentStatus;
  start_date: string;
  end_date: string | null;
  next_settlement_date: string | null;
  amount_invested: number;
  units_allocated: number;
  per_unit_payout: number;
  manufactured_quantity: number;
  remaining_stock: number;
  units_sold: number;
  sales_value: number;
  earnings: number;
  settled_amount: number;
  pending_amount: number;
  progress_pct: number;
}

export interface SalesTrendPoint {
  period: string;
  units: number;
  sales_value: number;
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
}
