import { test, expect } from '@playwright/test';

/**
 * TC-GEN-001: Runware Image Generation (Success)
 * TC-GEN-002: Insufficient Credits
 * TC-GEN-003: Generation Timeout
 * TC-GEN-006: Concurrent Generation Limit
 */

// Helper function to login
async function login(page: { goto: (url: string) => Promise<unknown>; fill: (selector: string, value: string) => Promise<unknown>; click: (selector: string) => Promise<unknown> }) {
  await page.goto('/auth');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'TestPassword123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
}

test.describe('Image Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('TC-GEN-001: Successful Runware image generation', async ({ page }) => {
    // Navigate to creation page
    await page.goto('/create');
    await expect(page.locator('h1:has-text("Create")')).toBeVisible();

    // Get initial credits
    const initialCreditsText = await page.textContent('[data-testid="credits-balance"]');
    const initialCredits = parseInt(initialCreditsText?.match(/\d+/)?.[0] || '0');
    expect(initialCredits).toBeGreaterThan(0);

    // Select a template
    await page.click('[data-testid="template-card"]:first-child');

    // Enter prompt
    await page.fill('[data-testid="prompt-input"]', 'Red sports car on mountain road');

    // Submit generation
    await page.click('button:has-text("Generate")');

    // Wait for generation to complete (max 60 seconds)
    await expect(page.locator('[data-testid="generation-result"]')).toBeVisible({ timeout: 60000 });

    // Verify image URL returned
    const generatedImage = page.locator('[data-testid="generated-image"]');
    await expect(generatedImage).toBeVisible();
    const imageSrc = await generatedImage.getAttribute('src');
    expect(imageSrc).toBeTruthy();
    expect(imageSrc).toContain('http'); // Should be a valid URL

    // Verify credits deducted
    const newCreditsText = await page.textContent('[data-testid="credits-balance"]');
    const newCredits = parseInt(newCreditsText?.match(/\d+/)?.[0] || '0');
    expect(newCredits).toBe(initialCredits - 1);

    // Verify image saved to history
    await page.goto('/dashboard/history');
    await expect(page.locator('[data-testid="history-item"]').first()).toBeVisible();
    const firstHistoryItem = page.locator('[data-testid="history-item"]').first();
    await expect(firstHistoryItem).toContainText('Red sports car');
  });

  test('TC-GEN-002: Insufficient credits handling', async ({ page }) => {
    // Set user to 0 credits (would need API call or direct database manipulation)
    // For now, we'll simulate by checking the UI behavior

    await page.goto('/create');

    // Mock 0 credits scenario
    await page.evaluate(() => {
      // This would need to be implemented in your app
      // For now, manually test or use API to set credits to 0
    });

    // Attempt to generate
    await page.fill('[data-testid="prompt-input"]', 'Test prompt');
    await page.click('button:has-text("Generate")');

    // Verify error message shown
    await expect(page.locator('text=Insufficient credits')).toBeVisible({ timeout: 5000 });

    // Verify upgrade CTA shown
    await expect(page.locator('button:has-text("Buy Credits")')).toBeVisible();
    await expect(page.locator('button:has-text("Upgrade")')).toBeVisible();

    // Verify no API call was made (credits not deducted)
    // This would need network interception
  });

  test('TC-GEN-003: Generation timeout handling', async ({ page }) => {
    await page.goto('/create');

    // Enter prompt
    await page.fill('[data-testid="prompt-input"]', 'Test timeout scenario');

    // Get initial credits
    const initialCreditsText = await page.textContent('[data-testid="credits-balance"]');
    const initialCredits = parseInt(initialCreditsText?.match(/\d+/)?.[0] || '0');

    // Submit generation
    await page.click('button:has-text("Generate")');

    // Mock timeout scenario (would need to configure test environment)
    // In real scenario, you'd mock the Runware API to delay response

    // Wait for timeout error (your app should have a timeout mechanism)
    await expect(page.locator('text=timed out')).toBeVisible({ timeout: 65000 });

    // Verify credits refunded
    const newCreditsText = await page.textContent('[data-testid="credits-balance"]');
    const newCredits = parseInt(newCreditsText?.match(/\d+/)?.[0] || '0');
    expect(newCredits).toBe(initialCredits); // Should be refunded

    // Verify user notified
    await expect(page.locator('text=Credits refunded')).toBeVisible();
  });

  test('TC-GEN-006: Concurrent generation queueing', async ({ page, context }) => {
    await page.goto('/create');

    // Open multiple tabs to simulate concurrent requests
    const page2 = await context.newPage();
    await page2.goto('/create');
    const page3 = await context.newPage();
    await page3.goto('/create');
    const page4 = await context.newPage();
    await page4.goto('/create');

    // Submit 4 generations simultaneously
    const prompt = `Concurrent test ${Date.now()}`;
    await Promise.all([
      page.fill('[data-testid="prompt-input"]', prompt + ' 1').then(() => page.click('button:has-text("Generate")')),
      page2.fill('[data-testid="prompt-input"]', prompt + ' 2').then(() => page2.click('button:has-text("Generate")')),
      page3.fill('[data-testid="prompt-input"]', prompt + ' 3').then(() => page3.click('button:has-text("Generate")')),
      page4.fill('[data-testid="prompt-input"]', prompt + ' 4').then(() => page4.click('button:has-text("Generate")')),
    ]);

    // Verify queue system message (if 4th is queued)
    // Your app should show "Queued" or "Processing" status
    await expect(page4.locator('text=/Queued|Processing/')).toBeVisible({ timeout: 5000 });

    // Wait for all generations to complete (max 5 minutes)
    await Promise.all([
      expect(page.locator('[data-testid="generation-result"]')).toBeVisible({ timeout: 300000 }),
      expect(page2.locator('[data-testid="generation-result"]')).toBeVisible({ timeout: 300000 }),
      expect(page3.locator('[data-testid="generation-result"]')).toBeVisible({ timeout: 300000 }),
      expect(page4.locator('[data-testid="generation-result"]')).toBeVisible({ timeout: 300000 }),
    ]);

    // Cleanup
    await page2.close();
    await page3.close();
    await page4.close();
  });
});

test.describe('Error Handling in Generation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Generation error shows user-friendly message', async ({ page }) => {
    await page.goto('/create');

    // Trigger error (would need to mock API failure)
    await page.fill('[data-testid="prompt-input"]', 'Error test prompt');
    await page.click('button:has-text("Generate")');

    // Verify error notification shown
    // Should NOT show technical details, only user-friendly message
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });
    const errorMessage = await page.locator('[role="alert"]').textContent();

    // Should not contain technical jargon
    expect(errorMessage?.toLowerCase()).not.toContain('500');
    expect(errorMessage?.toLowerCase()).not.toContain('internal server error');
    expect(errorMessage?.toLowerCase()).not.toContain('null reference');

    // Should contain user-friendly message
    expect(errorMessage?.toLowerCase()).toMatch(/something went wrong|failed|error/);

    // Should have action button
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
  });
});
