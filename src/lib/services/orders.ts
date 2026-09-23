import { supabase } from '@/lib/supabase';
import type { Order, CheckoutFormData, CartItem, ServiceabilityResult, TrackingResult, PaymentMethod } from '@/types';

/** Minimum cart subtotal (₹) required to use Cash on Delivery. */
export const COD_MINIMUM = 1000;

export async function createOrder(
  formData: CheckoutFormData,
  cartItems: CartItem[],
  subtotal: number,
  shippingCost: number = 0,
  paymentMethod: PaymentMethod = 'online',
  checkoutKey: string = crypto.randomUUID(),
  expectedTotal: number = subtotal + shippingCost + (paymentMethod === 'cod' ? Math.round((subtotal + shippingCost) * 0.016) : 0),
): Promise<{ id: string; order_number: string; total: number; statusToken: string }> {
  const result = await invokeEdgeFunction('secure-checkout', {
    action: 'create', key: checkoutKey, customer: formData,
    assistedCartId: typeof window === 'undefined' ? null : sessionStorage.getItem('kv_assisted_cart_id'),
    cart: cartItems.map(item => ({ id: item.id, variant_id: item.variant_id || null, quantity: item.quantity, ...(item.combo ? { combo: item.combo } : {}) })),
    paymentMethod, expectedTotal,
  });
  if (!result.order?.id || !result.statusToken) throw new Error('Order confirmation unavailable');
  return { ...result.order, statusToken: result.statusToken };
}

export async function getOrders(): Promise<Order[]> {
  const pageSize = 1000;
  const orders: Order[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const page = (data || []) as Order[];
    orders.push(...page);
    if (page.length < pageSize) break;
  }
  return orders;
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
  // `.select()` matters: when a row-level-security policy blocks the update,
  // Postgres reports success with zero rows changed. Without checking the
  // returned rows the UI would claim "saved" while nothing persisted.
  const { data: rows, error } = await supabase
    .from('orders')
    .update(data)
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!rows || rows.length === 0) {
    throw new Error(
      "Order was not saved — your admin account doesn't have permission to edit orders. Ask a super admin to grant you the 'orders' section."
    );
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function invokeEdgeFunction(functionName: string, body: Record<string, unknown>, admin = false) {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  const session = admin ? (await supabase.auth.getSession()).data.session : null;
  if (admin && !session) throw new Error('Admin sign-in required');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(`Edge function ${functionName} error:`, res.status, JSON.stringify(data, null, 2));
    const currentTotal = Number.isFinite(Number(data?.quote?.total)) ? ` Current total: ₹${data.quote.total}. Review your cart and add changed items again before retrying.` : '';
    throw new Error((data?.error || `Edge function failed (${res.status})`) + currentTotal);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

export async function createRazorpayOrder(
  orderId: string,
  statusToken: string,
): Promise<{ razorpay_order_id: string; amount: number; currency: string }> {
  return invokeEdgeFunction('create-razorpay-order', { order_id: orderId, status_token: statusToken });
}

export async function getPaymentExceptions(): Promise<{ order_id: string; razorpay_payment_id: string; reason: string; created_at: string }[]> {
  const { data, error } = await supabase.from('kv_payment_exceptions')
    .select('order_id,razorpay_payment_id,reason,created_at').order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return data || [];
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

export async function trackShipment(
  orderNumber: string
): Promise<TrackingResult> {
  const saved = localStorage.getItem(`kv_order_${orderNumber}`);
  if (!saved) throw new Error('This order needs verification. Contact us on WhatsApp with the order number.');
  const { id, token } = JSON.parse(saved) as { id: string; token: string };
  const result = await invokeEdgeFunction('secure-checkout', { action: 'status', id, token });
  const order = result.order;
  if (order?.order_number !== orderNumber) throw new Error('Order could not be verified');
  return {
    status: order.shipping_status || order.status || 'processing',
    current_status: order.payment_status === 'pending' ? 'Payment pending' : order.shipping_status || order.status || 'Processing',
    tracking_url: order.tracking_url || null, etd: null, scans: [],
  };
}

export async function bookShiprocketShipment(orderId: string) {
  return invokeEdgeFunction('shiprocket-create-order', { order_id: orderId }, true);
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
  return invokeEdgeFunction('check-payment-status', { order_id: orderId }, true);
}
