import { expect, test, type Page } from "@playwright/test";

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    // Les ressources externes (polices, tuiles de carte) peuvent être indisponibles en CI.
    if (m.type() === "error" && /Content Security Policy|Refused to/i.test(m.text())) errors.push(m.text());
  });
  return errors;
}

test("accueil : plats affichés, sans erreur ni violation CSP", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("à la maison");
  await expect(page.getByText("Lasagnes Maison Bolognaise").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("stock : impossible de dépasser les portions restantes", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Lasagnes Maison Bolognaise/ }).first().click();
  const plus = page.getByRole("button", { name: "Ajouter un" });
  for (let i = 0; i < 3; i++) await plus.click();
  await expect(plus).toBeDisabled();
});

test("parcours : fiche plat → panier avec remise volume", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await page.getByRole("link", { name: /Ramen Tonkotsu Maison/ }).first().click();
  await expect(page.getByRole("heading", { name: "Ramen Tonkotsu Maison" })).toBeVisible();
  await expect(page.getByText("Allergènes", { exact: true })).toBeVisible();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Ajouter un" }).click();
  await page.getByRole("button", { name: /Ajouter · / }).click();
  await page.goto("/panier");
  await expect(page.getByText("Remise volume")).toHaveCount(0);
  await page.getByRole("button", { name: "Ajouter un" }).first().click();
  await expect(page.getByText("Remise volume")).toBeVisible();
  expect(errors).toEqual([]);
});

test("recherche", async ({ page }) => {
  await page.goto("/explorer?q=tajine");
  await expect(page.getByText("Tajine Poulet Citron Confit")).toBeVisible();
  await expect(page.getByText("Lasagnes Maison Bolognaise")).toHaveCount(0);
});

test("pages protégées en mode démo", async ({ page }) => {
  await page.goto("/commandes");
  await expect(page.getByText(/indisponible en mode démo/i)).toBeVisible();
});

test("pages légales et 404", async ({ page }) => {
  await page.goto("/legal/cgu");
  await expect(page.getByRole("heading", { name: /Conditions générales/ })).toBeVisible();
  await page.goto("/nimporte-quoi");
  await expect(page.getByText(/pas au menu/)).toBeVisible();
});

test("guide légal par pays (France, Suisse)", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/guide-legal");
  await expect(page.getByText("Déclarer votre activité à la DDPP")).toBeVisible();
  // France : formation hygiène et déclaration DDPP exigées avant la première vente
  await expect(page.getByText("✅ Formation hygiène alimentaire (14 h)")).toBeVisible();
  await expect(page.getByText("✅ Déclarer votre activité à la DDPP")).toBeVisible();
  await page.goto("/guide-legal/CH");
  await expect(page.getByText("Annonce au chimiste cantonal")).toBeVisible();
  await expect(page.getByText("Livraison via une agence partenaire")).toBeVisible();
  expect(errors).toEqual([]);
});

test("devenir livreur : avantages, droits et démarches", async ({ page }) => {
  await page.goto("/devenir-livreur");
  await expect(page.getByText("Refuser une course n'a aucune conséquence")).toBeVisible();
  await expect(page.getByText("Statut de micro-entrepreneur")).toBeVisible();
});

test("filtre desserts", async ({ page }) => {
  await page.goto("/explorer?type=dessert");
  await expect(page.getByRole("tablist", { name: "Type de plat" }).getByRole("tab", { name: /^🍰 Dessert$/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Lasagnes Maison Bolognaise")).toHaveCount(0);
});

test("en-têtes de sécurité présents", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["strict-transport-security"]).toContain("max-age");
});

test("langues : détection du navigateur, changement de langue et arabe de droite à gauche", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "en-GB" });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("at home");
  await page.getByRole("combobox", { name: "Language" }).last().selectOption("ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("في البيت");
  await ctx.close();
});

test("tableau de bord de l'équipe (démo) : ventes, plats et desserts, vendeurs, installations", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/admin");
  await expect(page.getByText("Total des ventes (EUR)")).toBeVisible();
  await expect(page.getByText("Nombre de commandes")).toBeVisible();
  await expect(page.getByText("Desserts et pâtisseries vendus")).toBeVisible();
  await expect(page.getByText("Vendeurs ayant vendu")).toBeVisible();
  await expect(page.getByText("Installations", { exact: true })).toBeVisible();
  await expect(page.getByText("Tiramisu Artisanal")).toBeVisible();
  // Filtre par ville : Lyon n'affiche que ses cuisines
  await expect(page.getByText("Ventes par ville")).toBeVisible();
  await page.getByLabel("Ville").selectOption("Lyon");
  await expect(page.getByText(/Filtré sur Lyon/)).toBeVisible();
  await expect(page.getByText("Butter Chicken & Naan")).toBeVisible();
  await expect(page.getByText("Tiramisu Artisanal")).toHaveCount(0);
  await page.getByLabel("Ville").selectOption("");
  await expect(page.getByText("Tiramisu Artisanal")).toBeVisible();
  // En démo, les onglets qui exigent une vraie base sont masqués
  await expect(page.getByRole("button", { name: "Candidatures" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("accueil : carrousel de photos (4 photos, points cliquables)", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");
  const dots = page.getByRole("button", { name: /^Photo \d$/ });
  await expect(dots).toHaveCount(4);
  await page.getByRole("button", { name: "Photo 3" }).click();
  await expect(page.getByRole("button", { name: "Photo 3" })).toHaveAttribute("aria-current", "true");
  await expect(page.locator('section img[src$="hero-2.jpg"]')).toHaveClass(/opacity-100/);
  expect(errors).toEqual([]);
});
