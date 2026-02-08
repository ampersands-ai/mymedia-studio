/**
 * Tests for ProtectedRoute component
 *
 * In the Next.js App Router, auth protection is handled by middleware.
 * ProtectedRoute is now a simple passthrough wrapper.
 */

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/components/__tests__/test-utils';
import { ProtectedRoute } from '../ProtectedRoute';

describe('ProtectedRoute', () => {
  it('renders children (auth is handled by middleware)', () => {
    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
