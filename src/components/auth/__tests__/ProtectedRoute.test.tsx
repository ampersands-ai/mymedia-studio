/**
 * Tests for ProtectedRoute component
 * Ensures authentication checks and redirects work correctly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/components/__tests__/test-utils';
import { ProtectedRoute } from '../ProtectedRoute';
import * as AuthContext from '@/contexts/AuthContext';

// Mock the navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not render protected content when user is not authenticated', () => {
    // Mock: No user logged in
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: null,
      loading: false,
      session: null,
      isAdmin: false,
      signOut: vi.fn(),
    });

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    // Should NOT render protected content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows loading screen while auth is loading', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: null,
      loading: true,
      session: null,
      isAdmin: false,
      signOut: vi.fn(),
    });

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    // Should show loading screen with logo
    expect(screen.getByAltText('artifio.ai logo')).toBeInTheDocument();
    expect(screen.getByText('artifio.ai')).toBeInTheDocument();

    // Should NOT show protected content yet
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children for authenticated users', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };

    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: mockUser,
      loading: false,
      session: { access_token: 'valid-token' },
      isAdmin: false,
      signOut: vi.fn(),
    });

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    // Should render protected content
    expect(screen.getByText('Protected Content')).toBeInTheDocument();

    // Should NOT redirect
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not redirect when user is authenticated', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };

    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: mockUser,
      loading: false,
      session: { access_token: 'valid-token' },
      isAdmin: false,
      signOut: vi.fn(),
    });

    renderWithProviders(
      <ProtectedRoute>
        <div>Dashboard</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('handles loading state correctly', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: null,
      loading: true,
      session: null,
      isAdmin: false,
      signOut: vi.fn(),
    });

    const { rerender } = renderWithProviders(
      <ProtectedRoute>
        <div>Content</div>
      </ProtectedRoute>
    );

    // Initially loading
    expect(screen.getByAltText('artifio.ai logo')).toBeInTheDocument();

    // Auth completes with user
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      loading: false,
      session: { access_token: 'valid-token' },
      isAdmin: false,
      signOut: vi.fn(),
    });

    rerender(
      <ProtectedRoute>
        <div>Content</div>
      </ProtectedRoute>
    );

    // Should now show content
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});
