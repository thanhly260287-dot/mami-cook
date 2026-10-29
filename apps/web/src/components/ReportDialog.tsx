import { useState } from "react";
import { toast } from "sonner";
import { REPORT_REASONS } from "@mami/shared";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { createReport } from "@/lib/api";
import { errorMessage } from "@/lib/utils";
import { Link } from "react-router-dom";

export function ReportDialog({ open, onOpenChange, targetType, targetId }: {
  open: boolean; onOpenChange: (o: boolean) => void; targetType: "cook" | "dish" | "review" | "order" | "message"; targetId: string;
}) {
  const { user } = useAuth();
  const [reason, setReason] = useState("food_safety");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await createReport({ reporterId: user!.id, targetType, targetId, reason, details });
      toast.success("Merci, notre équipe va examiner votre signalement sous 24 h.");
      onOpenChange(false);
      setDetails("");
    } catch (e) {
      const msg = errorMessage(e);
      toast.error(msg.includes("duplicate") ? "Vous avez déjà signalé ce contenu." : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Signaler un problème" description="Les signalements sont confidentiels.">
      {!user ? (
        <p className="text-sm">Vous devez être <Link to="/connexion" className="font-semibold text-primary">connecté</Link> pour signaler un contenu.</p>
      ) : (
        <div className="space-y-4">
          <Field label="Motif" htmlFor="reason">
            <Select id="reason" value={reason} onChange={(e) => setReason(e.target.value)}>
              {REPORT_REASONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </Select>
          </Field>
          <Field label="Détails (facultatif)" htmlFor="details">
            <Textarea id="details" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={2000} placeholder="Décrivez ce qui s'est passé…" />
          </Field>
          <p className="text-xs text-muted-foreground">En cas d'intoxication ou de réaction allergique grave, appelez le 15 (SAMU) ou le 112.</p>
          <Button className="w-full" variant="destructive" loading={loading} onClick={submit}>Envoyer le signalement</Button>
        </div>
      )}
    </Dialog>
  );
}
