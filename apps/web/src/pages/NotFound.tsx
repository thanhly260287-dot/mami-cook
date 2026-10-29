import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { Seo } from "@/components/Seo";

export default function NotFound() {
  return (
    <>
      <Seo title="Page introuvable — MAMI COOK" noindex />
      <EmptyState icon="🍳" title="Oups, cette page n'est pas au menu" action={<Button asChild><Link to="/">Retour à l'accueil</Link></Button>}>La page que vous cherchez n'existe pas ou a été déplacée.</EmptyState>
    </>
  );
}
