"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  UserPlus,
  Trash2,
  KeyRound,
  ShieldCheck,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { ADMIN_SECTIONS } from "@/types";
import type { AdminProfile, AdminRole, AdminSection } from "@/types";
import {
  listAdminUsers,
  createAdminUser,
  updateAdminUser,
  resetAdminUserPassword,
  deleteAdminUser,
} from "@/lib/services/users";

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent";
const labelClass =
  "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
const cardClass =
  "bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700";

// Sections an admin can be granted (Dashboard always shown first).
const GRANTABLE: AdminSection[] = [...ADMIN_SECTIONS];

function PermissionCheckboxes({
  value,
  onChange,
  disabled,
}: {
  value: AdminSection[];
  onChange: (next: AdminSection[]) => void;
  disabled?: boolean;
}) {
  const toggle = (s: AdminSection) => {
    onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s]);
  };
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {GRANTABLE.map((s) => (
        <label
          key={s}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm capitalize cursor-pointer transition-colors ${
            disabled
              ? "opacity-60 cursor-not-allowed border-gray-200 dark:border-gray-700"
              : value.includes(s)
              ? "border-coral bg-coral/10 text-coral"
              : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          <input
            type="checkbox"
            className="accent-coral"
            checked={value.includes(s)}
            disabled={disabled}
            onChange={() => toggle(s)}
          />
          {s}
        </label>
      ))}
    </div>
  );
}

function CreateUserForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("staff");
  const [permissions, setPermissions] = useState<AdminSection[]>([
    "products",
    "categories",
  ]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setEmail("");
    setFullName("");
    setPassword("");
    setRole("staff");
    setPermissions(["products", "categories"]);
  };

  const submit = async () => {
    if (!email.trim() || !password) {
      toast.error("Email and password are required");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      await createAdminUser({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        role,
        permissions: role === "super_admin" ? [...ADMIN_SECTIONS] : permissions,
      });
      toast.success("User created");
      reset();
      setOpen(false);
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="gap-2">
        <UserPlus className="w-4 h-4" /> Add user
      </Button>
    );
  }

  return (
    <div className={`${cardClass} space-y-4`}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 dark:text-white">New admin user</h2>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Email *</label>
          <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@example.com" />
        </div>
        <div>
          <label className={labelClass}>Full name</label>
          <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Optional" />
        </div>
        <div>
          <label className={labelClass}>Temporary password *</label>
          <input className={inputClass} type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" />
        </div>
        <div>
          <label className={labelClass}>Role</label>
          <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
            <option value="staff">Staff (limited)</option>
            <option value="super_admin">Super admin (full access)</option>
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Section access</label>
        <PermissionCheckboxes
          value={role === "super_admin" ? [...ADMIN_SECTIONS] : permissions}
          onChange={setPermissions}
          disabled={role === "super_admin"}
        />
        {role === "super_admin" && (
          <p className="text-xs text-gray-500 mt-2">Super admins always have every section.</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={submit} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Create user
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function UserRow({
  u,
  selfId,
  onChanged,
}: {
  u: AdminProfile;
  selfId: string | undefined;
  onChanged: () => void;
}) {
  const isSelf = u.id === selfId;
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState<AdminRole>(u.role);
  const [permissions, setPermissions] = useState<AdminSection[]>(u.permissions || []);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await updateAdminUser(u.id, {
        role,
        permissions: role === "super_admin" ? [...ADMIN_SECTIONS] : permissions,
      });
      toast.success("Permissions updated");
      setEditing(false);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    setBusy(true);
    try {
      await updateAdminUser(u.id, { is_active: !u.is_active });
      toast.success(u.is_active ? "User deactivated" : "User activated");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    const pw = window.prompt(`New password for ${u.email} (min 8 chars):`);
    if (!pw) return;
    if (pw.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      await resetAdminUserPassword(u.id, pw);
      toast.success("Password reset");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete ${u.email}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteAdminUser(u.id);
      toast.success("User deleted");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${cardClass} ${!u.is_active ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 dark:text-white truncate">
              {u.full_name || u.email}
            </span>
            {u.role === "super_admin" && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-coral/10 text-coral">
                <ShieldCheck className="w-3 h-3" /> Super admin
              </span>
            )}
            {isSelf && <span className="text-xs text-gray-400">(you)</span>}
            {!u.is_active && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                Inactive
              </span>
            )}
          </div>
          {u.full_name && <p className="text-sm text-gray-500 truncate">{u.email}</p>}
          {u.role !== "super_admin" && (
            <div className="flex flex-wrap gap-1 mt-2">
              {u.permissions.length === 0 ? (
                <span className="text-xs text-gray-400">No sections</span>
              ) : (
                u.permissions.map((p) => (
                  <span key={p} className="text-xs capitalize px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {p}
                  </span>
                ))
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button title="Reset password" onClick={resetPassword} disabled={busy} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
            <KeyRound className="w-4 h-4" />
          </button>
          {!isSelf && (
            <button title="Delete" onClick={remove} disabled={busy} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)} disabled={busy}>
          {editing ? "Close" : "Edit access"}
        </Button>
        {!isSelf && (
          <Button variant="outline" size="sm" onClick={toggleActive} disabled={busy}>
            {u.is_active ? "Deactivate" : "Activate"}
          </Button>
        )}
      </div>

      {editing && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
          <div>
            <label className={labelClass}>Role</label>
            <select
              className={inputClass}
              value={role}
              onChange={(e) => setRole(e.target.value as AdminRole)}
              disabled={isSelf}
            >
              <option value="staff">Staff (limited)</option>
              <option value="super_admin">Super admin (full access)</option>
            </select>
            {isSelf && <p className="text-xs text-gray-500 mt-1">You can&apos;t change your own role.</p>}
          </div>
          <div>
            <label className={labelClass}>Section access</label>
            <PermissionCheckboxes
              value={role === "super_admin" ? [...ADMIN_SECTIONS] : permissions}
              onChange={setPermissions}
              disabled={role === "super_admin"}
            />
          </div>
          <Button onClick={save} disabled={busy} size="sm" className="gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save changes
          </Button>
        </div>
      )}
    </div>
  );
}

function UsersPageInner() {
  const { user } = useAdminAuth();
  const [users, setUsers] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await listAdminUsers());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
          <p className="text-sm text-gray-500">Manage admin accounts and what each can access.</p>
        </div>
      </div>

      <CreateUserForm onCreated={load} />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-coral" />
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <UserRow key={u.id} u={u} selfId={user?.id} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <AdminShell>
      <UsersPageInner />
    </AdminShell>
  );
}
