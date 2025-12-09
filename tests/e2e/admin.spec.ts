import { test, expect } from '@playwright/test';

/**
 * Admin Dashboard E2E Tests
 * 
 * These tests verify admin-only functionality including:
 * - Access control (non-admins redirected)
 * - Model management
 * - User management
 * - Analytics dashboard
 */

test.describe('Admin Access Control', () => {
  test('redirects non-admin users to dashboard', async ({ page }) => {
    // Login as regular user
    await page.goto('/auth');
    await page.fill('[name="email"]', 'regular@example.com');
    await page.fill('[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Wait for auth to complete
    await page.waitForURL(/\/dashboard/);
    
    // Try to access admin page
    await page.goto('/admin');
    
    // Should be redirected away from admin
    await expect(page).not.toHaveURL('/admin');
  });

  test('allows admin users to access dashboard', async ({ page }) => {
    // This test requires an admin user to be set up
    // Skip in CI without admin credentials
    test.skip(!process.env.ADMIN_EMAIL, 'Admin credentials not configured');
    
    await page.goto('/auth');
    await page.fill('[name="email"]', process.env.ADMIN_EMAIL!);
    await page.fill('[name="password"]', process.env.ADMIN_PASSWORD!);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/dashboard/);
    await page.goto('/admin');
    
    // Should see admin dashboard
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('h1')).toContainText(/Admin|Dashboard/i);
  });
});

test.describe('Admin Model Management', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.ADMIN_EMAIL, 'Admin credentials not configured');
    
    // Login as admin
    await page.goto('/auth');
    await page.fill('[name="email"]', process.env.ADMIN_EMAIL!);
    await page.fill('[name="password"]', process.env.ADMIN_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);
  });

  test('displays model list in admin', async ({ page }) => {
    await page.goto('/admin/models');
    
    // Should see models table or grid
    await expect(page.locator('[data-testid="models-list"], table')).toBeVisible({ timeout: 10000 });
  });

  test('can view model details', async ({ page }) => {
    await page.goto('/admin/models');
    
    // Click on first model
    const firstModel = page.locator('[data-testid="model-item"], tr').first();
    await firstModel.click();
    
    // Should see model details
    await expect(page.locator('[data-testid="model-details"], .model-details')).toBeVisible();
  });
});

test.describe('Admin User Management', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.ADMIN_EMAIL, 'Admin credentials not configured');
    
    await page.goto('/auth');
    await page.fill('[name="email"]', process.env.ADMIN_EMAIL!);
    await page.fill('[name="password"]', process.env.ADMIN_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);
  });

  test('displays user list', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Should see users table
    await expect(page.locator('table, [data-testid="users-list"]')).toBeVisible({ timeout: 10000 });
  });

  test('can search for users', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Find search input
    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]');
    await searchInput.fill('test@example.com');
    
    // Wait for results to filter
    await page.waitForTimeout(500);
    
    // Results should be filtered (or show no results message)
    await expect(page.locator('table tbody tr, [data-testid="no-results"]')).toBeVisible();
  });
});

test.describe('Admin Analytics', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.ADMIN_EMAIL, 'Admin credentials not configured');
    
    await page.goto('/auth');
    await page.fill('[name="email"]', process.env.ADMIN_EMAIL!);
    await page.fill('[name="password"]', process.env.ADMIN_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);
  });

  test('displays analytics dashboard', async ({ page }) => {
    await page.goto('/admin/analytics');
    
    // Should see analytics charts or stats
    await expect(page.locator('[data-testid="analytics-chart"], .recharts-wrapper, canvas')).toBeVisible({ timeout: 10000 });
  });
});
