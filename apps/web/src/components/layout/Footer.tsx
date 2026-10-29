import { t } from "@mami/shared";
import { Link } from "react-router-dom";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const cols = [
  { title: t("Découvrir"), links: [[t("Cuisines près de moi"), "/explorer"], [t("Le Labo"), "/explorer?cuisine=lab"], [t("Plats congelés"), "/explorer?temperature=frozen"], [t("Desserts"), "/explorer?type=dessert"]] },
  { title: t("Rejoindre"), links: [[t("Vendre mes plats"), "/devenir-cuisinier"], [t("Devenir livreur"), "/devenir-livreur"], [t("Règles par pays"), "/guide-legal"], [t("Commissions & versements"), "/aide#paiements"]] },
  { title: t("Aide"), links: [[t("Centre d'aide"), "/aide"], [t("Contact"), "/aide#contact"], [t("Signaler un problème"), "/aide#signaler"]] },
  { title: t("Légal"), links: [[t("CGU"), "/legal/cgu"], [t("Confidentialité"), "/legal/confidentialite"], [t("CGV"), "/legal/cgv"], [t("Vendeurs"), "/legal/vendeurs"], [t("Livreurs"), "/legal/livreurs"], [t("Cookies"), "/legal/cookies"], [t("Mentions légales"), "/legal/mentions"]] },
] as const;

export function Footer() {
  return (
    <footer className="bg-[hsl(215_25%_12%)] py-12 text-white/80 pb-[calc(3rem+env(safe-area-inset-bottom))]">
      <div className="container">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <img src={`${import.meta.env.BASE_URL}images/logo.svg`} alt={t("MAMI COOK")} className="mb-4 h-8 w-auto brightness-[1.8]" />
            <p className="text-sm leading-relaxed text-white/50">{t("La cuisine de la maison, livrée partout. Faite avec ❤️ par de vrais cuisiniers.")}</p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h2 className="mb-3 text-sm font-semibold text-white">{c.title}</h2>
              <ul className="space-y-2 text-sm text-white/55">
                {c.links.map(([label, to]) => <li key={to}><Link to={to} className="hover:text-white">{label}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex justify-center"><LanguageSwitcher className="rounded-xl border border-white/15 px-3 py-2 text-white/80 [&_option]:text-black" /></div>
        <div className="mt-6 border-t border-white/10 pt-6 text-center text-xs text-white/40">
          © {new Date().getFullYear()}{" "}{t("MAMI COOK. Tous droits réservés. · Paiements sécurisés par Stripe")}
        </div>
      </div>
    </footer>
  );
}
