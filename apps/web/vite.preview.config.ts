// Construction de l'aperçu en ligne (artefact) : noms de fichiers fixes, pour qu'une nouvelle
// publication remplace les fichiers précédents au lieu de les accumuler.
import { defineConfig, mergeConfig } from "vite";
import base from "./vite.config";

export default defineConfig((env) =>
  mergeConfig(typeof base === "function" ? base(env) : base, {
    build: {
      rollupOptions: {
        output: { entryFileNames: "assets/[name].js", chunkFileNames: "assets/[name].js", assetFileNames: "assets/[name][extname]" },
      },
    },
  }),
);
