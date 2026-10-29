import { t } from "@mami/shared";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { Seo } from "@/components/Seo";

export default function NotFound() {
  return (
    <>
      <Seo title={t("Page introuvable — MAMI COOK")} noindex />
      <EmptyState icon="🍳" title={t("Oups, cette page n'est pas au menu")} action={<Button asChild><Link to="/">{t("Retour à l'accueil")}</Link></Button>}>{t("La page que vous cherchez n'existe pas ou a été déplacée.")}</EmptyState>
    </>
  );
}
