import { t } from "@mami/shared";
import { Outlet, ScrollRestoration, useLocation } from "react-router-dom";
import { MotionConfig, motion } from "framer-motion";
import { ScrollProgress } from "@/components/motion";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { MobileTabBar } from "./MobileTabBar";
import { DemoBanner } from "@/components/DemoBanner";
import { Assistant } from "@/components/Assistant";

export function Layout() {
  const { pathname } = useLocation();
  return (
    // reducedMotion="user" : animations coupées si le téléphone ou l'ordinateur le demande
    <MotionConfig reducedMotion="user">
    <ScrollProgress />
    <div className="flex min-h-screen flex-col bg-background">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-card focus:px-4 focus:py-2">{t("Aller au contenu")}</a>
      <DemoBanner />
      <Navbar />
      <main id="contenu" className="flex-1 pb-20 md:pb-0">
        {/* Transition douce à chaque changement de page */}
        <motion.div key={pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
          <Outlet />
        </motion.div>
      </main>
      <Footer />
      <MobileTabBar />
      <Assistant />
      <ScrollRestoration />
    </div>
    </MotionConfig>
  );
}
