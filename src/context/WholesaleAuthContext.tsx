"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import type { WholesaleAccount } from "@/types";

interface WholesaleAuthContextType {
  user: User | null;
  session: Session | null;
  /** The buyer's trade account, whether or not it has been approved yet. */
  account: WholesaleAccount | null;
  /** Approved buyers only — the gate the catalogue checks. */
  approved: boolean;
  loading: boolean;
  /** True once auth *and* the account row have both resolved. */
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAccount: () => Promise<void>;
}

const WholesaleAuthContext = createContext<WholesaleAuthContextType | undefined>(undefined);

export function WholesaleAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [account, setAccount] = useState<WholesaleAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const loadProfile = useCallback(async (uid: string | null) => {
    if (!uid) {
      setAccount(null);
      setProfileLoaded(true);
      return;
    }
    // maybeSingle, not single: a freshly signed-up user has no row yet and that
    // is a normal state, not an error.
    const { data } = await supabase
      .from("wholesale_accounts")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
    setAccount((data as WholesaleAccount) ?? null);
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

  const refreshAccount = async () => {
    setProfileLoaded(false);
    await loadProfile(user?.id ?? null);
  };

  const ready = !loading && profileLoaded;

  return (
    <WholesaleAuthContext.Provider
      value={{
        user,
        session,
        account,
        approved: account?.is_active === true,
        loading,
        ready,
        signIn,
        signOut,
        refreshAccount,
      }}
    >
      {children}
    </WholesaleAuthContext.Provider>
  );
}

export function useWholesaleAuth() {
  const context = useContext(WholesaleAuthContext);
  if (context === undefined) {
    throw new Error("useWholesaleAuth must be used within a WholesaleAuthProvider");
  }
  return context;
}
