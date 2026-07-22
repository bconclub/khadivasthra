import { supabase } from "@/lib/supabase";
import type {
  Investor,
  Investment,
  Settlement,
  InvestorDocument,
  ActivityLogEntry,
  ProductWithCategory,
} from "@/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Investor auth-account actions run through the investor-manage edge function,
// which verifies the caller is an admin with the 'investors' section.
async function callInvestorFn<T = unknown>(body: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/investor-manage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json as T;
}

// ---- Investor accounts (edge function) ------------------------------------
export async function listInvestors(): Promise<Investor[]> {
  const { investors } = await callInvestorFn<{ investors: Investor[] }>({ action: "list" });
  return investors;
}

export async function createInvestor(input: {
  email: string;
  password: string;
  full_name: string;
  mobile?: string;
}): Promise<Investor> {
  const { investor } = await callInvestorFn<{ investor: Investor }>({ action: "create", ...input });
  return investor;
}

export async function updateInvestor(
  id: string,
  updates: { full_name?: string; mobile?: string; is_active?: boolean }
): Promise<void> {
  await callInvestorFn({ action: "update", id, ...updates });
}

export async function resetInvestorPassword(id: string, password: string): Promise<void> {
  await callInvestorFn({ action: "reset_password", id, password });
}

export async function deleteInvestor(id: string): Promise<void> {
  await callInvestorFn({ action: "delete", id });
}

// ---- Investable designs (products flagged is_investable) -------------------
export async function listInvestableDesigns(): Promise<ProductWithCategory[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(*)")
    .eq("is_investable", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as ProductWithCategory[];
}

// ---- Investments (admin CRUD) ---------------------------------------------
export async function listInvestments(): Promise<Investment[]> {
  const { data, error } = await supabase
    .from("investments")
    .select("*, product:products(*), investor:investor_profiles(*)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as Investment[];
}

export async function listInvestmentsForProduct(productId: string): Promise<Investment[]> {
  const { data, error } = await supabase
    .from("investments")
    .select("*, investor:investor_profiles(*)")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as Investment[];
}

export async function listInvestmentsForInvestor(investorId: string): Promise<Investment[]> {
  const { data, error } = await supabase
    .from("investments")
    .select("*, product:products(*)")
    .eq("investor_id", investorId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as Investment[];
}

export type InvestmentInput = {
  investor_id: string;
  product_id: string;
  start_date: string;
  end_date?: string | null;
  status?: "active" | "completed";
  amount_invested: number;
  units_allocated: number;
  per_unit_payout: number;
  next_settlement_date?: string | null;
  notes?: string | null;
};

export async function createInvestment(input: InvestmentInput): Promise<Investment> {
  const { data, error } = await supabase.from("investments").insert(input).select().single();
  if (error) throw new Error(error.message);
  return data as Investment;
}

export async function updateInvestment(id: string, updates: Partial<InvestmentInput>): Promise<void> {
  const { error } = await supabase.from("investments").update(updates).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteInvestment(id: string): Promise<void> {
  const { error } = await supabase.from("investments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---- Settlements -----------------------------------------------------------
export async function listSettlements(investmentId: string): Promise<Settlement[]> {
  const { data, error } = await supabase
    .from("settlements")
    .select("*")
    .eq("investment_id", investmentId)
    .order("settlement_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as Settlement[];
}

export type SettlementInput = {
  investment_id: string;
  period_start?: string | null;
  period_end?: string | null;
  units_settled?: number;
  amount: number;
  settlement_date: string;
  next_due_date?: string | null;
  status?: "pending" | "paid";
  notes?: string | null;
};

export async function createSettlement(input: SettlementInput): Promise<Settlement> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("settlements")
    .insert({ ...input, created_by: user?.id ?? null })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Settlement;
}

export async function updateSettlement(id: string, updates: Partial<SettlementInput>): Promise<void> {
  const { error } = await supabase.from("settlements").update(updates).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteSettlement(id: string): Promise<void> {
  const { error } = await supabase.from("settlements").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---- Documents (private bucket, path = "<investor_id>/<file>") -------------
export async function listDocuments(investorId: string): Promise<InvestorDocument[]> {
  const { data, error } = await supabase
    .from("investor_documents")
    .select("*")
    .eq("investor_id", investorId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as InvestorDocument[];
}

export async function uploadDocument(input: {
  investor_id: string;
  investment_id?: string | null;
  doc_type: InvestorDocument["doc_type"];
  title: string;
  file: File;
}): Promise<InvestorDocument> {
  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${input.investor_id}/${Date.now()}_${safeName}`;
  const { error: upErr } = await supabase.storage
    .from("investor-documents")
    .upload(path, input.file, { upsert: false });
  if (upErr) throw new Error(upErr.message);

  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("investor_documents")
    .insert({
      investor_id: input.investor_id,
      investment_id: input.investment_id ?? null,
      doc_type: input.doc_type,
      title: input.title,
      file_path: path,
      uploaded_by: user?.id ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as InvestorDocument;
}

export async function deleteDocument(doc: InvestorDocument): Promise<void> {
  await supabase.storage.from("investor-documents").remove([doc.file_path]);
  const { error } = await supabase.from("investor_documents").delete().eq("id", doc.id);
  if (error) throw new Error(error.message);
}

// Signed URL for a private document (1h validity).
export async function getDocumentUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("investor-documents")
    .createSignedUrl(filePath, 3600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

// ---- Notifications ---------------------------------------------------------
export async function sendNotification(input: {
  investor_id: string;
  title: string;
  body: string;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("notifications")
    .insert({ ...input, created_by: user?.id ?? null });
  if (error) throw new Error(error.message);
}

// ---- Activity log ----------------------------------------------------------
export async function listActivity(limit = 100): Promise<ActivityLogEntry[]> {
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data || []) as ActivityLogEntry[];
}

export async function logActivity(entry: {
  action: string;
  entity?: string;
  entity_id?: string;
  actor_type?: "admin" | "investor" | "system";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("activity_log").insert({
    actor_id: user?.id ?? null,
    actor_type: entry.actor_type ?? "admin",
    action: entry.action,
    entity: entry.entity ?? null,
    entity_id: entry.entity_id ?? null,
    metadata: entry.metadata ?? null,
  });
}
