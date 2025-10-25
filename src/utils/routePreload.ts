/**
 * Route preloading utilities for better performance
 * Preloads routes on hover or idle time
 */

// Preload specific route chunks
export function preloadRoute(routeName: string): void {
  switch (routeName) {
    case 'create':
      import('@/pages/Create');
      break;
    case 'custom-creation':
      import('@/pages/CustomCreation');
      break;
    case 'create-workflow':
      import('@/pages/CreateWorkflow');
      break;
    case 'templates':
      import('@/pages/Templates');
      break;
    case 'settings':
      import('@/pages/Settings');
      break;
    case 'history':
      import('@/pages/dashboard/History');
      break;
    case 'pricing':
      import('@/pages/Pricing');
      break;
    case 'video-studio':
      import('@/pages/VideoStudio');
      break;
    default:
      console.warn(`Unknown route: ${routeName}`);
  }
}

// Preload on link hover
export function usePrefetchOnHover(routeName: string) {
  return {
    onMouseEnter: () => preloadRoute(routeName),
    onTouchStart: () => preloadRoute(routeName), // Mobile support
  };
}

// Preload multiple routes on idle
export function preloadCriticalRoutes(routes: string[]): void {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(
      () => {
        routes.forEach(route => preloadRoute(route));
      },
      { timeout: 2000 }
    );
  } else {
    // Fallback for browsers that don't support requestIdleCallback
    setTimeout(() => {
      routes.forEach(route => preloadRoute(route));
    }, 2000);
  }
}

// Preload routes based on user role
export function preloadForAuthenticatedUser(): void {
  preloadCriticalRoutes([
    'create',
    'custom-creation',
    'templates',
    'history'
  ]);
}

export function preloadForAnonymousUser(): void {
  preloadCriticalRoutes([
    'pricing',
    'templates'
  ]);
}
