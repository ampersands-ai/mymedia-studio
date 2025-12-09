import { test, expect } from '@playwright/test';

/**
 * Storyboard/Video Creation E2E Tests
 * 
 * Tests for the storyboard video creation flow:
 * - Creating new storyboards
 * - Editing scenes
 * - Generating video
 * - Exporting/downloading
 */

test.describe('Storyboard Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('[name="email"]', process.env.TEST_EMAIL || 'test@example.com');
    await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  test('can navigate to storyboard creation', async ({ page }) => {
    // Navigate to storyboard creation
    await page.goto('/dashboard/storyboard/new');
    
    // Should see storyboard form
    await expect(page.locator('[data-testid="storyboard-form"], form, .storyboard-editor')).toBeVisible({ timeout: 10000 });
  });

  test('can fill in storyboard topic', async ({ page }) => {
    await page.goto('/dashboard/storyboard/new');
    
    // Find topic input
    const topicInput = page.locator('input[name="topic"], textarea[name="topic"], [data-testid="topic-input"]');
    
    await topicInput.fill('A day in the life of a software developer');
    
    // Input should have value
    await expect(topicInput).toHaveValue('A day in the life of a software developer');
  });

  test('can select video style', async ({ page }) => {
    await page.goto('/dashboard/storyboard/new');
    
    // Find style selector
    const styleSelector = page.locator('[data-testid="style-selector"], select[name="style"], [role="combobox"]');
    
    if (await styleSelector.isVisible()) {
      await styleSelector.click();
      
      // Select an option
      const option = page.locator('[role="option"], option').first();
      await option.click();
    }
  });

  test('can select voice', async ({ page }) => {
    await page.goto('/dashboard/storyboard/new');
    
    // Find voice selector
    const voiceSelector = page.locator('[data-testid="voice-selector"], select[name="voice"], [role="combobox"]:near(:text("Voice"))');
    
    if (await voiceSelector.isVisible()) {
      await voiceSelector.click();
      
      // Select a voice option
      const voiceOption = page.locator('[role="option"], option').first();
      await voiceOption.click();
    }
  });

  test('validates required fields before generation', async ({ page }) => {
    await page.goto('/dashboard/storyboard/new');
    
    // Try to generate without filling required fields
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Create")');
    
    if (await generateButton.isVisible()) {
      await generateButton.click();
      
      // Should show validation error
      await expect(page.locator('.text-destructive, [data-error="true"], [aria-invalid="true"]')).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe('Storyboard Scene Editing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('[name="email"]', process.env.TEST_EMAIL || 'test@example.com');
    await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  test('can view existing storyboard', async ({ page }) => {
    await page.goto('/dashboard/storyboards');
    
    // Wait for storyboards list
    await page.waitForSelector('[data-testid="storyboard-card"], .storyboard-card', { timeout: 10000 });
    
    // Click on first storyboard
    await page.locator('[data-testid="storyboard-card"], .storyboard-card').first().click();
    
    // Should see storyboard editor
    await expect(page.locator('[data-testid="storyboard-editor"], .storyboard-editor')).toBeVisible({ timeout: 10000 });
  });

  test('can edit scene voiceover text', async ({ page }) => {
    await page.goto('/dashboard/storyboards');
    
    // Wait for storyboards
    const storyboardCard = page.locator('[data-testid="storyboard-card"], .storyboard-card').first();
    
    if (await storyboardCard.count() > 0) {
      await storyboardCard.click();
      
      // Wait for editor
      await page.waitForSelector('[data-testid="scene-card"], .scene-card', { timeout: 10000 });
      
      // Find voiceover textarea
      const voiceoverInput = page.locator('[data-testid="scene-card"], .scene-card').first().locator('textarea');
      
      if (await voiceoverInput.isVisible()) {
        await voiceoverInput.clear();
        await voiceoverInput.fill('Updated voiceover text for testing');
        
        // Changes should be reflected
        await expect(voiceoverInput).toHaveValue('Updated voiceover text for testing');
      }
    } else {
      test.skip(true, 'No storyboards available');
    }
  });

  test('can regenerate a scene', async ({ page }) => {
    await page.goto('/dashboard/storyboards');
    
    const storyboardCard = page.locator('[data-testid="storyboard-card"], .storyboard-card').first();
    
    if (await storyboardCard.count() > 0) {
      await storyboardCard.click();
      
      // Wait for editor
      await page.waitForSelector('[data-testid="scene-card"], .scene-card', { timeout: 10000 });
      
      // Find regenerate button
      const regenerateButton = page.locator('[data-testid="scene-card"], .scene-card').first().locator('button:has-text("Regenerate")');
      
      if (await regenerateButton.isVisible()) {
        await regenerateButton.click();
        
        // Should show confirmation dialog
        await expect(page.locator('[role="alertdialog"], .confirm-dialog')).toBeVisible({ timeout: 3000 });
      }
    } else {
      test.skip(true, 'No storyboards available');
    }
  });
});

test.describe('Storyboard Video Generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('[name="email"]', process.env.TEST_EMAIL || 'test@example.com');
    await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  test('can start video rendering', async ({ page }) => {
    await page.goto('/dashboard/storyboards');
    
    const storyboardCard = page.locator('[data-testid="storyboard-card"]:has-text("draft"), .storyboard-card').first();
    
    if (await storyboardCard.count() > 0) {
      await storyboardCard.click();
      
      // Wait for editor
      await page.waitForTimeout(2000);
      
      // Find render button
      const renderButton = page.locator('button:has-text("Render"), button:has-text("Generate Video")');
      
      if (await renderButton.isVisible() && await renderButton.isEnabled()) {
        await renderButton.click();
        
        // Should show progress or confirmation
        await expect(page.locator('[data-testid="render-progress"], .progress, [role="progressbar"]')).toBeVisible({ timeout: 10000 });
      }
    } else {
      test.skip(true, 'No draft storyboards available');
    }
  });

  test('shows render progress', async ({ page }) => {
    await page.goto('/dashboard/storyboards');
    
    // Look for rendering storyboard
    const renderingCard = page.locator('[data-testid="storyboard-card"]:has-text("rendering"), .storyboard-card:has(.animate-pulse)');
    
    if (await renderingCard.count() > 0) {
      await renderingCard.first().click();
      
      // Should see progress indicator
      await expect(page.locator('[data-testid="render-progress"], .progress, [role="progressbar"]')).toBeVisible({ timeout: 5000 });
    } else {
      test.skip(true, 'No storyboards currently rendering');
    }
  });
});

test.describe('Storyboard Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('[name="email"]', process.env.TEST_EMAIL || 'test@example.com');
    await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  test('can configure subtitle settings', async ({ page }) => {
    await page.goto('/dashboard/storyboards');
    
    const storyboardCard = page.locator('[data-testid="storyboard-card"], .storyboard-card').first();
    
    if (await storyboardCard.count() > 0) {
      await storyboardCard.click();
      
      // Look for subtitle settings
      const subtitleSettings = page.locator('button:has-text("Subtitle"), [data-testid="subtitle-settings"]');
      
      if (await subtitleSettings.isVisible()) {
        await subtitleSettings.click();
        
        // Should see subtitle configuration options
        await expect(page.locator('[data-testid="subtitle-customizer"], .subtitle-settings')).toBeVisible({ timeout: 5000 });
      }
    } else {
      test.skip(true, 'No storyboards available');
    }
  });

  test('can configure music settings', async ({ page }) => {
    await page.goto('/dashboard/storyboards');
    
    const storyboardCard = page.locator('[data-testid="storyboard-card"], .storyboard-card').first();
    
    if (await storyboardCard.count() > 0) {
      await storyboardCard.click();
      
      // Look for music settings
      const musicSettings = page.locator('button:has-text("Music"), [data-testid="music-settings"]');
      
      if (await musicSettings.isVisible()) {
        await musicSettings.click();
        
        // Should see music configuration
        await expect(page.locator('[data-testid="music-selector"], .music-settings')).toBeVisible({ timeout: 5000 });
      }
    } else {
      test.skip(true, 'No storyboards available');
    }
  });
});
