import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react({ jsxRuntime: "automatic" })],
  // Vitest transforma los .test.tsx con esbuild, no con el plugin de React:
  // sin esto el JSX se compila a React.createElement y falla por no tener
  // React en scope.
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    // Los tests de lógica corren en node; los de interfaz necesitan DOM.
    // jsdom para todo es más simple que dos proyectos, y el costo es bajo.
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    globals: false,
  },
});
