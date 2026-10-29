import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  server: { host: "::", port: 8080 },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "images/**/*"],
      manifest: {
        name: "MAMI COOK",
        short_name: "MAMI COOK",
        description: "Des plats faits maison par les cuisiniers de votre quartier",
        lang: "fr",
        theme_color: "#4fc3f0",
        background_color: "#fcfdfe",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/functions/, /^\/auth/, /^\/rest/],
        runtimeCaching: [
          { urlPattern: /\/storage\/v1\/object\/public\//, handler: "CacheFirst", options: { cacheName: "images", expiration: { maxEntries: 300, maxAgeSeconds: 7 * 86400 } } },
        ],
      },
    }),
  ],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
          map: ["leaflet", "react-leaflet"],
          charts: ["recharts"],
          stripe: ["@stripe/stripe-js", "@stripe/react-stripe-js"],
        },
      },
    },
  },
  test: { environment: "jsdom", globals: true, setupFiles: ["./src/test/setup.ts"] },
});
