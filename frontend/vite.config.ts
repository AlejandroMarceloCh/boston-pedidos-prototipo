import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Si se publica en un subdirectorio (…/pedidos/), hay que compilar con
  // BASE_URL=/pedidos/ o los assets se buscan en la raíz y la página sale en
  // blanco.
  base: process.env.BASE_URL || "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
