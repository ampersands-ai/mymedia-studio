import { Page, expect, BrowserContext } from '@playwright/test';

/**
 * Shared test utilities for E2E tests
 * Provides consistent helpers for authentication, navigation, and assertions
 */

// Test credentials - use environment variables in CI
export const TEST_CREDENTIALS = {
  regular: {
    email: process.env.TEST_USER_EMAIL || 'test@artifio.ai',
    password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@artifio.ai',
    password: process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!',
  },
};

/**
 * Login as a test user
 */
export async function loginAsTestUser(
  page: Page,
  credentials: { email: string; password: string } = TEST_CREDENTIALS.regular
): Promise<void> {
  await page.goto('/auth');
  await page.fill('input[type="email"]', credentials.email);
  await page.fill('input[type="password"]', credentials.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
}

/**
 * Login as admin user
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await loginAsTestUser(page, TEST_CREDENTIALS.admin);
}

/**
 * Logout current user
 */
export async function logout(page: Page): Promise<void> {
  await page.click('[data-testid="user-menu"]');
  await page.click('text=Sign Out');
  await expect(page).toHaveURL(/.*auth|.*$/);
}

/**
 * Get current credits balance
 */
export async function getCreditsBalance(page: Page): Promise<number> {
  const creditsText = await page.textContent('[data-testid="credits-balance"]');
  return parseInt(creditsText?.match(/\d+/)?.[0] || '0');
}

/**
 * Navigate to create page and select a template
 */
export async function selectTemplate(
  page: Page,
  templateId: string
): Promise<void> {
  await page.goto('/create');
  await page.click(`[data-testid="template-${templateId}"]`);
}

/**
 * Start a generation with a prompt
 */
export async function startGeneration(
  page: Page,
  prompt: string,
  options?: {
    model?: string;
    aspectRatio?: string;
  }
): Promise<void> {
  await page.fill('[data-testid="prompt-input"], textarea[name="prompt"]', prompt);
  
  if (options?.model) {
    await page.click('[data-testid="model-selector"]');
    await page.click(`[data-testid="model-${options.model}"]`);
  }
  
  if (options?.aspectRatio) {
    await page.click(`[data-testid="aspect-${options.aspectRatio}"]`);
  }
  
  await page.click('button:has-text("Generate")');
}

/**
 * Wait for generation to complete
 */
export async function waitForGeneration(
  page: Page,
  timeout: number = 120000
): Promise<void> {
  await expect(
    page.locator('[data-testid="generation-complete"], [data-testid="output-image"], [data-testid="generation-result"]')
  ).toBeVisible({ timeout });
}

/**
 * Wait for generation to fail
 */
export async function waitForGenerationError(
  page: Page,
  timeout: number = 30000
): Promise<void> {
  await expect(
    page.locator('[data-testid="generation-error"], [role="alert"]:has-text("error")')
  ).toBeVisible({ timeout });
}

/**
 * Check if element is visible without throwing
 */
export async function isVisible(
  page: Page,
  selector: string,
  timeout: number = 5000
): Promise<boolean> {
  try {
    await page.locator(selector).waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for toast notification
 */
export async function waitForToast(
  page: Page,
  textPattern: string | RegExp,
  timeout: number = 10000
): Promise<void> {
  const pattern = typeof textPattern === 'string' 
    ? new RegExp(textPattern, 'i')
    : textPattern;
  
  await expect(
    page.locator('[data-sonner-toast], [role="status"]').filter({ hasText: pattern })
  ).toBeVisible({ timeout });
}

/**
 * Clear all cookies and storage
 */
export async function clearSession(context: BrowserContext): Promise<void> {
  await context.clearCookies();
}

/**
 * Take a screenshot with timestamp
 */
export async function takeScreenshot(
  page: Page,
  name: string
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({ 
    path: `test-results/screenshots/${name}-${timestamp}.png`,
    fullPage: true 
  });
}

/**
 * Mock network request
 */
export async function mockNetworkError(
  page: Page,
  urlPattern: string | RegExp
): Promise<void> {
  await page.route(urlPattern, route => route.abort('failed'));
}

/**
 * Mock slow network
 */
export async function mockSlowNetwork(
  page: Page,
  urlPattern: string | RegExp,
  delayMs: number = 5000
): Promise<void> {
  await page.route(urlPattern, async route => {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    await route.continue();
  });
}

/**
 * Generate unique test email
 */
export function generateTestEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2)}@artifio.ai`;
}

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
}

/**
 * Check response headers for security
 */
export async function checkSecurityHeaders(
  page: Page,
  url: string
): Promise<Record<string, string | null>> {
  const response = await page.goto(url);
  const headers = response?.headers() || {};
  
  return {
    'content-security-policy': headers['content-security-policy'] || null,
    'x-frame-options': headers['x-frame-options'] || null,
    'x-content-type-options': headers['x-content-type-options'] || null,
    'strict-transport-security': headers['strict-transport-security'] || null,
    'x-xss-protection': headers['x-xss-protection'] || null,
  };
}

/**
 * Accessibility check helper
 */
export async function checkBasicA11y(page: Page): Promise<{
  hasMainLandmark: boolean;
  hasH1: boolean;
  imagesHaveAlt: boolean;
  buttonsHaveLabels: boolean;
}> {
  const hasMainLandmark = await page.locator('main, [role="main"]').count() > 0;
  const hasH1 = await page.locator('h1').count() > 0;
  
  const images = await page.locator('img').all();
  const imagesWithAlt = await page.locator('img[alt]:not([alt=""])').count();
  const imagesHaveAlt = images.length === 0 || imagesWithAlt === images.length;
  
  const buttons = await page.locator('button').all();
  let buttonsHaveLabels = true;
  for (const button of buttons) {
    const hasText = (await button.textContent())?.trim().length ?? 0 > 0;
    const hasAriaLabel = await button.getAttribute('aria-label');
    const hasTitle = await button.getAttribute('title');
    if (!hasText && !hasAriaLabel && !hasTitle) {
      buttonsHaveLabels = false;
      break;
    }
  }
  
  return { hasMainLandmark, hasH1, imagesHaveAlt, buttonsHaveLabels };
}
