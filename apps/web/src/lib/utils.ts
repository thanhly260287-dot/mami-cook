import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STORAGE_PUBLIC = `${import.meta.env.VITE_SUPABASE_URL ?? ""}/storage/v1/object/public/`;

/** Résout une photo : URL absolue, chemin local (/images/...) ou objet du stockage Supabase. */
export function photoUrl(path: string | null | undefined, fallback = "/images/dishes/placeholder.svg"): string {
  if (!path) return fallback;
  if (path.startsWith("http") || path.startsWith("/") || path.startsWith("blob:")) return path;
  return STORAGE_PUBLIC + path;
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Une erreur est survenue";
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}
