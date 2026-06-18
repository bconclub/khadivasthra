import { supabase } from '@/lib/supabase';
import type { Order, OrderItem, CheckoutFormData, CartItem, ServiceabilityResult, TrackingResult, PaymentMethod } from '@/types';

function generateOrderNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `KV-${dateStr}-${random}`;
}

/** Minimum cart subtotal (₹) required to use Cash on Delivery. */
export const COD_MINIMUM = 1000;

export interface StockIssue {
  id: string;
  variant_id?: string | null;
  name: string;
  available: number;
  requested: number;
}

/**
 * Re-check live stock against the cart right before placing an order. Carts live
 * in localStorage and the product list only shows a yes/no in-stock flag, so a
 * stale or stacked cart can request more than exists. Returns any shortfalls.
 */
export async function checkCartStock(cartItems: CartItem[]): Promise<StockIssue[]> {
  const productIds = [...new Set(cartItems.filter((i) => !i.variant_id).map((i) => i.id))];
  const variantIds = [...new Set(cartItems.filter((i) => i.variant_id).map((i) => i.variant_id!))];

  const productStock: Record<string, number> = {};
  if (productIds.length) {
    const { data } = await supabase.from('products').select('id, stock_quantity').in('id', productIds);
    (data || []).forEach((p) => { productStock[p.id] = p.stock_quantity; });
  }
  const variantStock: Record<string, number> = {};
  if (variantIds.length) {
    const { data } = await supabase.from('product_variants').select('id, stock_quantity').in('id', variantIds);
    (data || []).forEach((v) => { variantStock[v.id] = v.stock_quantity; });
  }

  const issues: StockIssue[] = [];
  for (const item of cartItems) {
    const available = item.variant_id ? (variantStock[item.variant_id] ?? 0) : (productStock[item.id] ?? 0);
    if (item.quantity > available) {
      issues.push({ id: item.id, variant_id: item.variant_id, name: item.name, available, requested: item.quantity });
    }
  }
  return issues;
}

export async function createOrder(
  formData: CheckoutFormData,
  cartItems: CartItem[],
  subtotal: number,
  shippingCost: number = 0,
  paymentMethod: PaymentMethod = 'online'
): Promise<Order> {
  // COD is only allowed at/above the minimum — enforce here too so the rule
  // can't be bypassed if the client guard is skipped.
  if (paymentMethod === 'cod' && subtotal < COD_MINIMUM) {
    throw new Error(`Cash on Delivery requires a minimum order of ₹${COD_MINIMUM}.`);
  }

  // Guard against overselling: block if any line exceeds current stock.
  const stockIssues = await checkCartStock(cartItems);
  if (stockIssues.length > 0) {
    const detail = stockIssues
      .map((i) => `${i.name} (only ${i.available} left, you have ${i.requested})`)
      .join('; ');
    throw new Error(`Some items are no longer available: ${detail}`);
  }

  const items: OrderItem[] = cartItems.map(item => ({
    product_id: item.id,
    product_name: item.name,
    product_image: item.image || null,
    price: item.price,
    quantity: item.quantity,
    subtotal: item.price * item.quantity,
    variant_id: item.variant_id || null,
    color_id: item.color_id || null,
    color_name: item.color_name || null,
    size: item.size || null,
  }));

  const isCod = paymentMethod === 'cod';
  const codCharges = isCod ? Math.round((subtotal + shippingCost) * 0.016) : 0;
  const total = subtotal + shippingCost + codCharges;

  const order = {
    order_number: generateOrderNumber(),
    customer_name: formData.name,
    customer_phone: formData.phone,
    customer_email: formData.email || null,
    customer_address: formData.address,
    customer_city: formData.city,
    customer_state: formData.state,
    customer_pincode: formData.pincode,
    items,
    subtotal,
    shipping: shippingCost,
    cod_charges: codCharges,
    total,
    status: isCod ? 'confirmed' as const : 'pending' as const,
    payment_status: isCod ? 'cod' as const : 'pending' as const,
    payment_method: paymentMethod,
    notes: null,
  };

  const { data, error } = await supabase
    .from('orders')
    .insert(order)
    .select()
    .single();

  if (error) throw error;

  // Decrement stock for each ordered item
  for (const item of cartItems) {
    await supabase.rpc('decrement_stock', {
      p_product_id: item.id,
      p_quantity: item.quantity,
      p_variant_id: item.variant_id || null,
    });
  }

  return data;
}

export async function getOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getOrderById(id: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateOrderStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

export async function updateOrder(id: string, data: Record<string, unknown>): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update(data)
    .eq('id', id);
  if (error) throw error;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function invokeEdgeFunction(functionName: string, body: Record<string, unknown>) {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  console.log(`Calling edge function: ${url}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(`Edge function ${functionName} error:`, res.status, JSON.stringify(data, null, 2));
    const details = data?.details ? ` | Details: ${JSON.stringify(data.details)}` : '';
    throw new Error((data?.error || `Edge function failed (${res.status})`) + details);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

export async function createRazorpayOrder(
  orderId: string,
  amount: number,
  currency: string = 'INR'
): Promise<{ razorpay_order_id: string; amount: number; currency: string }> {
  return invokeEdgeFunction('create-razorpay-order', { order_id: orderId, amount, currency });
}

export async function verifyRazorpayPayment(
  orderId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): Promise<{ verified: boolean }> {
  return invokeEdgeFunction('verify-razorpay-payment', {
    order_id: orderId,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: razorpaySignature,
  });
}

// Shipment tracking stub (Shiprocket removed)
export async function trackShipment(
  _orderNumber: string
): Promise<TrackingResult> {
  return {
    status: 'unknown',
    current_status: 'Tracking not available',
    tracking_url: null,
    etd: null,
    scans: [],
  };
}

// Shipping serviceability via Shiprocket edge function
export async function checkShippingServiceability(
  deliveryPincode: string,
  totalItems: number = 1
): Promise<ServiceabilityResult> {
  return invokeEdgeFunction('shiprocket-check-serviceability', {
    delivery_pincode: deliveryPincode,
    total_items: totalItems,
  });
}

export async function checkPaymentStatus(
  orderId: string
): Promise<{ payment_status: string; reconciled: boolean; message: string; razorpay_payment_id?: string }> {
  return invokeEdgeFunction('check-payment-status', { order_id: orderId });
}
