import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Thème : choix mémorisé, sinon préférence du système
try {
  const t = localStorage.getItem("mami-theme");
  if (t === "dark" || (!t && window.matchMedia("(prefers-color-scheme: dark)").matches)) document.documentElement.classList.add("dark");
} catch { /* ignore */ }

createRoot(document.getElementById("root")!).render(<App />);
