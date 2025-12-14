import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import viteCompression from "vite-plugin-compression";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    ViteImageOptimizer({
      png: { quality: 80 },
      jpeg: { quality: 80 },
      jpg: { quality: 80 },
      webp: { quality: 80 },
    }),
    // Brotli compression
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
    }),
    // Gzip fallback
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    // Bundle analyzer (production only)
    mode === 'production' && visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html',
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Deduplicate critical dependencies to prevent bundle bloat
    dedupe: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'lucide-react'
    ],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      '@tanstack/react-query'
    ],
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false, // Disable source maps in production for security
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console logs for production debugging
        drop_debugger: true,
        pure_funcs: [
          'console.debug', // Remove verbose logs
          'console.trace',
        ],
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Anonymized chunk names for production security
          'v0': ['react', 'react-dom', 'react-router-dom'],
          'v1': ['@supabase/supabase-js'],
          'v2': ['@tanstack/react-query'],
          'v3': ['lucide-react'],
          'v4': ['swiper', 'swiper/react', 'swiper/modules'],
          'v5': ['embla-carousel-react', 'embla-carousel-autoplay'],
          'v6': ['@radix-ui/react-dialog'],
          'v7': ['@radix-ui/react-dropdown-menu'],
          'v8': ['@radix-ui/react-select'],
          'v9': ['@radix-ui/react-tabs'],
          'v10': ['@radix-ui/react-accordion'],
          'v11': ['@radix-ui/react-toast'],
          'v12': [
            '@radix-ui/react-slider',
            '@radix-ui/react-popover',
          ],
        },
        chunkFileNames: 'assets/js/[hash].js',
        entryFileNames: 'assets/js/[hash].js',
        assetFileNames: 'assets/[ext]/[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 1000,
  },
}));
