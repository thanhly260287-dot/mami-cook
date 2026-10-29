// Justificatifs légaux exigés selon le pays (formation hygiène, déclaration sanitaire, assurance…).
// mode "owner" : la cuisinière ou le livreur dépose ses documents ; mode "review" : l'équipe les vérifie.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ExternalLink, FileText, Upload, X } from "lucide-react";
import { complianceLabel, complianceStatusLabel, formatDate, t, type ComplianceItem, type ComplianceRole } from "@mami/shared";
import { complianceFileUrl, fetchCompliance, reviewComplianceDocument, submitComplianceDocument, uploadComplianceFile } from "@/lib/api";
import { errorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, Card, Spinner } from "@/components/ui/misc";
import { Field, Input } from "@/components/ui/input";

const DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
const today = () => new Date().toISOString().slice(0, 10);
const isExpired = (i: ComplianceItem) => i.status === "verified" && !!i.expires_on && i.expires_on < today();
const tone = (i: ComplianceItem) =>
  isExpired(i) || i.status === "rejected" ? "danger" : i.status === "verified" ? "success" : i.status === "submitted" ? "warn" : "muted";

export function ComplianceChecklist({ userId, role, mode }: { userId: string; role: ComplianceRole; mode: "owner" | "review" }) {
  const q = useQuery({ queryKey: ["compliance", userId, role], queryFn: () => fetchCompliance(userId, role) });
  if (q.isLoading) return <Spinner />;
  if (q.isError) return <p className="text-sm text-destructive">{errorMessage(q.error)}</p>;
  const items = q.data ?? [];
  const missing = items.filter((i) => i.mandatory && !i.ok).length;
  return (
    <div className="space-y-3" data-testid="compliance">
      <p className={missing ? "text-sm font-semibold text-amber-700" : "text-sm font-semibold text-emerald-700"}>
        {missing ? t("{n} justificatif(s) obligatoire(s) à fournir ou à vérifier", { n: missing }) : t("Dossier complet ✅")}
      </p>
      {items.map((i) => <ComplianceRow key={i.code} item={i} userId={userId} role={role} mode={mode} />)}
    </div>
  );
}

function ComplianceRow({ item: i, userId, role, mode }: { item: ComplianceItem; userId: string; role: ComplianceRole; mode: "owner" | "review" }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState(i.reference ?? "");
  const [issuedOn, setIssuedOn] = useState(i.issued_on ?? "");
  const [expiresOn, setExpiresOn] = useState("");
  const [note, setNote] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["compliance", userId, role] });

  const submit = useMutation({
    mutationFn: async () => {
      const filePath = file ? await uploadComplianceFile(userId, file) : undefined;
      await submitComplianceDocument({ role, code: i.code, reference, issuedOn, expiresOn, filePath });
    },
    onSuccess: () => { toast.success(t("Justificatif envoyé : l'équipe va le vérifier.")); setOpen(false); setFile(null); refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const review = useMutation({
    mutationFn: (approve: boolean) => reviewComplianceDocument(i.doc_id!, approve, note),
    onSuccess: () => { refresh(); qc.invalidateQueries({ queryKey: ["compliance-queue"] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const view = async () => {
    try { window.open(await complianceFileUrl(i.file_path!), "_blank", "noopener"); } catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">{complianceLabel(i.code)} {i.mandatory ? <span className="text-xs font-normal text-destructive">{t("obligatoire")}</span> : <span className="text-xs font-normal text-muted-foreground">{t("conseillé")}</span>}</p>
          <p className="text-xs text-muted-foreground">{i.official_name}</p>
          {i.link && <a href={i.link} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary">{t("En savoir plus")} <ExternalLink className="inline h-3 w-3" /></a>}
        </div>
        <Badge tone={tone(i)}>{complianceStatusLabel(i.status, isExpired(i))}</Badge>
      </div>
      {(i.reference || i.issued_on || i.expires_on) && (
        <p className="mt-2 text-xs text-muted-foreground">
          {i.reference && <>{t("Référence :")} {i.reference} · </>}
          {i.issued_on && <>{t("Délivré le {date}", { date: formatDate(i.issued_on, DATE) })} · </>}
          {i.expires_on && t("Valable jusqu'au {date}", { date: formatDate(i.expires_on, DATE) })}
        </p>
      )}
      {i.status === "rejected" && i.review_note && <p className="mt-2 text-sm text-destructive">{t("Motif du refus :")} {i.review_note}</p>}
      {i.file_path && <button onClick={view} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary"><FileText className="h-4 w-4" />{t("Voir le document")}</button>}

      {mode === "owner" && (open ? (
        <div className="mt-3 space-y-3 border-t pt-3">
          <Field label={t("Document (PDF ou photo, 10 Mo max.)")} htmlFor={`f-${i.code}`}>
            <Input id={`f-${i.code}`} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t("Numéro ou référence")} htmlFor={`r-${i.code}`}><Input id={`r-${i.code}`} value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} /></Field>
            <Field label={t("Date de délivrance")} htmlFor={`d-${i.code}`}><Input id={`d-${i.code}`} type="date" max={today()} value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} /></Field>
            <Field label={t("Date d'expiration (si indiquée)")} htmlFor={`e-${i.code}`}><Input id={`e-${i.code}`} type="date" min={today()} value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} /></Field>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => submit.mutate()} loading={submit.isPending} disabled={!file && !reference.trim()}><Upload />{" "}{t("Envoyer")}</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("Annuler")}</Button>
          </div>
        </div>
      ) : (i.status !== "verified" || isExpired(i) || i.validity_months) && (
        <Button variant="outline" size="sm" className="mt-3" onClick={() => setOpen(true)}>
          <Upload />{" "}{i.status === "missing" ? t("Ajouter") : t("Remplacer")}
        </Button>
      ))}

      {mode === "review" && i.status === "submitted" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
          <Input className="max-w-xs" placeholder={t("Motif (obligatoire en cas de refus)")} value={note} onChange={(e) => setNote(e.target.value)} />
          <Button size="sm" onClick={() => review.mutate(true)} loading={review.isPending}><Check />{" "}{t("Valider")}</Button>
          <Button size="sm" variant="outline" disabled={!note.trim()} onClick={() => review.mutate(false)}><X />{" "}{t("Refuser")}</Button>
        </div>
      )}
    </Card>
  );
}
