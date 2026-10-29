import { DEMO_MODE } from "@/lib/supabase";

export function DemoBanner() {
  if (!DEMO_MODE) return null;
  return (
    <div className="bg-accent px-4 py-2 text-center text-xs font-semibold text-accent-foreground">
      Mode démo : données d'exemple. Connectez Supabase pour activer comptes, commandes et paiements (voir docs/DEPLOIEMENT.md).
    </div>
  );
}
