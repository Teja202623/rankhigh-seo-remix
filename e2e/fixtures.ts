/**
 * Playwright Test Fixtures for RankHigh SEO
 *
 * Custom fixtures for Shopify app specific testing utilities
 * Adapted from Meridian Theme testing infrastructure
 */

import { test as base, expect, Page } from '@playwright/test';

type RankHighFixtures = {
  authenticatedPage: Page;
  appPage: Page;
  guestPage: Page;
};

export const test = base.extend<RankHighFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to app
    await page.goto('/');

    // Wait for Shopify app bridge to load
    await page.waitForFunction(() => {
      return typeof window !== 'undefined' &&
             (window as any).shopifyApp !== undefined;
    }).catch(() => {
      // App bridge might not be available in test environment
    });

    await use(page);
  },

  appPage: async ({ page }, use) => {
    // Navigate to dashboard
    await page.goto('/app');

    // Wait for app to load
    await page.waitForSelector('[data-testid="app-header"]', { timeout: 10000 }).catch(() => {
      // Element might not exist in all test scenarios
    });

    await use(page);
  },

  guestPage: async ({ page }, use) => {
    // Keep page as-is for guest user testing
    await use(page);
  },
});

/**
 * Helper to wait for a Shopify API request
 */
export async function waitForShopifyAPI(page: Page, timeout = 5000) {
  await page.waitForFunction(
    () => (window as any).Shopify?.Checkout !== undefined,
    { timeout }
  ).catch(() => {
    // Shopify API might not be available
  });
}

/**
 * Helper to check if element is in viewport
 */
export async function isInViewport(page: Page, selector: string): Promise<boolean> {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }, selector);
}

/**
 * Helper to wait for cart to update
 */
export async function waitForCartUpdate(page: Page, timeout = 5000) {
  const initialCount = await getCartCount(page).catch(() => 0);

  await page.waitForFunction(
    async () => {
      const newCount = await getCartCount(page).catch(() => 0);
      return newCount > initialCount;
    },
    { timeout }
  ).catch(() => {
    // Cart might not update in test environment
  });
}

/**
 * Helper to get current cart count
 */
export async function getCartCount(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const cartElement = document.querySelector('[data-cart-count]');
    if (cartElement) {
      return parseInt(cartElement.getAttribute('data-cart-count') || '0', 10);
    }
    return 0;
  });
}

/**
 * Helper to add a product to cart
 */
export async function addToCart(page: Page, productSelector = '[data-product-id]') {
  const productId = await page.getAttribute(productSelector, 'data-product-id');

  if (!productId) {
    throw new Error(`Product not found with selector: ${productSelector}`);
  }

  // Find and click add to cart button
  const addButton = page.locator(productSelector).locator('button:has-text("Add")');
  await addButton.click();

  // Wait for cart update
  await waitForCartUpdate(page);
}

/**
 * Helper to wait for animations to complete
 */
export async function waitForAnimations(page: Page, timeout = 1000) {
  await page.evaluate((t) => {
    return new Promise(resolve => setTimeout(resolve, t));
  }, timeout);
}

/**
 * Helper to clear cart
 */
export async function clearCart(page: Page) {
  // Navigate to cart
  await page.goto('/cart');

  // Find and click remove buttons for all items
  const removeButtons = page.locator('[data-remove-item]');
  const count = await removeButtons.count();

  for (let i = 0; i < count; i++) {
    await removeButtons.first().click();
    await page.waitForTimeout(500);
  }
}

/**
 * Helper to toggle modal
 */
export async function toggleModal(page: Page, modalSelector: string, open = true) {
  const modal = page.locator(modalSelector);
  const isVisible = await modal.isVisible().catch(() => false);

  if (open && !isVisible) {
    const trigger = page.locator(`[aria-controls="${modalSelector}"]`);
    await trigger.click();
    await modal.waitFor({ state: 'visible' });
  } else if (!open && isVisible) {
    const closeButton = modal.locator('[aria-label="Close"]');
    await closeButton.click();
    await modal.waitFor({ state: 'hidden' });
  }
}

/**
 * Helper to check form validity
 */
export async function isFormValid(page: Page, formSelector: string): Promise<boolean> {
  return await page.evaluate((sel) => {
    const form = document.querySelector(sel) as HTMLFormElement;
    if (!form) return false;
    return form.checkValidity();
  }, formSelector);
}

/**
 * Helper to submit form
 */
export async function submitForm(page: Page, formSelector: string) {
  const form = page.locator(formSelector);
  await form.evaluate((el: HTMLFormElement) => el.submit());
}

export { expect };
