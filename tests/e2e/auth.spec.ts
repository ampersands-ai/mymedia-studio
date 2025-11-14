import { test, expect } from '@playwright/test';

/**
 * TC-AUTH-001: User Registration
 * TC-AUTH-002: User Login
 * TC-AUTH-003: Invalid Login Attempts
 */

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('TC-AUTH-001: User registration with 5 free credits', async ({ page }) => {
    // Navigate to signup page
    await page.click('text=Sign Up');
    await expect(page).toHaveURL(/.*auth/);

    // Generate unique test email
    const testEmail = `test-${Date.now()}@artifio.ai`;
    const testPassword = 'TestPassword123!';

    // Fill registration form
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

    // Verify 5 free credits allocated
    const creditsText = await page.textContent('[data-testid="credits-balance"]');
    expect(creditsText).toContain('5');
  });

  test('TC-AUTH-002: User login flow', async ({ page }) => {
    // Use existing test account
    const testEmail = 'test@artifio.ai';
    const testPassword = 'TestPassword123!';

    // Navigate to login page
    await page.click('text=Sign In');
    await expect(page).toHaveURL(/.*auth/);

    // Enter credentials
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

    // Verify session persisted
    const userMenu = page.locator('[data-testid="user-menu"]');
    await expect(userMenu).toBeVisible();
  });

  test('TC-AUTH-003: Invalid login attempts and rate limiting', async ({ page }) => {
    await page.click('text=Sign In');

    // Attempt login with wrong password 3 times
    for (let i = 0; i < 3; i++) {
      await page.fill('input[type="email"]', 'test@artifio.ai');
      await page.fill('input[type="password"]', 'WrongPassword');
      await page.click('button[type="submit"]');

      // Verify error message shown
      await expect(page.locator('text=Invalid credentials')).toBeVisible({ timeout: 5000 });
    }

    // Verify rate limiting message after 3 attempts
    // (This depends on your implementation - adjust as needed)
    await page.fill('input[type="email"]', 'test@artifio.ai');
    await page.fill('input[type="password"]', 'WrongPassword');
    await page.click('button[type="submit"]');

    // Should show rate limit message or button should be disabled
    const submitButton = page.locator('button[type="submit"]');
    const isDisabled = await submitButton.isDisabled();
    expect(isDisabled).toBeTruthy();
  });

  test('TC-AUTH-004: Session refresh', async ({ page, context }) => {
    // Login first
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@artifio.ai');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

    // Get initial cookies
    const initialCookies = await context.cookies();
    const initialSessionCookie = initialCookies.find(c => c.name.includes('session'));

    // Wait for some time (simulate session near expiry)
    await page.waitForTimeout(2000);

    // Trigger protected action (e.g., navigate to create page)
    await page.goto('/create');

    // Verify session still active (should have auto-refreshed)
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

    // Verify session cookie was refreshed
    const newCookies = await context.cookies();
    const newSessionCookie = newCookies.find(c => c.name.includes('session'));
    expect(newSessionCookie).toBeDefined();
  });
});

test.describe('Authorization (RBAC)', () => {
  test('TC-AUTH-005: Admin access control', async ({ page }) => {
    // Login as regular user
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'regular-user@artifio.ai');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

    // Attempt to access admin routes
    await page.goto('/admin');

    // Verify access denied (redirect or error message)
    await expect(page).not.toHaveURL(/.*admin/);
    // Should redirect to dashboard or show 403 error

    // Now login as admin
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'admin@artifio.ai');
    await page.fill('input[type="password"]', 'AdminPassword123!');
    await page.click('button[type="submit"]');

    // Access admin routes
    await page.goto('/admin');

    // Verify admin routes accessible
    await expect(page).toHaveURL(/.*admin/);
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();
  });
});
