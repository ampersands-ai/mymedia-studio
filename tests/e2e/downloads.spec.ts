import { test, expect } from '@playwright/test';

/**
 * Download Functionality E2E Tests
 * 
 * Tests for downloading generated content:
 * - Single image download
 * - Video download
 * - Batch download (multiple images)
 * - Download from gallery
 */

test.describe('Download Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth');
    await page.fill('[name="email"]', process.env.TEST_EMAIL || 'test@example.com');
    await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  test('can download single image from gallery', async ({ page }) => {
    // Navigate to gallery/history
    await page.goto('/dashboard/history');
    
    // Wait for generations to load
    await page.waitForSelector('[data-testid="generation-card"], .generation-card', { timeout: 10000 });
    
    // Find a completed generation
    const completedGeneration = page.locator('[data-testid="generation-card"]:has([data-status="completed"]), .generation-card').first();
    
    // Look for download button
    const downloadButton = completedGeneration.locator('button:has-text("Download"), [data-testid="download-button"]');
    
    // Set up download handler
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      downloadButton.click(),
    ]);
    
    // Verify download started
    expect(download.suggestedFilename()).toBeTruthy();
  });

  test('can download from preview modal', async ({ page }) => {
    await page.goto('/dashboard/history');
    
    // Wait for generations
    await page.waitForSelector('[data-testid="generation-card"], .generation-card', { timeout: 10000 });
    
    // Click on a generation to open preview
    await page.locator('[data-testid="generation-card"], .generation-card').first().click();
    
    // Wait for modal
    await expect(page.locator('[role="dialog"], .modal, [data-testid="preview-modal"]')).toBeVisible({ timeout: 5000 });
    
    // Find download button in modal
    const downloadButton = page.locator('[role="dialog"] button:has-text("Download"), [data-testid="modal-download"]');
    
    if (await downloadButton.isVisible()) {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 30000 }),
        downloadButton.click(),
      ]);
      
      expect(download.suggestedFilename()).toBeTruthy();
    }
  });

  test('download button disabled for processing generations', async ({ page }) => {
    await page.goto('/dashboard/history');
    
    // Look for processing generation
    const processingGeneration = page.locator('[data-testid="generation-card"]:has([data-status="processing"]), .generation-card:has(.animate-pulse)');
    
    if (await processingGeneration.count() > 0) {
      const downloadButton = processingGeneration.first().locator('button:has-text("Download")');
      
      // Download button should either not exist or be disabled
      if (await downloadButton.count() > 0) {
        await expect(downloadButton).toBeDisabled();
      }
    } else {
      // No processing generations, skip test
      test.skip(true, 'No processing generations to test');
    }
  });

  test('handles download errors gracefully', async ({ page }) => {
    await page.goto('/dashboard/history');
    
    // Wait for generations
    await page.waitForSelector('[data-testid="generation-card"], .generation-card', { timeout: 10000 });
    
    // Intercept download requests to simulate failure
    await page.route('**/storage/**', (route) => {
      route.abort('failed');
    });
    
    // Try to download
    const downloadButton = page.locator('button:has-text("Download")').first();
    
    if (await downloadButton.isVisible()) {
      await downloadButton.click();
      
      // Should show error toast or message
      await expect(page.locator('[data-sonner-toast], .toast, [role="alert"]')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Video Download', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('[name="email"]', process.env.TEST_EMAIL || 'test@example.com');
    await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  test('can download video content', async ({ page }) => {
    // Navigate to storyboards or video history
    await page.goto('/dashboard/storyboards');
    
    // Wait for content
    await page.waitForTimeout(2000);
    
    // Find a completed video
    const completedVideo = page.locator('[data-testid="storyboard-card"]:has([data-status="completed"]), .storyboard-card').first();
    
    if (await completedVideo.count() > 0) {
      const downloadButton = completedVideo.locator('button:has-text("Download"), [data-testid="download-video"]');
      
      if (await downloadButton.isVisible()) {
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 60000 }), // Videos take longer
          downloadButton.click(),
        ]);
        
        expect(download.suggestedFilename()).toMatch(/\.(mp4|webm|mov)$/i);
      }
    } else {
      test.skip(true, 'No completed videos to test');
    }
  });
});

test.describe('Batch Download', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('[name="email"]', process.env.TEST_EMAIL || 'test@example.com');
    await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  test('can select multiple items for batch download', async ({ page }) => {
    await page.goto('/dashboard/history');
    
    // Wait for generations
    await page.waitForSelector('[data-testid="generation-card"], .generation-card', { timeout: 10000 });
    
    // Look for batch selection mode
    const selectModeButton = page.locator('button:has-text("Select"), [data-testid="batch-select"]');
    
    if (await selectModeButton.isVisible()) {
      await selectModeButton.click();
      
      // Select first two items
      const cards = page.locator('[data-testid="generation-card"], .generation-card');
      await cards.first().click();
      await cards.nth(1).click();
      
      // Look for batch download button
      const batchDownloadButton = page.locator('button:has-text("Download Selected"), [data-testid="batch-download"]');
      
      if (await batchDownloadButton.isVisible()) {
        await expect(batchDownloadButton).toBeEnabled();
      }
    } else {
      test.skip(true, 'Batch selection not available');
    }
  });
});
