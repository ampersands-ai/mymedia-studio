import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'mymedia.studio';

// Routes that require authentication
const PROTECTED_ROUTES = ['/dashboard', '/admin', '/animation-page', '/animation-editor'];

// Routes that should redirect authenticated users (e.g., auth page)
const AUTH_ROUTES = ['/auth'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── 1. Supabase Session Refresh ──────────────────────────────────────
  const { supabaseResponse, user } = await updateSession(request);

  // ─── 2. Brand Resolution ─────────────────────────────────────────────
  // Detect if this is a platform subdomain request
  const hostname = request.headers.get('host') || '';
  if (hostname.endsWith(`.${PLATFORM_DOMAIN}`)) {
    const slug = hostname.replace(`.${PLATFORM_DOMAIN}`, '');
    if (slug && slug !== 'www') {
      // Pass the brand slug to the application via header
      supabaseResponse.headers.set('x-brand-slug', slug);
      supabaseResponse.headers.set('x-brand-mode', 'platform');
    }
  } else if (hostname !== 'localhost' && !hostname.startsWith('localhost:')) {
    // Custom domain mode
    supabaseResponse.headers.set('x-brand-domain', hostname);
    supabaseResponse.headers.set('x-brand-mode', 'custom');
  }

  // ─── 3. Auth Protection ──────────────────────────────────────────────
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtectedRoute && !user) {
    // Redirect unauthenticated users to auth page
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && user) {
    // Redirect authenticated users away from auth page
    const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/dashboard/custom-creation';
    const url = request.nextUrl.clone();
    url.pathname = redirectTo;
    url.searchParams.delete('redirectTo');
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, favicon.png (favicon files)
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon\\.ico|favicon\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
};
