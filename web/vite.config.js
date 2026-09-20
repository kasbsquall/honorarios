import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  // El puerto lo fija el recorrido principal, e2e/demo.mjs, que apunta a 5196 por defecto.
  // Con el 5173 de serie, `npm run dev` levantaba un servidor al que los guiones no llegan.
  server: { port: 5196 },
  build: {
    rollupOptions: {
      input: { main: resolve(__dirname, "index.html"), pay: resolve(__dirname, "pay.html") },
    },
  },
});
