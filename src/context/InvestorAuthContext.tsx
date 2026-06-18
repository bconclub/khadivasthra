"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import type { Investor } from "@/types";

interface InvestorAuthContextType {
  user: User | null;
  session: Session | null;
  investor: Investor | null;
  loading: boolean;
  /** True once auth + profile have both resolved. */
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const InvestorAuthContext = createContext<InvestorAuthContextType | undefined>(undefined);

export function InvestorAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [investor, setInvestor] = useState<Investor | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const loadProfile = useCallback(async (uid: string | null) => {
    if (!uid) {
      setInvestor(null);
      setProfileLoaded(true);
      return;
    }
    const { data, error } = await supabase
      .from("investor_profiles")
      .select("id, investor_code, full_name, mobile, email, is_active, created_at")
      .eq("id", uid)
      .single();
    if (error || !data || !data.is_active) {
      setInvestor(null);
    } else {
      setInvestor(data as Investor);
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

  const ready = !loading && profileLoaded;

  return (
    <InvestorAuthContext.Provider
      value={{ user, session, investor, loading, ready, signIn, signOut }}
    >
      {children}
    </InvestorAuthContext.Provider>
  );
}

export function useInvestorAuth() {
  const context = useContext(InvestorAuthContext);
  if (context === undefined) {
    throw new Error("useInvestorAuth must be used within an InvestorAuthProvider");
  }
  return context;
}
