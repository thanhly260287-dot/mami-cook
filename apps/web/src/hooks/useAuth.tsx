import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Cook, Courier } from "@mami/shared";
import { supabase } from "@/lib/supabase";
import { fetchMyCook, fetchMyCourier, fetchMyRoles } from "@/lib/api";

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  displayName: string;
  cook: Cook | null;
  courier: Courier | null;
  roles: string[];
  isStaff: boolean;
  refreshCook: () => void;
  refreshCourier: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const qc = useQueryClient();

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) qc.clear();
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  const userId = session?.user.id;
  const cookQuery = useQuery({ queryKey: ["my-cook", userId], queryFn: () => fetchMyCook(userId!), enabled: !!userId });
  const courierQuery = useQuery({ queryKey: ["my-courier", userId], queryFn: () => fetchMyCourier(userId!), enabled: !!userId });
  const rolesQuery = useQuery({ queryKey: ["my-roles", userId], queryFn: fetchMyRoles, enabled: !!userId });
  const profileQuery = useQuery({
    queryKey: ["my-profile", userId],
    enabled: !!userId,
    queryFn: async () => (await supabase!.from("profiles").select("display_name, avatar_url").eq("id", userId!).single()).data,
  });

  const value = useMemo<AuthState>(() => ({
    session,
    user: session?.user ?? null,
    loading,
    displayName: profileQuery.data?.display_name ?? session?.user.email?.split("@")[0] ?? "",
    cook: cookQuery.data ?? null,
    courier: courierQuery.data ?? null,
    roles: rolesQuery.data ?? [],
    isStaff: (rolesQuery.data ?? []).length > 0,
    refreshCook: () => qc.invalidateQueries({ queryKey: ["my-cook", userId] }),
    refreshCourier: () => qc.invalidateQueries({ queryKey: ["my-courier", userId] }),
    signOut: async () => {
      await supabase?.auth.signOut();
    },
  }), [session, loading, profileQuery.data, cookQuery.data, courierQuery.data, rolesQuery.data, qc, userId]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth hors AuthProvider");
  return ctx;
}
