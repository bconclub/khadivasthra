import { supabase } from "@/lib/supabase";
import type { AdminProfile, AdminRole, AdminSection } from "@/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// All user-management actions run through the admin-manage-users edge function,
// which verifies the caller is an active super_admin (service-role privileged).
async function callUserFn<T = unknown>(body: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-manage-users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || `Request failed (${res.status})`);
  }
  return json as T;
}

export async function listAdminUsers(): Promise<AdminProfile[]> {
  const { users } = await callUserFn<{ users: AdminProfile[] }>({ action: "list" });
  return users;
}

export async function createAdminUser(input: {
  email: string;
  password: string;
  full_name?: string;
  role: AdminRole;
  permissions: AdminSection[];
}): Promise<void> {
  await callUserFn({ action: "create", ...input });
}

export async function updateAdminUser(
  id: string,
  updates: {
    full_name?: string;
    role?: AdminRole;
    permissions?: AdminSection[];
    is_active?: boolean;
  }
): Promise<void> {
  await callUserFn({ action: "update", id, ...updates });
}

export async function resetAdminUserPassword(id: string, password: string): Promise<void> {
  await callUserFn({ action: "reset_password", id, password });
}

export async function deleteAdminUser(id: string): Promise<void> {
  await callUserFn({ action: "delete", id });
}
