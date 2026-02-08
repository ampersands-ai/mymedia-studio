interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * ProtectedRoute component - simplified for Next.js App Router.
 * Auth protection is now handled by middleware.
 * This component simply passes through children.
 */
export const ProtectedRoute = ({
  children,
}: ProtectedRouteProps) => {
  return <>{children}</>;
};
