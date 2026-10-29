// Guide public : que faut-il pour vendre ses plats ou livrer, pays par pays.
import { Link, useNavigate, useParams } from "react-router-dom";
import { COUNTRY_OPTIONS, countryFlag, countryName, euCommonSteps, getCountryGuide, t } from "@mami/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { Select } from "@/components/ui/input";
import { Seo } from "@/components/Seo";
import { Steps } from "@/pages/cook/Legal";

export default function LegalGuide() {
  const { country = "FR" } = useParams();
  const navigate = useNavigate();
  const code = COUNTRY_OPTIONS.some((c) => c.code === country.toUpperCase()) ? country.toUpperCase() : "FR";
  const g = getCountryGuide(code);
  return (
    <div className="container max-w-4xl py-10">
      <Seo title={t("Cuisiner et vendre depuis chez soi : les règles par pays — MAMI COOK")} description={t("Déclaration, formation hygiène, statut, assurance : les démarches pour vendre vos plats faits maison ou devenir livreur.")} />
      <h1 className="text-3xl font-extrabold md:text-4xl">{t("Les règles pour cuisiner et livrer depuis chez soi")}</h1>
      <p className="mt-2 text-muted-foreground">{t("Choisissez votre pays : nous vous expliquons simplement les démarches.")}</p>
      <div className="mt-6 max-w-xs">
        <Select value={code} onChange={(e) => navigate(`/guide-legal/${e.target.value}`)} aria-label={t("Pays")}>
          {COUNTRY_OPTIONS.map((c) => <option key={c.code} value={c.code}>{c.flag} {countryName(c.code)}</option>)}
        </Select>
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-bold">👩‍🍳 {t("Vendre mes plats")} {countryFlag(code)}</h2>
          <Steps steps={g.cook} />
          <Button className="mt-6" asChild><Link to="/devenir-cuisinier">{t("Devenir Mami Cook")}</Link></Button>
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-bold">🛵 {t("Livrer")} {countryFlag(code)}</h2>
          <Steps steps={g.courier} />
          <Button className="mt-6" variant="outline" asChild><Link to="/devenir-livreur">{t("Devenir livreur")}</Link></Button>
        </Card>
      </div>
      {g.eu && (
        <Card className="mt-6 p-6">
          <h2 className="mb-4 text-xl font-bold">🇪🇺 {t("Dans toute l'Union européenne")}</h2>
          <Steps steps={euCommonSteps()} />
        </Card>
      )}
      <p className="mt-6 text-xs text-muted-foreground">{t("Information générale mise à jour en octobre 2026, qui ne remplace pas un conseil juridique. Les règles peuvent changer : vérifiez auprès des autorités de votre pays.")}</p>
    </div>
  );
}
