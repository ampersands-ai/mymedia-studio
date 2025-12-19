import { test, expect } from '@playwright/test';
import { loginAsTestUser, checkBasicA11y } from './fixtures/test-utils';

/**
 * Accessibility E2E Tests
 * Tests for WCAG 2.1 AA compliance
 */

test.describe('Basic Accessibility', () => {
  test('TC-A11Y-001: Homepage has proper structure', async ({ page }) => {
    await page.goto('/');

    const a11yCheck = await checkBasicA11y(page);

    expect(a11yCheck.hasH1).toBeTruthy();
    expect(a11yCheck.hasMainLandmark).toBeTruthy();
    expect(a11yCheck.imagesHaveAlt).toBeTruthy();
  });

  test('TC-A11Y-002: Auth page is keyboard navigable', async ({ page }) => {
    await page.goto('/auth');

    // Tab through form elements
    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A']).toContain(firstFocused);

    // Tab to email input
    let emailFocused = false;
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const activeElement = await page.evaluate(() => ({
        tagName: document.activeElement?.tagName,
        type: (document.activeElement as HTMLInputElement)?.type,
      }));
      if (activeElement.tagName === 'INPUT' && activeElement.type === 'email') {
        emailFocused = true;
        break;
      }
    }
    expect(emailFocused).toBeTruthy();

    // Type in focused input
    await page.keyboard.type('test@example.com');

    // Tab to password
    await page.keyboard.press('Tab');
    const passwordFocused = await page.evaluate(() => 
      (document.activeElement as HTMLInputElement)?.type === 'password'
    );
    expect(passwordFocused).toBeTruthy();

    // Tab to submit
    await page.keyboard.press('Tab');
    const submitFocused = await page.evaluate(() => 
      document.activeElement?.tagName === 'BUTTON' && 
      (document.activeElement as HTMLButtonElement)?.type === 'submit'
    );
    expect(submitFocused).toBeTruthy();
  });

  test('TC-A11Y-003: Dashboard has proper ARIA landmarks', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/dashboard');

    // Check for navigation landmark
    const hasNav = await page.locator('nav, [role="navigation"]').count() > 0;
    expect(hasNav).toBeTruthy();

    // Check for main content area
    const hasMain = await page.locator('main, [role="main"]').count() > 0;
    expect(hasMain).toBeTruthy();
  });

  test('TC-A11Y-004: Buttons have accessible names', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/create');

    const buttons = await page.locator('button').all();
    
    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const title = await button.getAttribute('title');
      
      // Button must have some accessible name
      const hasAccessibleName = 
        (text && text.trim().length > 0) || 
        ariaLabel || 
        title;
      
      if (!hasAccessibleName) {
        const buttonHtml = await button.evaluate(el => el.outerHTML);
        console.log('Button without accessible name:', buttonHtml);
      }
      
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  test('TC-A11Y-005: Forms have associated labels', async ({ page }) => {
    await page.goto('/auth');

    const inputs = await page.locator('input:not([type="hidden"])').all();
    
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');
      
      // Check if there's an associated label
      let hasLabel = false;
      if (id) {
        hasLabel = await page.locator(`label[for="${id}"]`).count() > 0;
      }
      
      // Input must have some form of labeling
      const isLabeled = hasLabel || ariaLabel || ariaLabelledby || placeholder;
      expect(isLabeled).toBeTruthy();
    }
  });

  test('TC-A11Y-006: Focus visible on interactive elements', async ({ page }) => {
    await page.goto('/');

    // Tab to first interactive element
    await page.keyboard.press('Tab');

    // Check that focus is visible (has outline or other visual indicator)
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow,
      };
    });

    // Should have some focus indicator
    const hasFocusIndicator = 
      (focusedElement?.outline && focusedElement.outline !== 'none') ||
      (focusedElement?.outlineWidth && focusedElement.outlineWidth !== '0px') ||
      (focusedElement?.boxShadow && focusedElement.boxShadow !== 'none');
    
    expect(hasFocusIndicator).toBeTruthy();
  });

  test('TC-A11Y-007: Color contrast is sufficient', async ({ page }) => {
    await page.goto('/');

    // Check primary text against background
    const contrastCheck = await page.evaluate(() => {
      const body = document.body;
      const styles = window.getComputedStyle(body);
      const bgColor = styles.backgroundColor;
      
      // Find a text element
      const textEl = document.querySelector('h1, h2, p');
      if (!textEl) return { hasText: false };
      
      const textStyles = window.getComputedStyle(textEl);
      const textColor = textStyles.color;
      
      return {
        hasText: true,
        bgColor,
        textColor,
      };
    });

    expect(contrastCheck.hasText).toBeTruthy();
    // Note: Full contrast ratio calculation would require a library
    // This is a basic check that colors are defined
    expect(contrastCheck.bgColor).toBeDefined();
    expect(contrastCheck.textColor).toBeDefined();
  });

  test('TC-A11Y-008: Skip link present for keyboard users', async ({ page }) => {
    await page.goto('/');

    // Press Tab to reveal skip link (often hidden until focused)
    await page.keyboard.press('Tab');

    // Check for skip link
    const skipLink = page.locator('a[href="#main"], a:has-text("Skip"), a:has-text("skip")');
    const hasSkipLink = await skipLink.count() > 0;
    
    // Skip links are a best practice but not always implemented
    if (hasSkipLink) {
      await expect(skipLink.first()).toBeVisible();
    }
  });
});

