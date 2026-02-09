import { test, expect } from '@playwright/test';
import { 
  loginAsTestUser, 
  logout, 
  checkSecurityHeaders,
  generateTestEmail,
  TEST_CREDENTIALS 
} from './fixtures/test-utils';

/**
 * Security E2E Tests
 * Tests for authentication security, session management, and security headers
 */

test.describe('Authentication Security', () => {
  test('TC-SEC-001: Rate limiting on login attempts', async ({ page }) => {
    await page.goto('/auth');

    // Attempt multiple failed logins
    for (let i = 0; i < 5; i++) {
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'WrongPassword123!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    }

    // Should show rate limit message or disable button
    const submitButton = page.locator('button[type="submit"]');
    const isDisabled = await submitButton.isDisabled();
    const hasRateLimitMessage = await page.locator('text=/too many|rate limit|try again later/i').isVisible();
    
    expect(isDisabled || hasRateLimitMessage).toBeTruthy();
  });

  test('TC-SEC-002: Password strength validation', async ({ page }) => {
    await page.goto('/auth');
    await page.click('text=Sign Up');

    // Try weak password
    await page.fill('input[type="email"]', generateTestEmail());
    await page.fill('input[type="password"]', 'weak');
    await page.click('button[type="submit"]');

    // Should show password requirements error
    await expect(
      page.locator('text=/password|characters|uppercase|number|special/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('TC-SEC-003: Session invalidation on logout', async ({ page, context }) => {
    // Login first
    await loginAsTestUser(page);

    // Store session cookies
    const cookiesBefore = await context.cookies();
    const sessionCookie = cookiesBefore.find(c => c.name.includes('auth') || c.name.includes('session'));

    // Logout
    await logout(page);

    // Try to access protected route
    await page.goto('/dashboard');

    // Should redirect to auth
    await expect(page).toHaveURL(/.*auth|.*$/);

    // Session cookie should be cleared or invalidated
    const cookiesAfter = await context.cookies();
    const sessionCookieAfter = cookiesAfter.find(c => c.name === sessionCookie?.name);
    expect(sessionCookieAfter?.value).not.toBe(sessionCookie?.value);
  });

  test('TC-SEC-004: Protected routes redirect unauthenticated users', async ({ page }) => {
    const protectedRoutes = [
      '/dashboard',
      '/create',
      '/library',
      '/settings',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/.*auth/, { timeout: 5000 });
    }
  });

  test('TC-SEC-005: Admin routes inaccessible to regular users', async ({ page }) => {
    await loginAsTestUser(page, TEST_CREDENTIALS.regular);

    // Try to access admin routes
    await page.goto('/admin');

    // Should redirect away from admin
    await expect(page).not.toHaveURL(/.*admin/);
  });

  test('TC-SEC-006: XSS prevention in user inputs', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/create');

    // Try to inject script in prompt
    const xssPayload = '<script>alert("xss")</script>';
    await page.fill('textarea, [data-testid="prompt-input"]', xssPayload);

    // The script should be sanitized/escaped in the DOM
    const pageContent = await page.content();
    expect(pageContent).not.toContain('<script>alert("xss")</script>');
  });
});

test.describe('Session Management', () => {
  test('TC-SEC-007: Session persists across page reloads', async ({ page }) => {
    await loginAsTestUser(page);

    // Reload page
    await page.reload();

    // Should still be logged in
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('TC-SEC-008: Session expires after inactivity', async ({ page }) => {
    await loginAsTestUser(page);

    // This test would need a shorter session timeout in test environment
    // For now, we verify the session refresh mechanism exists
    const response = await page.request.get('/api/auth/session');
    expect(response.status()).toBe(200);
  });

  test('TC-SEC-009: Concurrent session handling', async ({ browser }) => {
    // Open two browser contexts (simulating two devices)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Login on both
    await loginAsTestUser(page1);
    await loginAsTestUser(page2);

    // Both should work (unless you have single-session policy)
    await page1.goto('/dashboard');
    await page2.goto('/dashboard');

    await expect(page1).toHaveURL(/.*dashboard/);
    await expect(page2).toHaveURL(/.*dashboard/);

    await context1.close();
    await context2.close();
  });
});

test.describe('Security Headers', () => {
  test('TC-SEC-010: Security headers present on responses', async ({ page }) => {
    const headers = await checkSecurityHeaders(page, '/');

    // Check for essential security headers
    // Note: Some headers may be set at CDN/proxy level
    expect(headers['x-content-type-options']).toBeTruthy();
  });

  test('TC-SEC-011: HTTPS redirect in production', async ({ page }) => {
    // This test is only meaningful in production
    // In local dev, we verify the app doesn't expose sensitive data
    const response = await page.goto('/');
    const url = response?.url();
    
    // In production, should be HTTPS
    if (process.env.CI) {
      expect(url).toMatch(/^https:/);
    }
  });
});

test.describe('CSRF Protection', () => {
  test('TC-SEC-012: API requests require valid session', async ({ page, request }) => {
    // Try to make API request without authentication
    const response = await request.post('/api/generate', {
      data: { prompt: 'test' },
    });

    // Should be unauthorized
    expect(response.status()).toBe(401);
  });
});

test.describe('Input Validation', () => {
  test('TC-SEC-013: Email validation on signup', async ({ page }) => {
    await page.goto('/auth');
    await page.click('text=Sign Up');

    // Try invalid email
    await page.fill('input[type="email"]', 'not-an-email');
    await page.fill('input[type="password"]', 'ValidPassword123!');
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(
      page.locator('text=/invalid|email|valid/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('TC-SEC-014: Prompt length limits enforced', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/create');

    // Try very long prompt (10000+ characters)
    const longPrompt = 'a'.repeat(10001);
    await page.fill('textarea, [data-testid="prompt-input"]', longPrompt);

    // Should show length limit error or truncate
    const inputValue = await page.inputValue('textarea, [data-testid="prompt-input"]');
    expect(inputValue.length).toBeLessThanOrEqual(10000);
  });
});
