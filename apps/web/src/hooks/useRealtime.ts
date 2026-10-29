import { useEffect } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/** Rafraîchit des requêtes quand une table change (Supabase Realtime, filtré par la RLS). */
export function useRealtime(channel: string, table: string, filter: string | undefined, keys: QueryKey[], enabled = true) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!supabase || !enabled || !filter) return;
    const ch = supabase
      .channel(channel)
      .on("postgres_changes", { event: "*", schema: "public", table, filter }, () => {
        keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      })
      .subscribe();
    return () => { supabase!.removeChannel(ch); };
  }, [channel, table, filter, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
}
