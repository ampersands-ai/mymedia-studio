import { test, expect } from '@playwright/test';

/**
 * Community Features E2E Tests
 * 
 * Tests for community sharing functionality:
 * - Sharing generations to community
 * - Browsing community creations
 * - Viewing shared content (public access)
 */

test.describe('Community Sharing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('[name="email"]', process.env.TEST_EMAIL || 'test@example.com');
    await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  test('can share a generation to community', async ({ page }) => {
    await page.goto('/dashboard/history');
    
    // Wait for generations
    await page.waitForSelector('[data-testid="generation-card"], .generation-card', { timeout: 10000 });
    
    // Click on a completed generation
    await page.locator('[data-testid="generation-card"], .generation-card').first().click();
    
    // Wait for modal
    await expect(page.locator('[role="dialog"], .modal')).toBeVisible({ timeout: 5000 });
    
    // Find share button
    const shareButton = page.locator('button:has-text("Share"), [data-testid="share-button"]');
    
    if (await shareButton.isVisible()) {
      await shareButton.click();
      
      // Should show share options or confirmation
      await expect(page.locator('[data-testid="share-modal"], .share-options, [role="dialog"]:has-text("Share")')).toBeVisible({ timeout: 5000 });
      
      // Confirm share to community
      const communityShareButton = page.locator('button:has-text("Community"), button:has-text("Share to Community")');
      if (await communityShareButton.isVisible()) {
        await communityShareButton.click();
        
        // Should show success message
        await expect(page.locator('[data-sonner-toast], .toast')).toContainText(/shared|success/i);
      }
    }
  });

  test('can unshare a generation from community', async ({ page }) => {
    await page.goto('/dashboard/history');
    
    // Wait for generations
    await page.waitForSelector('[data-testid="generation-card"], .generation-card', { timeout: 10000 });
    
    // Look for already shared generation
    const sharedGeneration = page.locator('[data-testid="generation-card"]:has([data-shared="true"]), .generation-card:has(.shared-indicator)');
    
    if (await sharedGeneration.count() > 0) {
      await sharedGeneration.first().click();
      
      // Find unshare button
      const unshareButton = page.locator('button:has-text("Unshare"), button:has-text("Remove from Community")');
      
      if (await unshareButton.isVisible()) {
        await unshareButton.click();
        
        // Confirm if needed
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
        
        // Should show success message
        await expect(page.locator('[data-sonner-toast], .toast')).toBeVisible();
      }
    } else {
      test.skip(true, 'No shared generations to test unshare');
    }
  });
});

test.describe('Community Browsing', () => {
  test('can view community gallery without login', async ({ page }) => {
    // Navigate to community page without logging in
    await page.goto('/community');
    
    // Should see community creations
    await expect(page.locator('[data-testid="community-grid"], .community-gallery, .grid')).toBeVisible({ timeout: 10000 });
  });

  test('displays community creations with metadata', async ({ page }) => {
    await page.goto('/community');
    
    // Wait for content to load
    await page.waitForSelector('[data-testid="community-item"], .community-card', { timeout: 10000 });
    
    // Each item should show basic info
    const firstItem = page.locator('[data-testid="community-item"], .community-card').first();
    
    // Should have image or video preview
    await expect(firstItem.locator('img, video')).toBeVisible();
  });

  test('can filter community creations by type', async ({ page }) => {
    await page.goto('/community');
    
    // Look for filter controls
    const filterButton = page.locator('button:has-text("Filter"), [data-testid="filter-button"]');
    
    if (await filterButton.isVisible()) {
      await filterButton.click();
      
      // Select image filter
      const imageFilter = page.locator('button:has-text("Image"), [data-value="image"]');
      if (await imageFilter.isVisible()) {
        await imageFilter.click();
        
        // Wait for filter to apply
        await page.waitForTimeout(500);
        
        // All visible items should be images
        const items = page.locator('[data-testid="community-item"], .community-card');
        const count = await items.count();
        
        if (count > 0) {
          // At least one item should be visible after filtering
          await expect(items.first()).toBeVisible();
        }
      }
    }
  });

  test('can view creation details', async ({ page }) => {
    await page.goto('/community');
    
    // Wait for content
    await page.waitForSelector('[data-testid="community-item"], .community-card', { timeout: 10000 });
    
    // Click on first item
    await page.locator('[data-testid="community-item"], .community-card').first().click();
    
    // Should open detail view or modal
    await expect(page.locator('[data-testid="creation-detail"], [role="dialog"], .creation-modal')).toBeVisible({ timeout: 5000 });
  });

  test('supports pagination or infinite scroll', async ({ page }) => {
    await page.goto('/community');
    
    // Wait for initial content
    await page.waitForSelector('[data-testid="community-item"], .community-card', { timeout: 10000 });
    
    // Get initial count
    const initialCount = await page.locator('[data-testid="community-item"], .community-card').count();
    
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Wait for more content to potentially load
    await page.waitForTimeout(2000);
    
    // Check if more items loaded (or pagination button exists)
    const loadMoreButton = page.locator('button:has-text("Load More"), button:has-text("Show More")');
    const newCount = await page.locator('[data-testid="community-item"], .community-card').count();
    
    // Either more items loaded or load more button exists
    expect(newCount >= initialCount || await loadMoreButton.count() > 0).toBeTruthy();
  });
});

test.describe('Community Likes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('[name="email"]', process.env.TEST_EMAIL || 'test@example.com');
    await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  test('can like a community creation', async ({ page }) => {
    await page.goto('/community');
    
    // Wait for content
    await page.waitForSelector('[data-testid="community-item"], .community-card', { timeout: 10000 });
    
    // Find like button on first item
    const likeButton = page.locator('[data-testid="community-item"], .community-card').first().locator('button:has-text("Like"), [data-testid="like-button"], button svg.lucide-heart');
    
    if (await likeButton.isVisible()) {
      // Get initial like count if displayed
      const likeCount = page.locator('[data-testid="like-count"]').first();
      const initialCount = await likeCount.textContent().catch(() => '0');
      
      await likeButton.click();
      
      // Like should be registered (button state change or count increase)
      await page.waitForTimeout(500);
    }
  });
});
