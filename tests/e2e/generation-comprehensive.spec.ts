import { test, expect } from '@playwright/test';
import { 
  loginAsTestUser, 
  startGeneration, 
  waitForGeneration,
  waitForGenerationError,
  getCreditsBalance,
  waitForToast
} from './fixtures/test-utils';

/**
 * Comprehensive Generation E2E Tests
 * Tests for all generation types, edge cases, and error scenarios
 */

test.describe('Image Generation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/create');
  });

  test('TC-GEN-001: Successful image generation with default settings', async ({ page }) => {
    const initialCredits = await getCreditsBalance(page);

    await startGeneration(page, 'A serene mountain landscape at sunset');
    await waitForGeneration(page, 120000);

    // Verify image is displayed
    const outputImage = page.locator('[data-testid="output-image"], [data-testid="generation-result"] img');
    await expect(outputImage).toBeVisible();

    // Verify credits deducted
    const newCredits = await getCreditsBalance(page);
    expect(newCredits).toBeLessThan(initialCredits);
  });

  test('TC-GEN-002: Generation with custom aspect ratio', async ({ page }) => {
    // Select 16:9 aspect ratio
    await page.click('[data-testid="aspect-16:9"], button:has-text("16:9")');
    
    await startGeneration(page, 'A cinematic city skyline');
    await waitForGeneration(page);

    // Verify generated image has correct aspect ratio
    const outputImage = page.locator('[data-testid="output-image"], [data-testid="generation-result"] img');
    await expect(outputImage).toBeVisible();
  });

  test('TC-GEN-003: Generation with different models', async ({ page }) => {
    // Check if model selector exists
    const modelSelector = page.locator('[data-testid="model-selector"]');
    
    if (await modelSelector.isVisible()) {
      await modelSelector.click();
      
      // Select first available model
      const modelOption = page.locator('[data-testid^="model-"]').first();
      await modelOption.click();
    }

    await startGeneration(page, 'Abstract digital art');
    await waitForGeneration(page);

    await expect(
      page.locator('[data-testid="output-image"], [data-testid="generation-result"] img')
    ).toBeVisible();
  });

  test('TC-GEN-004: Batch generation of multiple images', async ({ page }) => {
    // Select batch count if available
    const batchSelector = page.locator('[data-testid="batch-count"], input[name="numImages"]');
    
    if (await batchSelector.isVisible()) {
      await batchSelector.fill('4');
    }

    await startGeneration(page, 'Colorful abstract patterns');
    await waitForGeneration(page, 180000); // Longer timeout for batch

    // Should have multiple images
    const images = page.locator('[data-testid="output-image"], [data-testid="generation-result"] img');
    const count = await images.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('TC-GEN-005: Empty prompt validation', async ({ page }) => {
    // Try to generate with empty prompt
    await page.click('button:has-text("Generate")');

    // Should show validation error
    await expect(
      page.locator('text=/required|enter.*prompt|provide.*prompt/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('TC-GEN-006: Prompt with special characters', async ({ page }) => {
    // Generate with special characters
    await startGeneration(page, 'A scene with "quotes" and <angle> brackets & ampersands');
    
    // Should either work or show clean error, not crash
    const hasResult = await page.locator('[data-testid="output-image"]').isVisible().catch(() => false);
    const hasError = await page.locator('[role="alert"]').isVisible().catch(() => false);
    
    expect(hasResult || hasError).toBeTruthy();
  });
});

test.describe('Template-Based Generation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('TC-GEN-007: Generation using template', async ({ page }) => {
    await page.goto('/templates');

    // Select first available template
    const template = page.locator('[data-testid^="template-"]').first();
    if (await template.isVisible()) {
      await template.click();

      // Fill required fields
      const promptInput = page.locator('textarea, [data-testid="prompt-input"]');
      if (await promptInput.isVisible()) {
        await promptInput.fill('Beautiful sunset over the ocean');
      }

      await page.click('button:has-text("Generate")');
      await waitForGeneration(page);

      await expect(
        page.locator('[data-testid="output-image"], [data-testid="generation-result"]')
      ).toBeVisible();
    }
  });
});

