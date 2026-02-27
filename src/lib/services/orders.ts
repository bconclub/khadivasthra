import { supabase } from '@/lib/supabase';
import type { Order, OrderItem, CheckoutFormData, CartItem } from '@/types';

function generateOrderNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `KV-${dateStr}-${random}`;
}

export async function createOrder(
  formData: CheckoutFormData,
  cartItems: CartItem[],
  subtotal: number
): Promise<Order> {
  const items: OrderItem[] = cartItems.map(item => ({
    product_id: item.id,
    product_name: item.name,
    product_image: item.image || null,
    price: item.price,
    quantity: item.quantity,
    subtotal: item.price * item.quantity,
  }));

  const order = {
    order_number: generateOrderNumber(),
    customer_name: formData.name,
    customer_phone: formData.phone,
    customer_email: formData.email || null,
    customer_address: formData.address,
    customer_city: formData.city,
    customer_state: formData.state || 'Kerala',
    customer_pincode: formData.pincode,
    items,
    subtotal,
    shipping: 0,
    total: subtotal,
    status: 'pending' as const,
    notes: formData.notes || null,
  };

  const { data, error } = await supabase
    .from('orders')
    .insert(order)
    .select()
    .single();

  if (error) throw error;
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
    console.error(`Edge function ${functionName} error:`, res.status, data);
    throw new Error(data?.error || `Edge function failed (${res.status})`);
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
