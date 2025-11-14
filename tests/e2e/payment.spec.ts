import { test, expect } from '@playwright/test';

/**
 * TC-PAY-001: Successful Credit Purchase
 * TC-PAY-002: Payment Failure
 */

async function login(page: any) {
  await page.goto('/auth');
  await page.fill('input[type="email"]', 'test@artifio.ai');
  await page.fill('input[type="password"]', 'TestPassword123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
}

test.describe('Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('TC-PAY-001: Successful credit purchase', async ({ page }) => {
    // Get initial credits
    const initialCreditsText = await page.textContent('[data-testid="credits-balance"]');
    const initialCredits = parseInt(initialCreditsText?.match(/\d+/)?.[0] || '0');

    // Navigate to pricing page
    await page.click('[data-testid="buy-credits-button"]');
    await expect(page).toHaveURL(/.*pricing/);

    // Select $4.99 package (100 credits)
    await page.click('[data-testid="package-starter"]'); // $4.99 for 100 credits

    // Click purchase button
    await page.click('button:has-text("Buy Now")');

    // Should redirect to Dodo Payments or show payment modal
    // For testing, you'd use Dodo Payments test mode
    await expect(page).toHaveURL(/.*payment|.*dodo/, { timeout: 10000 });

    // In test environment, mock successful payment webhook
    // This would need to be done via API call to your test webhook endpoint

    // Wait for redirect back to dashboard
    await page.waitForURL(/.*dashboard/, { timeout: 60000 });

    // Verify success notification
    await expect(page.locator('text=100 credits added')).toBeVisible({ timeout: 5000 });

    // Verify credits updated
    const newCreditsText = await page.textContent('[data-testid="credits-balance"]');
    const newCredits = parseInt(newCreditsText?.match(/\d+/)?.[0] || '0');
    expect(newCredits).toBe(initialCredits + 100);

    // Verify transaction recorded in history
    await page.goto('/dashboard/billing');
    await expect(page.locator('[data-testid="transaction-history"]').first()).toBeVisible();
    await expect(page.locator('text=$4.99')).toBeVisible();
    await expect(page.locator('text=100 credits')).toBeVisible();
  });

  test('TC-PAY-002: Payment failure handling', async ({ page }) => {
    const initialCreditsText = await page.textContent('[data-testid="credits-balance"]');
    const initialCredits = parseInt(initialCreditsText?.match(/\d+/)?.[0] || '0');

    // Navigate to pricing
    await page.click('[data-testid="buy-credits-button"]');
    await page.click('[data-testid="package-starter"]');
    await page.click('button:has-text("Buy Now")');

    // Mock payment failure (would need test environment configuration)
    // In real scenario, use Dodo Payments test card that fails

    // Wait for error notification
    await expect(page.locator('text=Payment failed')).toBeVisible({ timeout: 30000 });

    // Verify user-friendly error message
    const errorMessage = await page.locator('[role="alert"]').textContent();
    expect(errorMessage?.toLowerCase()).toContain('try again');

    // Verify credits NOT added
    const newCreditsText = await page.textContent('[data-testid="credits-balance"]');
    const newCredits = parseInt(newCreditsText?.match(/\d+/)?.[0] || '0');
    expect(newCredits).toBe(initialCredits); // Should remain unchanged

    // Verify transaction marked as failed in history
    await page.goto('/dashboard/billing');
    if (await page.locator('[data-testid="transaction-history"]').isVisible()) {
      const failedTransaction = page.locator('[data-testid="transaction-status"]:has-text("Failed")').first();
      if (await failedTransaction.isVisible()) {
        expect(await failedTransaction.textContent()).toContain('Failed');
      }
    }
  });
});

test.describe('Subscription Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Subscribe to Pro plan', async ({ page }) => {
    // Navigate to pricing
    await page.goto('/pricing');

    // Select Pro plan ($29.99/month)
    await page.click('[data-testid="plan-pro"]');
    await page.click('button:has-text("Subscribe")');

    // Complete payment
    await expect(page).toHaveURL(/.*payment|.*dodo/, { timeout: 10000 });

    // Mock successful subscription webhook
    // Wait for confirmation
    await page.waitForURL(/.*dashboard/, { timeout: 60000 });

    // Verify subscription active
    await expect(page.locator('text=Pro Plan Active')).toBeVisible();

    // Verify monthly credits allocated
    const creditsText = await page.textContent('[data-testid="credits-balance"]');
    expect(creditsText).toContain('1000'); // Pro plan gives 1000 credits/month

    // Verify subscription details in billing
    await page.goto('/dashboard/billing');
    await expect(page.locator('text=$29.99/month')).toBeVisible();
    await expect(page.locator('text=Next billing')).toBeVisible();
  });
});