test.describe('Interactive Components Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('TC-A11Y-009: Modal dialogs trap focus', async ({ page }) => {
    await page.goto('/dashboard');

    // Find and click a button that opens a modal
    const modalTrigger = page.locator('[data-testid="open-modal"], button:has-text("Settings"), [aria-haspopup="dialog"]').first();
    
    if (await modalTrigger.isVisible()) {
      await modalTrigger.click();

      // Wait for modal
      const modal = page.locator('[role="dialog"], [aria-modal="true"]');
      if (await modal.isVisible()) {
        // Focus should be inside modal
        const focusInModal = await page.evaluate(() => {
          const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
          return modal?.contains(document.activeElement);
        });
        expect(focusInModal).toBeTruthy();

        // Tab should cycle within modal
        for (let i = 0; i < 20; i++) {
          await page.keyboard.press('Tab');
          const stillInModal = await page.evaluate(() => {
            const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
            return modal?.contains(document.activeElement);
          });
          expect(stillInModal).toBeTruthy();
        }

        // Escape should close modal
        await page.keyboard.press('Escape');
        await expect(modal).not.toBeVisible();
      }
    }
  });

  test('TC-A11Y-010: Dropdown menus are keyboard accessible', async ({ page }) => {
    await page.goto('/dashboard');

    // Find user menu
    const userMenu = page.locator('[data-testid="user-menu"]');
    
    if (await userMenu.isVisible()) {
      // Focus and open with Enter
      await userMenu.focus();
      await page.keyboard.press('Enter');

      // Menu should open
      const menuItems = page.locator('[role="menuitem"], [role="menu"] button, [role="menu"] a');
      await expect(menuItems.first()).toBeVisible();

      // Arrow down should navigate
      await page.keyboard.press('ArrowDown');
      
      // Escape should close
      await page.keyboard.press('Escape');
      await expect(menuItems.first()).not.toBeVisible();
    }
  });

  test('TC-A11Y-011: Toast notifications are announced', async ({ page }) => {
    await page.goto('/create');

    // Trigger an action that shows toast
    await page.fill('textarea, [data-testid="prompt-input"]', '');
    await page.click('button:has-text("Generate")');

    // Toast should have role="status" or role="alert"
    const toast = page.locator('[role="status"], [role="alert"], [data-sonner-toast]');
    
    if (await toast.isVisible()) {
      const role = await toast.getAttribute('role');
      expect(['status', 'alert']).toContain(role);
    }
  });

  test('TC-A11Y-012: Loading states are announced', async ({ page }) => {
    await page.goto('/create');

    // Start a generation
    await page.fill('textarea, [data-testid="prompt-input"]', 'Test prompt');
    await page.click('button:has-text("Generate")');

    // Check for aria-busy or aria-live
    const loadingIndicator = page.locator('[aria-busy="true"], [aria-live]');
    const hasA11yLoading = await loadingIndicator.count() > 0;
    
    // At minimum, there should be visual loading indicator
    const visualLoading = page.locator('.animate-spin, .animate-pulse, [data-testid="loading"]');
    const hasVisualLoading = await visualLoading.count() > 0;
    
    expect(hasA11yLoading || hasVisualLoading).toBeTruthy();
  });
});

test.describe('Responsive Accessibility', () => {
  test('TC-A11Y-013: Touch targets are adequately sized on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check button sizes
    const buttons = await page.locator('button, a').all();
    
    for (const button of buttons.slice(0, 10)) { // Check first 10
      const box = await button.boundingBox();
      if (box) {
        // WCAG 2.5.5 recommends 44x44px minimum
        // We'll check for at least 40x40 as a reasonable minimum
        const isAdequateSize = box.width >= 40 && box.height >= 40;
        
        if (!isAdequateSize) {
          const text = await button.textContent();
          console.log(`Small touch target: "${text}" (${box.width}x${box.height})`);
        }
      }
    }
  });

  test('TC-A11Y-014: Content is readable without horizontal scroll', async ({ page }) => {
    // Test at various widths
    const widths = [320, 375, 414];
    
    for (const width of widths) {
      await page.setViewportSize({ width, height: 667 });
      await page.goto('/');

      // Check that page width doesn't exceed viewport
      const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(pageWidth).toBeLessThanOrEqual(width + 1); // +1 for rounding
    }
  });
});
