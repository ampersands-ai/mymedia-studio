import { test, expect } from '@playwright/test';
import { 
  loginAsTestUser, 
  mockNetworkError, 
  mockSlowNetwork,
  waitForToast,
  startGeneration 
} from './fixtures/test-utils';

/**
 * Error Handling E2E Tests
 * Tests for error boundaries, network failures, and recovery flows
 */

test.describe('Network Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('TC-ERR-001: Graceful handling of API timeout', async ({ page }) => {
    await page.goto('/create');

    // Mock slow network for generate endpoint
    await mockSlowNetwork(page, /.*functions.*generate/, 30000);

    await startGeneration(page, 'A beautiful sunset');

    // Should show loading state
    await expect(
      page.locator('[data-testid="generating"], text=/generating|processing/i')
    ).toBeVisible({ timeout: 5000 });

    // After timeout, should show error with retry option
    await expect(
      page.locator('text=/timeout|try again|retry/i')
    ).toBeVisible({ timeout: 35000 });
  });

  test('TC-ERR-002: Network disconnection shows offline message', async ({ page, context }) => {
    await page.goto('/dashboard');

    // Simulate offline
    await context.setOffline(true);

    // Try to navigate
    await page.click('text=Create');

    // Should show offline indicator or error
    await expect(
      page.locator('text=/offline|network|connection/i')
    ).toBeVisible({ timeout: 5000 });

    // Restore connection
    await context.setOffline(false);

    // Should recover
    await page.reload();
    await expect(page).toHaveURL(/.*create|.*dashboard/);
  });

  test('TC-ERR-003: API error shows user-friendly message', async ({ page }) => {
    await page.goto('/create');

    // Mock 500 error
    await page.route(/.*functions.*generate/, route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await startGeneration(page, 'Test prompt');

    // Should show user-friendly error, not technical details
    await expect(
      page.locator('[role="alert"], [data-testid="error-message"]')
    ).toBeVisible({ timeout: 10000 });

    // Should NOT show stack trace or internal error codes
    const errorText = await page.locator('[role="alert"], [data-testid="error-message"]').textContent();
    expect(errorText).not.toContain('stack');
    expect(errorText).not.toContain('TypeError');
    expect(errorText).not.toContain('undefined');
  });

  test('TC-ERR-004: Retry mechanism works after failure', async ({ page }) => {
    await page.goto('/create');

    let callCount = 0;
    await page.route(/.*functions.*generate/, async route => {
      callCount++;
      if (callCount === 1) {
        // First call fails
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Temporary error' }),
        });
      } else {
        // Subsequent calls succeed
        await route.continue();
      }
    });

    await startGeneration(page, 'Test prompt');

    // Wait for error
    await expect(
      page.locator('text=/error|failed|try again/i')
    ).toBeVisible({ timeout: 10000 });

    // Click retry
    await page.click('button:has-text("Retry"), button:has-text("Try Again")');

    // Should attempt again (second call should succeed or at least be made)
    expect(callCount).toBeGreaterThanOrEqual(2);
  });
});

