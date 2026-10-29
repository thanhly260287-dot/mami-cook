import { Outlet, ScrollRestoration } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { MobileTabBar } from "./MobileTabBar";
import { DemoBanner } from "@/components/DemoBanner";

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-card focus:px-4 focus:py-2">Aller au contenu</a>
      <DemoBanner />
      <Navbar />
      <main id="contenu" className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileTabBar />
      <ScrollRestoration />
    </div>
  );
}
