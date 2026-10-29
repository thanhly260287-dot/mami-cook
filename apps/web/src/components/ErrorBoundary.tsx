import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";

export function ErrorBoundary() {
  const error = useRouteError();
  const chunkError = error instanceof Error && /dynamically imported module|Loading chunk/i.test(error.message);
  if (chunkError) {
    // Nouvelle version déployée : on recharge pour récupérer les nouveaux fichiers.
    window.location.reload();
    return null;
  }
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <p className="mb-4 text-5xl">🫕</p>
      <h1 className="text-2xl font-bold">Quelque chose a débordé…</h1>
      <p className="mt-2 max-w-md text-muted-foreground">{isRouteErrorResponse(error) ? error.statusText : "Une erreur inattendue est survenue. Réessayez dans un instant."}</p>
      <Link to="/" className="mt-6 rounded-xl gradient-primary px-6 py-3 font-semibold text-white">Retour à l'accueil</Link>
    </div>
  );
}
