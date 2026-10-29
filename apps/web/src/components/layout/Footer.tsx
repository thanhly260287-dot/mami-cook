import { Link } from "react-router-dom";

const cols = [
  { title: "Découvrir", links: [["Cuisines près de moi", "/explorer"], ["Le Labo", "/explorer?cuisine=lab"], ["Plats congelés", "/explorer?temperature=frozen"], ["Desserts", "/explorer?cuisine=dessert"]] },
  { title: "Devenir Cook", links: [["Comment ça marche", "/devenir-cuisinier"], ["Règles d'hygiène", "/aide/hygiene"], ["Commissions & versements", "/aide#paiements"]] },
  { title: "Aide", links: [["Centre d'aide", "/aide"], ["Contact", "/aide#contact"], ["Signaler un problème", "/aide#signaler"]] },
  { title: "Légal", links: [["CGU", "/legal/cgu"], ["Confidentialité", "/legal/confidentialite"], ["Cookies", "/legal/cookies"], ["Mentions légales", "/legal/mentions"]] },
] as const;

export function Footer() {
  return (
    <footer className="bg-[hsl(215_25%_12%)] py-12 text-white/80 pb-[calc(3rem+env(safe-area-inset-bottom))]">
      <div className="container">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <img src={`${import.meta.env.BASE_URL}images/logo.svg`} alt="MAMI COOK" className="mb-4 h-8 w-auto brightness-[1.8]" />
            <p className="text-sm leading-relaxed text-white/50">La cuisine de la maison, livrée partout. Faite avec ❤️ par de vrais cuisiniers.</p>
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
        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/40">
          © {new Date().getFullYear()} MAMI COOK. Tous droits réservés. · Paiements sécurisés par Stripe
        </div>
      </div>
    </footer>
  );
}
