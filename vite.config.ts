import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'radix-dialog': ['@radix-ui/react-dialog'],
          'radix-dropdown': ['@radix-ui/react-dropdown-menu'],
          'radix-select': ['@radix-ui/react-select'],
          'radix-tabs': ['@radix-ui/react-tabs'],
          'radix-toast': ['@radix-ui/react-toast'],
          'radix-sheet': ['@radix-ui/react-sheet'],
          'radix-accordion': ['@radix-ui/react-accordion'],
          'admin-vendor': [
            '@radix-ui/react-slider',
          ],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
}));
