import { supabase } from '@/lib/supabase';
import type {
  ProductWithCategory,
  WholesalePrice,
  WholesaleAccount,
  WholesaleEnquiry,
  WholesaleEnquiryItem,
  WholesaleEnquiryStatus,
} from '@/types';

/** Master switch from site settings; the whole channel hides when off. */
export async function wholesaleEnabled(): Promise<boolean> {
  const { data } = await supabase.from('settings').select('wholesale_enabled').limit(1).single();
  return data?.wholesale_enabled === true;
}

/** A trade catalogue line: the product plus its protected trade price. */
export interface WholesaleProduct {
  product: ProductWithCategory;
  price: number;
  min_qty: number;
}

/**
 * The trade catalogue. The prices come from `wholesale_prices`, which only an
 * approved buyer (or an admin) can read, so an unapproved or logged-out visitor
 * gets an empty list rather than a price sheet.
 */
export async function getWholesaleProducts(): Promise<WholesaleProduct[]> {
  if (!(await wholesaleEnabled())) return [];

  const { data: prices, error: pErr } = await supabase
    .from('wholesale_prices')
    .select('*');
  if (pErr) {
    if (isMissingTable(pErr)) return [];
    throw new Error(pErr.message);
  }
  const rows = (prices || []) as WholesalePrice[];
  if (rows.length === 0) return [];

  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .in('id', rows.map((r) => r.product_id))
    .eq('is_wholesale', true)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  const byId = new Map(rows.map((r) => [r.product_id, r]));
  return (data || [])
    .map((p) => {
      const row = byId.get(p.id)!;
      return { product: p as ProductWithCategory, price: Number(row.price), min_qty: Math.max(1, row.min_qty) };
    });
}

/**
 * True when the error is Postgres/PostgREST saying the table is not there.
 * The trade-price table ships in its own migration, and product editing must
 * not break on a database where that migration has not been run yet.
 */
function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /could not find the table/i.test(error.message || '')
  );
}

/** Admin: the trade price for one product, or null if none is set. */
export async function getWholesalePrice(productId: string): Promise<WholesalePrice | null> {
  const { data, error } = await supabase
    .from('wholesale_prices')
    .select('*')
    .eq('product_id', productId)
    .maybeSingle();
  if (error) {
    if (isMissingTable(error)) return null;
    throw new Error(error.message);
  }
  return (data as WholesalePrice) ?? null;
}

/** Admin: set or clear the trade price for a product. */
export async function setWholesalePrice(
  productId: string,
  price: number | null,
  minQty: number
): Promise<void> {
  if (price === null) {
    const { error } = await supabase.from('wholesale_prices').delete().eq('product_id', productId);
    if (error && !isMissingTable(error)) throw new Error(error.message);
    return;
  }
  const { data: rows, error } = await supabase
    .from('wholesale_prices')
    .upsert({ product_id: productId, price, min_qty: Math.max(1, minQty) }, { onConflict: 'product_id' })
    .select('product_id');
  if (error) {
    if (isMissingTable(error)) return;
    throw new Error(error.message);
  }
  if (!rows || rows.length === 0) {
    throw new Error(
      "Trade price was not saved - your admin account lacks the 'wholesale' permission."
    );
  }
}

// ---- Buyer ------------------------------------------------------------------

/** The signed-in user's own trade account, or null if they have none. */
export async function getMyAccount(): Promise<WholesaleAccount | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('wholesale_accounts')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as WholesaleAccount) ?? null;
}

export type RegisterInput = Omit<
  WholesaleAccount,
  'id' | 'account_code' | 'is_active' | 'created_at' | 'updated_at'
>;

/**
 * Create the buyer's own trade account. RLS allows this only for their own id
 * and only in the un-approved state, so `is_active` is written explicitly false
 * rather than relying on the column default.
 */
export async function registerAccount(input: RegisterInput): Promise<WholesaleAccount> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You need to be signed in to register a trade account.');

  const { data, error } = await supabase
    .from('wholesale_accounts')
    .insert({ ...input, id: user.id, is_active: false })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as WholesaleAccount;
}

export async function submitEnquiry(
  items: WholesaleEnquiryItem[],
  notes: string | null
): Promise<WholesaleEnquiry> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You need to be signed in to send an enquiry.');
  if (items.length === 0) throw new Error('Your enquiry is empty.');

  const short = items.find((i) => i.quantity < i.min_qty);
  if (short) {
    throw new Error(
      `${short.product_name} has a minimum order of ${short.min_qty} pieces.`
    );
  }

  const { data, error } = await supabase
    .from('wholesale_enquiries')
    .insert({
      account_id: user.id,
      items,
      item_count: items.reduce((n, i) => n + i.quantity, 0),
      estimated_total: items.reduce((n, i) => n + i.subtotal, 0),
      notes,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as WholesaleEnquiry;
}

export async function getMyEnquiries(): Promise<WholesaleEnquiry[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('wholesale_enquiries')
    .select('*')
    .eq('account_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as WholesaleEnquiry[];
}

// ---- Admin ------------------------------------------------------------------

export async function listAccounts(): Promise<WholesaleAccount[]> {
  const { data, error } = await supabase
    .from('wholesale_accounts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as WholesaleAccount[];
}

/** An RLS-blocked update reports success with zero rows — never let that pass. */
export async function setAccountActive(id: string, isActive: boolean): Promise<void> {
  const { data: rows, error } = await supabase
    .from('wholesale_accounts')
    .update({ is_active: isActive })
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  if (!rows || rows.length === 0) {
    throw new Error(
      "Account was not saved — your admin account lacks the 'wholesale' permission."
    );
  }
}

export async function listEnquiries(): Promise<WholesaleEnquiry[]> {
  const { data, error } = await supabase
    .from('wholesale_enquiries')
    .select('*, account:wholesale_accounts(*)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as WholesaleEnquiry[];
}

export async function updateEnquiry(
  id: string,
  data: { status?: WholesaleEnquiryStatus; notes?: string | null }
): Promise<void> {
  const { data: rows, error } = await supabase
    .from('wholesale_enquiries')
    .update(data)
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  if (!rows || rows.length === 0) {
    throw new Error(
      "Enquiry was not saved — your admin account lacks the 'wholesale' permission."
    );
  }
}
