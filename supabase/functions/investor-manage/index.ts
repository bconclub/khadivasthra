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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

    // ---- Authorize: caller must be an admin with the 'investors' section ----
    const { data: callerProfile } = await admin
      .from("admin_profiles")
      .select("role, permissions, is_active")
      .eq("id", callerId)
      .single();

    const canManage =
      callerProfile &&
      callerProfile.is_active &&
      (callerProfile.role === "super_admin" ||
        (Array.isArray(callerProfile.permissions) &&
          callerProfile.permissions.includes("investors")));

    if (!canManage) {
      return json({ error: "Forbidden: investors access required" }, 403);
    }

    const payload = await req.json();
    const action: string = payload.action;

    switch (action) {
      // ---- LIST -----------------------------------------------------------
      case "list": {
        const { data, error } = await admin
          .from("investor_profiles")
          .select("id, investor_code, full_name, mobile, email, is_active, created_at")
          .order("created_at", { ascending: true });
        if (error) return json({ error: error.message }, 400);
        return json({ investors: data });
      }

      // ---- CREATE ---------------------------------------------------------
      case "create": {
        const email: string = (payload.email || "").trim().toLowerCase();
        const password: string = payload.password || "";
        const fullName: string = (payload.full_name || "").trim();
        const mobile: string = (payload.mobile || "").trim();

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
            user_metadata: { full_name: fullName, role: "investor" },
          });
        if (createErr || !created?.user) {
          return json({ error: createErr?.message || "Failed to create user" }, 400);
        }

        const { data: profile, error: profileErr } = await admin
          .from("investor_profiles")
          .insert({
            id: created.user.id,
            full_name: fullName || "",
            mobile: mobile || null,
            email,
            is_active: true,
          })
          .select("id, investor_code, full_name, mobile, email, is_active, created_at")
          .single();
        if (profileErr) {
          await admin.auth.admin.deleteUser(created.user.id);
          return json({ error: profileErr.message }, 400);
        }

        await admin.from("activity_log").insert({
          actor_id: callerId,
          actor_type: "admin",
          action: "investor.create",
          entity: "investor_profiles",
          entity_id: created.user.id,
          metadata: { email },
        });

        return json({ investor: profile });
      }

      // ---- UPDATE (name / mobile / active) --------------------------------
      case "update": {
        const id: string = payload.id;
        if (!id) return json({ error: "Investor id is required" }, 400);

        const updates: Record<string, unknown> = {};
        if (payload.full_name !== undefined) updates.full_name = payload.full_name;
        if (payload.mobile !== undefined) updates.mobile = payload.mobile;
        if (payload.is_active !== undefined) updates.is_active = !!payload.is_active;

        const { error } = await admin
          .from("investor_profiles")
          .update(updates)
          .eq("id", id);
        if (error) return json({ error: error.message }, 400);

        await admin.from("activity_log").insert({
          actor_id: callerId,
          actor_type: "admin",
          action: "investor.update",
          entity: "investor_profiles",
          entity_id: id,
          metadata: updates,
        });
        return json({ ok: true });
      }

      // ---- RESET PASSWORD -------------------------------------------------
      case "reset_password": {
        const id: string = payload.id;
        const password: string = payload.password || "";
        if (!id || !password) {
          return json({ error: "Investor id and new password are required" }, 400);
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
        if (!id) return json({ error: "Investor id is required" }, 400);
        // investor_profiles row cascades via ON DELETE CASCADE on auth.users
        const { error } = await admin.auth.admin.deleteUser(id);
        if (error) return json({ error: error.message }, 400);

        await admin.from("activity_log").insert({
          actor_id: callerId,
          actor_type: "admin",
          action: "investor.delete",
          entity: "investor_profiles",
          entity_id: id,
        });
        return json({ ok: true });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("investor-manage error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
