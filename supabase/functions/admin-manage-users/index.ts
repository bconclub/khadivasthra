import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_PERMISSIONS = [
  "dashboard",
  "products",
  "categories",
  "orders",
  "banners",
  "settings",
  "users",
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sanitizePermissions(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((p) => VALID_PERMISSIONS.includes(p as string)) as string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Service-role client: bypasses RLS, used for all privileged work.
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // ---- Authenticate the caller from their bearer token -------------------
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Missing authorization token" }, 401);

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return json({ error: "Invalid or expired session" }, 401);
    }
    const callerId = userData.user.id;

    // ---- Authorize: caller must be an active super_admin -------------------
    const { data: callerProfile } = await admin
      .from("admin_profiles")
      .select("role, is_active")
      .eq("id", callerId)
      .single();

    if (
      !callerProfile ||
      !callerProfile.is_active ||
      callerProfile.role !== "super_admin"
    ) {
      return json({ error: "Forbidden: super admin access required" }, 403);
    }

    const payload = await req.json();
    const action: string = payload.action;

    switch (action) {
      // ---- LIST -----------------------------------------------------------
      case "list": {
        const { data, error } = await admin
          .from("admin_profiles")
          .select("id, email, full_name, role, permissions, is_active, created_at")
          .order("created_at", { ascending: true });
        if (error) return json({ error: error.message }, 400);
        return json({ users: data });
      }

      // ---- CREATE ---------------------------------------------------------
      case "create": {
        const email: string = (payload.email || "").trim().toLowerCase();
        const password: string = payload.password || "";
        const fullName: string = (payload.full_name || "").trim();
        const role: string = payload.role === "super_admin" ? "super_admin" : "staff";
        const permissions =
          role === "super_admin" ? VALID_PERMISSIONS : sanitizePermissions(payload.permissions);

        if (!email || !password) {
          return json({ error: "Email and password are required" }, 400);
        }
        if (password.length < 8) {
          return json({ error: "Password must be at least 8 characters" }, 400);
        }

        const { data: created, error: createErr } =
          await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName },
          });
        if (createErr || !created?.user) {
          return json({ error: createErr?.message || "Failed to create user" }, 400);
        }

        const { error: profileErr } = await admin.from("admin_profiles").insert({
          id: created.user.id,
          email,
          full_name: fullName || null,
          role,
          permissions,
          is_active: true,
        });
        if (profileErr) {
          // roll back the auth user so we don't orphan it
          await admin.auth.admin.deleteUser(created.user.id);
          return json({ error: profileErr.message }, 400);
        }

        return json({ id: created.user.id, email });
      }

      // ---- UPDATE (permissions / role / active / name) --------------------
      case "update": {
        const id: string = payload.id;
        if (!id) return json({ error: "User id is required" }, 400);
        if (id === callerId && payload.role && payload.role !== "super_admin") {
          return json({ error: "You cannot demote your own account" }, 400);
        }

        const updates: Record<string, unknown> = {};
        if (payload.full_name !== undefined) updates.full_name = payload.full_name;
        if (payload.role !== undefined) {
          updates.role = payload.role === "super_admin" ? "super_admin" : "staff";
        }
        if (payload.permissions !== undefined) {
          updates.permissions =
            updates.role === "super_admin"
              ? VALID_PERMISSIONS
              : sanitizePermissions(payload.permissions);
        }
        if (payload.is_active !== undefined) {
          if (id === callerId && payload.is_active === false) {
            return json({ error: "You cannot deactivate your own account" }, 400);
          }
          updates.is_active = !!payload.is_active;
        }

        const { error } = await admin
          .from("admin_profiles")
          .update(updates)
          .eq("id", id);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }

      // ---- RESET PASSWORD -------------------------------------------------
      case "reset_password": {
        const id: string = payload.id;
        const password: string = payload.password || "";
        if (!id || !password) {
          return json({ error: "User id and new password are required" }, 400);
        }
        if (password.length < 8) {
          return json({ error: "Password must be at least 8 characters" }, 400);
        }
        const { error } = await admin.auth.admin.updateUserById(id, { password });
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }

      // ---- DELETE ---------------------------------------------------------
      case "delete": {
        const id: string = payload.id;
        if (!id) return json({ error: "User id is required" }, 400);
        if (id === callerId) {
          return json({ error: "You cannot delete your own account" }, 400);
        }
        // admin_profiles row cascades via ON DELETE CASCADE on auth.users
        const { error } = await admin.auth.admin.deleteUser(id);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("admin-manage-users error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
