import { lazy, Suspense } from "react";
import { createBrowserRouter, createHashRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { GeoProvider } from "@/hooks/useGeo";
import { Layout } from "@/components/layout/Layout";
import { RequireAuth } from "@/components/RequireAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Spinner } from "@/components/ui/misc";
import Home from "@/pages/Home";

// Chargement à la demande : la page d'accueil reste légère.
const Explore = lazy(() => import("@/pages/Explore"));
const Dish = lazy(() => import("@/pages/Dish"));
const Cook = lazy(() => import("@/pages/Cook"));
const Cart = lazy(() => import("@/pages/Cart"));
const Order = lazy(() => import("@/pages/Order"));
const Orders = lazy(() => import("@/pages/Orders"));
const Account = lazy(() => import("@/pages/Account"));
const Favorites = lazy(() => import("@/pages/Favorites"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const BecomeCook = lazy(() => import("@/pages/BecomeCook"));
const Login = lazy(() => import("@/pages/Auth").then((m) => ({ default: m.Login })));
const Signup = lazy(() => import("@/pages/Auth").then((m) => ({ default: m.Signup })));
const ForgotPassword = lazy(() => import("@/pages/Auth").then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import("@/pages/Auth").then((m) => ({ default: m.ResetPassword })));
const CookLayout = lazy(() => import("@/pages/cook/CookLayout"));
const CookOverview = lazy(() => import("@/pages/cook/Overview"));
const CookOrders = lazy(() => import("@/pages/cook/Orders"));
const CookDishes = lazy(() => import("@/pages/cook/Dishes"));
const CookDrops = lazy(() => import("@/pages/cook/Drops"));
const CookPayments = lazy(() => import("@/pages/cook/Payments"));
const CookReviews = lazy(() => import("@/pages/cook/Reviews"));
const CookSettings = lazy(() => import("@/pages/cook/Settings"));
const Admin = lazy(() => import("@/pages/admin/Admin"));
const courier = () => import("@/pages/courier/Courier");
const BecomeCourier = lazy(() => courier().then((m) => ({ default: m.BecomeCourier })));
const CourierLayout = lazy(() => courier().then((m) => ({ default: m.CourierLayout })));
const CourierMissions = lazy(() => courier().then((m) => ({ default: m.CourierMissions })));
const CourierDelivery = lazy(() => courier().then((m) => ({ default: m.CourierDelivery })));
const CourierEarnings = lazy(() => courier().then((m) => ({ default: m.CourierEarnings })));
const CourierHistory = lazy(() => courier().then((m) => ({ default: m.CourierHistory })));
const CourierProfile = lazy(() => courier().then((m) => ({ default: m.CourierProfile })));
const CookStats = lazy(() => import("@/pages/cook/Stats"));
const CookLegal = lazy(() => import("@/pages/cook/Legal"));
const LegalGuide = lazy(() => import("@/pages/LegalGuide"));
const Receipt = lazy(() => import("@/pages/Receipt"));
const MySpace = lazy(() => import("@/pages/MySpace"));
const Legal = lazy(() => import("@/pages/legal/Legal"));
const Help = lazy(() => import("@/pages/Help"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, retry: (n, e) => n < 2 && !String((e as Error)?.message).includes("JWT"), refetchOnWindowFocus: true },
  },
});

const page = (el: React.ReactNode) => <Suspense fallback={<div className="flex justify-center py-24"><Spinner /></div>}>{el}</Suspense>;
const auth = (el: React.ReactNode, opts: { cook?: boolean; staff?: boolean } = {}) => page(<RequireAuth {...opts}>{el}</RequireAuth>);

// Version de prévisualisation (hébergée dans un sous-dossier) : routage par #.
const createRouter = import.meta.env.VITE_HASH_ROUTER ? createHashRouter : createBrowserRouter;
const router = createRouter([
  {
    element: <Layout />,
    errorElement: <ErrorBoundary />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/explorer", element: page(<Explore />) },
      { path: "/plat/:dropId", element: page(<Dish />) },
      { path: "/cuisine/:slug", element: page(<Cook />) },
      { path: "/panier", element: page(<Cart />) },
      { path: "/connexion", element: page(<Login />) },
      { path: "/inscription", element: page(<Signup />) },
      { path: "/mot-de-passe-oublie", element: page(<ForgotPassword />) },
      { path: "/nouveau-mot-de-passe", element: auth(<ResetPassword />) },
      { path: "/devenir-cuisinier", element: page(<BecomeCook />) },
      { path: "/commandes", element: auth(<Orders />) },
      { path: "/commande/:id", element: auth(<Order />) },
      { path: "/commande/:id/recu", element: auth(<Receipt />) },
      { path: "/mon-espace", element: auth(<MySpace />) },
      { path: "/devenir-livreur", element: page(<BecomeCourier />) },
      { path: "/guide-legal", element: page(<LegalGuide />) },
      { path: "/guide-legal/:country", element: page(<LegalGuide />) },
      {
        path: "/livreur",
        element: auth(<CourierLayout />),
        children: [
          { index: true, element: page(<CourierMissions />) },
          { path: "course/:id", element: page(<CourierDelivery />) },
          { path: "gains", element: page(<CourierEarnings />) },
          { path: "historique", element: page(<CourierHistory />) },
          { path: "profil", element: page(<CourierProfile />) },
        ],
      },
      { path: "/compte", element: auth(<Account />) },
      { path: "/favoris", element: auth(<Favorites />) },
      { path: "/notifications", element: auth(<Notifications />) },
      {
        path: "/cuisine/tableau-de-bord",
        element: auth(<CookLayout />, { cook: true }),
        children: [
          { index: true, element: page(<CookOverview />) },
          { path: "commandes", element: page(<CookOrders />) },
          { path: "plats", element: page(<CookDishes />) },
          { path: "ventes", element: page(<CookDrops />) },
          { path: "paiements", element: page(<CookPayments />) },
          { path: "statistiques", element: page(<CookStats />) },
          { path: "legal", element: page(<CookLegal />) },
          { path: "avis", element: page(<CookReviews />) },
          { path: "parametres", element: page(<CookSettings />) },
        ],
      },
      { path: "/admin", element: auth(<Admin />, { staff: true }) },
      { path: "/legal", element: page(<Legal />) },
      { path: "/legal/:page", element: page(<Legal />) },
      { path: "/aide", element: page(<Help />) },
      { path: "/aide/:topic", element: page(<Help />) },
      { path: "*", element: page(<NotFound />) },
    ],
  },
]);

export default function App() {
  return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <GeoProvider>
            <CartProvider>
              <RouterProvider router={router} />
              <Toaster position="top-center" richColors closeButton />
            </CartProvider>
          </GeoProvider>
        </AuthProvider>
      </QueryClientProvider>
  );
}
