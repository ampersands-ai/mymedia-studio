import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import viteCompression from "vite-plugin-compression";
import { visualizer } from "rollup-plugin-visualizer";
import viteImagemin from "vite-plugin-imagemin";

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
      avif: { quality: 75 }, // AVIF support
    }),
    viteImagemin({
      gifsicle: { optimizationLevel: 3 },
      mozjpeg: { quality: 80 },
      pngquant: { quality: [0.7, 0.8], speed: 4 },
      svgo: {
        plugins: [
          { name: 'removeViewBox', active: false },
          { name: 'removeEmptyAttrs', active: true }
        ]
      }
    }),
    // Brotli compression (best compression ratio)
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 512, // Compress files > 512 bytes
      deleteOriginFile: false,
    }),
    // Gzip fallback (wider browser support)
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 512,
      deleteOriginFile: false,
    }),
    // Bundle analyzer (production only)
    mode === 'production' && visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html',
      template: 'treemap', // Visual treemap of bundle
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
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: true,
        passes: 2, // Multiple passes for better compression
      },
      mangle: {
        safari10: true, // Safari 10+ compatibility
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React libraries
          if (id.includes('node_modules/react') || 
              id.includes('node_modules/react-dom') || 
              id.includes('node_modules/react-router-dom')) {
            return 'react-vendor';
          }
          
          // Supabase
          if (id.includes('@supabase/supabase-js')) {
            return 'supabase';
          }
          
          // React Query
          if (id.includes('@tanstack/react-query')) {
            return 'query-vendor';
          }
          
          // Lucide icons (heavy)
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          
          // Radix UI components (group by type)
          if (id.includes('@radix-ui/react-dialog') || 
              id.includes('@radix-ui/react-alert-dialog')) {
            return 'radix-dialog';
          }
          
          if (id.includes('@radix-ui/react-dropdown-menu') ||
              id.includes('@radix-ui/react-menubar') ||
              id.includes('@radix-ui/react-navigation-menu')) {
            return 'radix-menu';
          }
          
          if (id.includes('@radix-ui/react-select') ||
              id.includes('@radix-ui/react-tabs') ||
              id.includes('@radix-ui/react-accordion')) {
            return 'radix-form';
          }
          
          if (id.includes('@radix-ui/react-toast')) {
            return 'radix-toast';
          }
          
          // Admin-only components (lazy loaded)
          if (id.includes('@radix-ui/react-slider') ||
              id.includes('@radix-ui/react-popover') ||
              id.includes('@xyflow/react')) {
            return 'admin-vendor';
          }
          
          // Chart libraries (heavy, only used on analytics pages)
          if (id.includes('recharts')) {
            return 'charts';
          }
          
          // Other node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) return 'assets/[name]-[hash][extname]';
          
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          
          // Organize by file type
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp|avif/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[ext]/[name]-[hash][extname]`;
        },
      },
      // Tree shaking for better optimization
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
      },
    },
    chunkSizeWarningLimit: 1000,
    // Enable source maps only in development
    sourcemap: mode === 'development',
    // Improve build performance
    reportCompressedSize: false,
  },
}));
