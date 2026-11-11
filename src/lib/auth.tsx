import type { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type Shop = {
  id: string;
  slug: string;
  name: string;
  is_open: boolean;
  line_mode: 'shared' | 'pick_barber';
  default_service_minutes: number;
  timezone: string;
};

type AuthValue = {
  /** null = logged out. Holds the user's id, email and access token. */
  session: Session | null;
  /** The shop this staff member belongs to (null = hasn't created one yet). */
  shop: Shop | null;
  role: 'owner' | 'staff' | null;
  /** true until we know both the session and the shop. Show a spinner. */
  loading: boolean;
  refreshShop: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [role, setRole] = useState<AuthValue['role']>(null);
  const [loading, setLoading] = useState(true);

  // Look up "which shop do I work at?". RLS only returns the user's own
  // shop_members rows, and `shops(*)` follows the foreign key to the shop.
  const loadShop = useCallback(async (s: Session | null) => {
    if (!supabase || !s) {
      setShop(null);
      setRole(null);
      return;
    }
    const { data, error } = await supabase
      .from('shop_members')
      .select('role, shops(*)')
      .eq('user_id', s.user.id)
      .order('created_at')
      .limit(1)
      .maybeSingle();
    if (error) console.warn('loadShop', error.message);
    // supabase-js types an embedded row loosely, so cast it to our shape.
    setShop((data?.shops as unknown as Shop) ?? null);
    setRole((data?.role as AuthValue['role']) ?? null);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let alive = true;
    let lastUserId: string | null | undefined; // undefined = not checked yet

    // Fires once right away with the saved login (INITIAL_SESSION), so the
    // barber stays logged in across restarts, then on every sign-in/out and
    // token refresh.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      const userId = s?.user.id ?? null;
      if (userId === lastUserId) return; // just a token refresh: nothing to reload
      lastUserId = userId;

      // A different user (or first load): reload their shop before the app
      // decides where to send them. Don't await inside this callback
      // (supabase-js recommends it), so schedule the query instead.
      setLoading(true);
      setTimeout(async () => {
        await loadShop(s);
        if (alive) setLoading(false);
      }, 0);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [loadShop]);

  const refreshShop = useCallback(() => loadShop(session), [loadShop, session]);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    setShop(null);
    setRole(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, shop, role, loading, refreshShop, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
