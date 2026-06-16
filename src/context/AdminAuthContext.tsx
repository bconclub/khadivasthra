"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import type { AdminProfile, AdminSection } from "@/types";

interface AdminAuthContextType {
  user: User | null;
  session: Session | null;
  profile: AdminProfile | null;
  loading: boolean;
  /** True once auth + profile have both resolved. */
  ready: boolean;
  isSuperAdmin: boolean;
  hasPermission: (section: AdminSection) => boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const loadProfile = useCallback(async (uid: string | null) => {
    if (!uid) {
      setProfile(null);
      setProfileLoaded(true);
      return;
    }
    const { data, error } = await supabase
      .from("admin_profiles")
      .select("id, email, full_name, role, permissions, is_active, created_at")
      .eq("id", uid)
      .single();
    if (error || !data || !data.is_active) {
      setProfile(null);
    } else {
      setProfile(data as AdminProfile);
    }
    setProfileLoaded(true);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      loadProfile(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      setProfileLoaded(false);
      loadProfile(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const isSuperAdmin = profile?.role === "super_admin";

  const hasPermission = useCallback(
    (section: AdminSection) => {
      if (!profile || !profile.is_active) return false;
      if (profile.role === "super_admin") return true;
      return profile.permissions.includes(section);
    },
    [profile]
  );

  const ready = !loading && profileLoaded;

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        ready,
        isSuperAdmin,
        hasPermission,
        signIn,
        signOut,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}
