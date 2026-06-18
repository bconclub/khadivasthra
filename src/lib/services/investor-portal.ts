import { supabase } from "@/lib/supabase";
import type {
  DesignPerformance,
  SalesTrendPoint,
  Settlement,
  InvestorDocument,
  InvestorNotification,
} from "@/types";

// Investor-facing reads. Everything is scoped to auth.uid() by RLS or by the
// SECURITY DEFINER reporting functions — investors never touch raw orders.

// Per-design performance rollup for the logged-in investor.
export async function getDashboard(): Promise<DesignPerformance[]> {
  const { data, error } = await supabase.rpc("get_investor_dashboard");
  if (error) throw new Error(error.message);
  return (data || []) as DesignPerformance[];
}

// Date-wise sales trend for one design (guarded server-side).
export async function getSalesTrend(
  productId: string,
  granularity: "day" | "month" = "day"
): Promise<SalesTrendPoint[]> {
  const { data, error } = await supabase.rpc("get_design_sales_trend", {
    p_product_id: productId,
    p_granularity: granularity,
  });
  if (error) throw new Error(error.message);
  return (data || []) as SalesTrendPoint[];
}

// Settlements across all of the investor's investments.
export async function getMySettlements(): Promise<Settlement[]> {
  const { data, error } = await supabase
    .from("settlements")
    .select("*")
    .order("settlement_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as Settlement[];
}

export async function getMyDocuments(): Promise<InvestorDocument[]> {
  const { data, error } = await supabase
    .from("investor_documents")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as InvestorDocument[];
}

export async function getMyDocumentUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("investor-documents")
    .createSignedUrl(filePath, 3600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function getMyNotifications(): Promise<InvestorNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as InvestorNotification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  if (error) throw new Error(error.message);
}
