import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import '@/index.css';

// Force dynamic rendering for all routes (SPA with auth - no static generation)
export const dynamic = 'force-dynamic';

// ─── Default Metadata (overridden per-page via generateMetadata) ─────
const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'artifio.ai';
const brandDescription =
  process.env.NEXT_PUBLIC_BRAND_DESCRIPTION ||
  'Professional AI-powered platform for creating videos, images, music, and more. Generate portrait headshots, cinematic videos, product photography, and social media content instantly. Start free with 5 credits.';

export const metadata: Metadata = {
  title: {
    default: `${brandName} - AI Content Creation Platform`,
    template: `%s - ${brandName}`,
  },
  description: brandDescription,
  keywords:
    'AI video generator, AI image creator, AI content creation, portrait headshots, photo editing, video creation, product photography, social media content, AI tools',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    siteName: brandName,
    title: `${brandName} - AI Content Creation Platform`,
    description: brandDescription,
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

// ─── Dark Mode Script (prevents FOUC) ────────────────────────────────
function DarkModeScript() {
  const script = `
    (function() {
      var stored = localStorage.getItem('theme');
      if (stored !== 'light') {
        document.documentElement.classList.add('dark');
      }
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      translate="no"
      suppressHydrationWarning
    >
      <head>
        <meta httpEquiv="Content-Language" content="en" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@700&family=Montserrat:wght@700;900&family=Playfair+Display:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <DarkModeScript />
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
