import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";

export default defineConfig({
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  plugins: [react()],
  preview: {
    host: true,
    port: 4173, // optional, defaults to 4173
    allowedHosts: ["codebuddies.onrender.com"],
  },
});
