// Informations légales de la cuisinière (DSA art. 30, DAC7) et démarches selon son pays.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { BUSINESS_STATUSES, countryFlag, countryName, euCommonSteps, getCountryGuide, t } from "@mami/shared";
import { fetchCookLegal, saveCookLegal } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, Spinner } from "@/components/ui/misc";
import { Field, Input, Select } from "@/components/ui/input";

const FIELDS = ["legal_name", "birth_date", "tax_id", "vat_number", "business_status", "registration_number", "food_registration_ref", "hygiene_training_at"] as const;

export default function CookLegalPage() {
  const { cook, user } = useAuth();
  const country = cook?.country ?? "FR";
  const q = useQuery({ queryKey: ["cook-legal"], queryFn: () => fetchCookLegal(user!.id) });
  const [f, setF] = useState<Record<string, string>>({});
  const [insured, setInsured] = useState(false);
  useEffect(() => {
    if (!q.data) return;
    setF(Object.fromEntries(FIELDS.map((k) => [k, q.data?.[k] ?? (k === "business_status" ? "individual_occasional" : "")])));
    setInsured(!!q.data.insurance_declared_at);
  }, [q.data]);
  const save = useMutation({
    mutationFn: () => saveCookLegal(user!.id, {
      ...Object.fromEntries(FIELDS.map((k) => [k, f[k]?.trim() || null])),
      insurance_declared_at: insured ? (q.data?.insurance_declared_at ?? new Date().toISOString()) : null,
    }),
    onSuccess: () => toast.success(t("Informations enregistrées")),
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (q.isLoading) return <Spinner />;
  const guide = getCountryGuide(country);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <Card className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-bold">{t("Mes informations légales")}</h2>
          <p className="text-sm text-muted-foreground">{t("La loi européenne oblige MAMI COOK à vérifier l'identité des vendeurs (DSA) et à déclarer leurs revenus aux impôts une fois par an (DAC7). Ces informations restent confidentielles.")}</p>
        </div>
        <Field label={t("Nom et prénom (comme sur la pièce d'identité)")} htmlFor="l-name"><Input id="l-name" value={f.legal_name ?? ""} onChange={set("legal_name")} maxLength={120} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Date de naissance")} htmlFor="l-birth"><Input id="l-birth" type="date" value={f.birth_date ?? ""} onChange={set("birth_date")} /></Field>
          <Field label={t("Numéro fiscal")} htmlFor="l-tax"><Input id="l-tax" value={f.tax_id ?? ""} onChange={set("tax_id")} maxLength={40} /></Field>
        </div>
        <Field label={t("Statut")} htmlFor="l-status" hint={t("Un « particulier » est affiché comme tel aux clients ; un professionnel est affiché avec un badge « Pro ».")}>
          <Select id="l-status" value={f.business_status ?? "individual_occasional"} onChange={set("business_status")}>
            {BUSINESS_STATUSES.map((b) => <option key={b.id} value={b.id}>{t(b.label)}</option>)}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Numéro d'entreprise (SIRET, BCE…)")} htmlFor="l-reg"><Input id="l-reg" value={f.registration_number ?? ""} onChange={set("registration_number")} maxLength={60} /></Field>
          <Field label={t("Numéro de TVA")} htmlFor="l-vat"><Input id="l-vat" value={f.vat_number ?? ""} onChange={set("vat_number")} maxLength={40} /></Field>
        </div>
        <Field label={t("Référence d'enregistrement sanitaire")} htmlFor="l-food" hint={t("France : récépissé de déclaration DDPP ; Belgique : numéro AFSCA ; Suisse : annonce cantonale…")}>
          <Input id="l-food" value={f.food_registration_ref ?? ""} onChange={set("food_registration_ref")} maxLength={80} />
        </Field>
        <Field label={t("Date de votre formation à l'hygiène")} htmlFor="l-hyg"><Input id="l-hyg" type="date" value={f.hygiene_training_at ?? ""} onChange={set("hygiene_training_at")} /></Field>
        <label className="flex gap-3 text-sm"><input type="checkbox" checked={insured} onChange={(e) => setInsured(e.target.checked)} className="mt-1" />{t("Je déclare être couvert(e) par une assurance responsabilité civile.")}</label>
        <Button onClick={() => save.mutate()} loading={save.isPending}>{t("Enregistrer")}</Button>
      </Card>
      <div className="space-y-4">
        <Card className="p-5">
          <h2 className="mb-3 font-bold">{countryFlag(country)} {t("Vos démarches en {country}", { country: countryName(country) })}</h2>
          <Steps steps={guide.cook} />
          {guide.eu && <><h3 className="mb-2 mt-4 text-sm font-bold">🇪🇺 {t("Dans toute l'Union européenne")}</h3><Steps steps={euCommonSteps()} /></>}
          <Link to={`/guide-legal/${country}`} className="mt-3 inline-block text-sm font-semibold text-primary">{t("Guide complet →")}</Link>
        </Card>
        <p className="px-1 text-xs text-muted-foreground">{t("Information générale, pas un conseil juridique. En cas de doute, renseignez-vous auprès de votre mairie ou d'un expert-comptable.")}</p>
      </div>
    </div>
  );
}

export function Steps({ steps }: { steps: ReturnType<typeof euCommonSteps> }) {
  return (
    <ul className="space-y-3 text-sm">{steps.map((s) => (
      <li key={s.title}>
        <p className="font-semibold">{s.required ? "✅" : "💡"} {s.title}</p>
        <p className="text-muted-foreground">{s.detail}</p>
        {s.link && <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary">{t("En savoir plus")} <ExternalLink className="inline h-3 w-3" /></a>}
      </li>
    ))}</ul>
  );
}
