import { supabase } from '@/lib/supabase';
import type { Coupon, CouponEvaluation, CouponFormData } from '@/types';

/**
 * Ask the database what a code is worth against this subtotal. This is a
 * preview for the checkout screen; the order trigger recomputes it on insert,
 * so a tampered browser cannot award itself a bigger discount.
 */
export async function evaluateCoupon(code: string, subtotal: number): Promise<CouponEvaluation> {
  const { data, error } = await supabase.rpc('evaluate_coupon', {
    p_code: code,
    p_subtotal: subtotal,
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as CouponEvaluation | undefined;
  return (
    row ?? {
      valid: false,
      code: null,
      owner_name: null,
      kind: null,
      value: null,
      discount: 0,
      message: 'That code is not valid.',
    }
  );
}

// ---- Admin ------------------------------------------------------------------

export async function listCoupons(): Promise<Coupon[]> {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as Coupon[];
}

export async function createCoupon(data: CouponFormData): Promise<Coupon> {
  const { data: row, error } = await supabase.from('coupons').insert(data).select().single();
  if (error) {
    if (error.code === '23505') throw new Error('That code already exists.');
    throw new Error(error.message);
  }
  return row as Coupon;
}

export async function updateCoupon(id: string, data: Partial<CouponFormData>): Promise<void> {
  const { data: rows, error } = await supabase
    .from('coupons')
    .update(data)
    .eq('id', id)
    .select('id');
  if (error) {
    if (error.code === '23505') throw new Error('That code already exists.');
    throw new Error(error.message);
  }
  // An RLS-blocked update reports success with zero rows.
  if (!rows || rows.length === 0) {
    throw new Error("Coupon was not saved - your admin account lacks the 'offers' permission.");
  }
}

export async function deleteCoupon(id: string): Promise<void> {
  const { error } = await supabase.from('coupons').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Orders per code, for the attribution table. Cancelled orders excluded. */
export interface CouponStats {
  code: string;
  orders: number;
  revenue: number;
  discount_given: number;
}

export async function couponStats(): Promise<Record<string, CouponStats>> {
  const { data, error } = await supabase
    .from('orders')
    .select('coupon_code, total, discount, status')
    .not('coupon_code', 'is', null)
    .neq('status', 'cancelled');
  if (error) throw new Error(error.message);

  const out: Record<string, CouponStats> = {};
  for (const o of data || []) {
    const code = o.coupon_code as string;
    const s = (out[code] ||= { code, orders: 0, revenue: 0, discount_given: 0 });
    s.orders += 1;
    s.revenue += Number(o.total) || 0;
    s.discount_given += Number(o.discount) || 0;
  }
  return out;
}
