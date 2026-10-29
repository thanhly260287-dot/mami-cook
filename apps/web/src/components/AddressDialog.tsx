import { useState } from "react";
import { toast } from "sonner";
import { t, type Address } from "@mami/shared";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { createAddress } from "@/lib/api";
import { errorMessage } from "@/lib/utils";
import { AddressAutocomplete, type AddressSuggestion } from "./AddressAutocomplete";

export function AddressDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (a: Address) => void }) {
  const { user } = useAuth();
  const [picked, setPicked] = useState<AddressSuggestion | null>(null);
  const [label, setLabel] = useState("Maison");
  const [line2, setLine2] = useState("");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!picked) return;
    setLoading(true);
    try {
      const a = await createAddress(user!.id, { label, line1: picked.line1, line2, postal_code: picked.postal_code, city: picked.city, instructions, lat: picked.lat, lng: picked.lng, is_default: true });
      onCreated(a);
      onOpenChange(false);
      setPicked(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("Nouvelle adresse")}>
      <div className="space-y-4">
        <Field label={t("Adresse")}><AddressAutocomplete onSelect={setPicked} autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Nom")} htmlFor="addr-label"><Input id="addr-label" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} /></Field>
          <Field label={t("Bât., étage, code")} htmlFor="addr-l2"><Input id="addr-l2" value={line2} onChange={(e) => setLine2(e.target.value)} maxLength={200} /></Field>
        </div>
        <Field label={t("Instructions de livraison")} htmlFor="addr-instr"><Input id="addr-instr" value={instructions} onChange={(e) => setInstructions(e.target.value)} maxLength={300} placeholder={t("Interphone, digicode…")} /></Field>
        <Button className="w-full" disabled={!picked} loading={loading} onClick={save}>{t("Enregistrer l'adresse")}</Button>
      </div>
    </Dialog>
  );
}