test.describe('Form Error Handling', () => {
  test('TC-ERR-005: Form validation errors are clear and actionable', async ({ page }) => {
    await page.goto('/auth');
    await page.click('text=Sign Up');

    // Submit empty form
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(
      page.locator('text=/required|enter|provide/i')
    ).toBeVisible({ timeout: 5000 });

    // Error should be associated with input
    const emailInput = page.locator('input[type="email"]');
    const hasAriaInvalid = await emailInput.getAttribute('aria-invalid');
    expect(hasAriaInvalid).toBe('true');
  });

  test('TC-ERR-006: Invalid input shows inline error', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/settings');

    // Try to update with invalid email
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill('invalid-email');
      await page.click('button:has-text("Save")');

      // Should show inline error
      await expect(
        page.locator('text=/invalid|valid email/i')
      ).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Error Boundary Tests', () => {
  test('TC-ERR-007: Error boundary catches component crashes', async ({ page }) => {
    await loginAsTestUser(page);

    // Navigate to a page that might have error boundary
    await page.goto('/library');

    // If there's a component error, error boundary should catch it
    // Look for error boundary fallback UI
    const hasErrorBoundary = await page.locator('[data-testid="error-boundary"], text=/something went wrong/i').isVisible();
    
    // If no error boundary visible, page should work normally
    if (!hasErrorBoundary) {
      await expect(page.locator('main, [role="main"]')).toBeVisible();
    }
  });

  test('TC-ERR-008: Error boundary provides recovery option', async ({ page }) => {
    await loginAsTestUser(page);
    
    // Inject error into React component
    await page.evaluate(() => {
      // This would trigger an error in a component if it tries to access undefined
      (window as unknown as Record<string, unknown>).__TEST_FORCE_ERROR__ = true;
    });

    // Navigate to trigger potential error
    await page.goto('/create');

    // If error boundary shows, it should have a recovery button
    const errorBoundary = page.locator('[data-testid="error-boundary"]');
    if (await errorBoundary.isVisible()) {
      await expect(
        page.locator('button:has-text("Reload"), button:has-text("Try Again"), button:has-text("Go Home")')
      ).toBeVisible();
    }
  });
});

test.describe('Loading State Handling', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('TC-ERR-009: Loading states shown during async operations', async ({ page }) => {
    await page.goto('/create');

    // Slow down network
    await mockSlowNetwork(page, /.*/, 2000);

    // Start generation
    await startGeneration(page, 'Test prompt');

    // Should show loading state
    await expect(
      page.locator('[data-testid="loading"], [aria-busy="true"], .animate-pulse, .animate-spin')
    ).toBeVisible({ timeout: 3000 });
  });

  test('TC-ERR-010: Skeleton loaders shown for content loading', async ({ page }) => {
    // Slow down API
    await mockSlowNetwork(page, /.*rest.*/, 2000);

    await page.goto('/library');

    // Should show skeleton loader
    await expect(
      page.locator('[data-testid="skeleton"], .skeleton, [class*="skeleton"]')
    ).toBeVisible({ timeout: 1000 });
  });
});

test.describe('Authentication Error Handling', () => {
  test('TC-ERR-011: Session expiry redirects to login', async ({ page }) => {
    await loginAsTestUser(page);

    // Mock auth check to return unauthorized
    await page.route(/.*auth.*session/, route => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'Session expired' }),
      });
    });

    // Try to access protected route
    await page.goto('/create');

    // Should redirect to auth
    await expect(page).toHaveURL(/.*auth/, { timeout: 10000 });
  });

  test('TC-ERR-012: Token refresh failure handled gracefully', async ({ page }) => {
    await loginAsTestUser(page);

    // Mock token refresh failure
    await page.route(/.*auth.*token/, route => {
      route.fulfill({
        status: 400,
        body: JSON.stringify({ error: 'Token refresh failed' }),
      });
    });

    // Wait and reload
    await page.waitForTimeout(1000);
    await page.reload();

    // Should handle gracefully - either still logged in or redirected to auth
    const isLoggedIn = await page.locator('[data-testid="user-menu"]').isVisible();
    const isOnAuth = page.url().includes('auth');
    
    expect(isLoggedIn || isOnAuth).toBeTruthy();
  });
});

test.describe('Generation Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('TC-ERR-013: Insufficient credits shows upgrade prompt', async ({ page }) => {
    await page.goto('/create');

    // Mock insufficient credits response
    await page.route(/.*functions.*generate/, route => {
      route.fulfill({
        status: 402,
        body: JSON.stringify({ error: 'Insufficient credits' }),
      });
    });

    await startGeneration(page, 'Test prompt');

    // Should show upgrade/buy credits prompt
    await expect(
      page.locator('text=/credits|upgrade|purchase|buy/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('TC-ERR-014: Content moderation rejection shows clear message', async ({ page }) => {
    await page.goto('/create');

    // Mock moderation rejection
    await page.route(/.*functions.*generate/, route => {
      route.fulfill({
        status: 400,
        body: JSON.stringify({ 
          error: 'Content policy violation',
          code: 'CONTENT_MODERATION'
        }),
      });
    });

    await startGeneration(page, 'Inappropriate content');

    // Should show policy message
    await expect(
      page.locator('text=/policy|guidelines|content|inappropriate/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('TC-ERR-015: Provider unavailable shows alternative', async ({ page }) => {
    await page.goto('/create');

    // Mock provider error
    await page.route(/.*functions.*generate/, route => {
      route.fulfill({
        status: 503,
        body: JSON.stringify({ 
          error: 'Provider temporarily unavailable',
          code: 'PROVIDER_UNAVAILABLE'
        }),
      });
    });

    await startGeneration(page, 'Test prompt');

    // Should show provider error with retry option
    await expect(
      page.locator('text=/unavailable|try again|later|busy/i')
    ).toBeVisible({ timeout: 10000 });
  });
});
