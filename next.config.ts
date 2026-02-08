import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Skip ESLint during build (run separately in CI)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.in',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Security headers
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
        {
          key: 'Permissions-Policy',
          value: 'geolocation=(), microphone=(), camera=()',
        },
      ],
    },
  ],

  // Redirects (migrated from React Router Navigate components)
  redirects: async () => [
    {
      source: '/templates',
      destination: '/dashboard/templates',
      permanent: false,
    },
    {
      source: '/custom-creation',
      destination: '/dashboard/custom-creation',
      permanent: false,
    },
    {
      source: '/backgrounds',
      destination: '/dashboard/backgrounds',
      permanent: false,
    },
    {
      source: '/generator',
      destination: '/dashboard/generator',
      permanent: false,
    },
    {
      source: '/cinematic-test',
      destination: '/',
      permanent: false,
    },
  ],

  // Webpack customization
  webpack: (config, { isServer }) => {
    // Handle Capacitor packages (client-only, skip on server)
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push(
        '@capacitor/app',
        '@capacitor/core',
        '@capacitor/camera',
        '@capacitor/filesystem',
        '@capacitor/haptics',
        '@capacitor/share',
        '@capacitor/status-bar',
      );
    }

    return config;
  },

  // Enable experimental features
  experimental: {
    // Optimize package imports for better tree-shaking
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-accordion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
      'recharts',
      'date-fns',
      'framer-motion',
    ],
  },

  // Transpile specific packages that need it
  transpilePackages: ['@supabase/ssr'],

  // Output configuration
  output: 'standalone',

  // PoweredByHeader
  poweredByHeader: false,
};

export default nextConfig;
