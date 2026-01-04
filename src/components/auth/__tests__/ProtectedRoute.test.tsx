/**
 * Tests for ProtectedRoute component
 * Ensures authentication checks and redirects work correctly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/components/__tests__/test-utils';
import { ProtectedRoute } from '../ProtectedRoute';
import * as AuthContext from '@/contexts/AuthContext';
import type { User, Session } from '@supabase/supabase-js';

// Mock the navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Factory for mock User
function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    ...overrides,
  } as User;
}

// Factory for mock Session
function createMockSession(user: User): Session {
  return {
    access_token: 'valid-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user,
  } as Session;
}

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
    const mockUser = createMockUser();
    const mockSession = createMockSession(mockUser);

    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: mockUser,
      loading: false,
      session: mockSession,
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
    const mockUser = createMockUser();
    const mockSession = createMockSession(mockUser);

    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: mockUser,
      loading: false,
      session: mockSession,
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
    });

    const { rerender } = renderWithProviders(
      <ProtectedRoute>
        <div>Content</div>
      </ProtectedRoute>
    );

    // Initially loading
    expect(screen.getByAltText('artifio.ai logo')).toBeInTheDocument();

    // Auth completes with user
    const mockUser = createMockUser();
    const mockSession = createMockSession(mockUser);
    
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: mockUser,
      loading: false,
      session: mockSession,
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
