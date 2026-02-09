import type { CapacitorConfig } from '@capacitor/cli';

const appId = process.env.NEXT_PUBLIC_BRAND_APP_ID || 'com.artifio.create';
const appName = process.env.NEXT_PUBLIC_BRAND_APP_NAME || 'Artifio Create';

const config: CapacitorConfig = {
  appId,
  appName,
  // Next.js standalone output — for Capacitor, use `next export` → `out/`
  webDir: 'out',
  server: {
    // In development, load from Next.js dev server
    ...(process.env.NODE_ENV === 'development' && {
      url: 'http://localhost:3000',
      cleartext: true,
    }),
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#ffffff',
  },
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#000000',
    },
  },
};

export default config;