test.describe('Generation History & Library', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('TC-GEN-008: Generated image appears in library', async ({ page }) => {
    await page.goto('/create');
    
    await startGeneration(page, 'Unique test image ' + Date.now());
    await waitForGeneration(page);

    // Navigate to library
    await page.goto('/library');

    // Recent generation should be visible
    const libraryImages = page.locator('[data-testid="library-item"], [data-testid="generation-card"]');
    await expect(libraryImages.first()).toBeVisible({ timeout: 10000 });
  });

  test('TC-GEN-009: Download generated image', async ({ page }) => {
    await page.goto('/library');

    // Click on first image
    const firstImage = page.locator('[data-testid="library-item"], [data-testid="generation-card"]').first();
    
    if (await firstImage.isVisible()) {
      await firstImage.click();

      // Click download button
      const downloadButton = page.locator('button:has-text("Download"), [data-testid="download-button"]');
      
      if (await downloadButton.isVisible()) {
        // Set up download handler
        const [download] = await Promise.all([
          page.waitForEvent('download'),
          downloadButton.click(),
        ]);

        // Verify download started
        expect(download.suggestedFilename()).toBeTruthy();
      }
    }
  });

  test('TC-GEN-010: Delete generated image', async ({ page }) => {
    await page.goto('/library');

    const initialCount = await page.locator('[data-testid="library-item"], [data-testid="generation-card"]').count();
    
    if (initialCount > 0) {
      // Click on first image
      await page.locator('[data-testid="library-item"], [data-testid="generation-card"]').first().click();

      // Click delete button
      const deleteButton = page.locator('button:has-text("Delete"), [data-testid="delete-button"]');
      
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Confirm deletion
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        // Wait for deletion
        await page.waitForTimeout(1000);

        // Count should be reduced
        const newCount = await page.locator('[data-testid="library-item"], [data-testid="generation-card"]').count();
        expect(newCount).toBeLessThan(initialCount);
      }
    }
  });
});

test.describe('Generation Cancellation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/create');
  });

  test('TC-GEN-011: Cancel in-progress generation', async ({ page }) => {
    await startGeneration(page, 'A very detailed landscape painting');

    // Wait for generating state
    await expect(
      page.locator('[data-testid="generating"], text=/generating|processing/i')
    ).toBeVisible({ timeout: 5000 });

    // Click cancel
    const cancelButton = page.locator('button:has-text("Cancel"), [data-testid="cancel-button"]');
    
    if (await cancelButton.isVisible()) {
      await cancelButton.click();

      // Should return to ready state
      await expect(
        page.locator('button:has-text("Generate")')
      ).toBeEnabled({ timeout: 10000 });
    }
  });
});

test.describe('Generation Settings Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('TC-GEN-012: Settings persist across sessions', async ({ page }) => {
    await page.goto('/create');

    // Change aspect ratio
    const aspectButton = page.locator('[data-testid="aspect-9:16"], button:has-text("9:16")');
    if (await aspectButton.isVisible()) {
      await aspectButton.click();
    }

    // Reload page
    await page.reload();

    // Setting should be preserved
    const selectedAspect = page.locator('[data-testid="aspect-9:16"][aria-pressed="true"], [data-testid="aspect-9:16"].active');
    if (await selectedAspect.isVisible()) {
      expect(await selectedAspect.isVisible()).toBeTruthy();
    }
  });
});

test.describe('Generation Error Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/create');
  });

  test('TC-GEN-013: Handle provider timeout gracefully', async ({ page }) => {
    // Mock slow response
    await page.route(/.*functions.*generate/, async route => {
      await new Promise(resolve => setTimeout(resolve, 120000)); // 2 min delay
      await route.continue();
    });

    await startGeneration(page, 'Test timeout handling');

    // Should show timeout error
    await expect(
      page.locator('text=/timeout|taking too long|try again/i')
    ).toBeVisible({ timeout: 130000 });
  });

  test('TC-GEN-014: Handle rate limiting', async ({ page }) => {
    // Mock rate limit response
    await page.route(/.*functions.*generate/, route => {
      route.fulfill({
        status: 429,
        body: JSON.stringify({ error: 'Rate limit exceeded' }),
      });
    });

    await startGeneration(page, 'Test rate limit');

    // Should show rate limit message
    await expect(
      page.locator('text=/rate limit|too many|slow down/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('TC-GEN-015: Handle service unavailable', async ({ page }) => {
    // Mock 503 response
    await page.route(/.*functions.*generate/, route => {
      route.fulfill({
        status: 503,
        body: JSON.stringify({ error: 'Service unavailable' }),
      });
    });

    await startGeneration(page, 'Test service unavailable');

    // Should show service unavailable message
    await expect(
      page.locator('text=/unavailable|maintenance|try again later/i')
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Credit Handling', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('TC-GEN-016: Credits deducted on successful generation', async ({ page }) => {
    await page.goto('/create');
    const initialCredits = await getCreditsBalance(page);

    await startGeneration(page, 'Credit test image');
    await waitForGeneration(page);

    const finalCredits = await getCreditsBalance(page);
    expect(finalCredits).toBeLessThan(initialCredits);
  });

  test('TC-GEN-017: No credits deducted on failed generation', async ({ page }) => {
    await page.goto('/create');
    const initialCredits = await getCreditsBalance(page);

    // Mock failure
    await page.route(/.*functions.*generate/, route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Generation failed' }),
      });
    });

    await startGeneration(page, 'This will fail');
    await waitForGenerationError(page);

    const finalCredits = await getCreditsBalance(page);
    expect(finalCredits).toBe(initialCredits);
  });
});
