import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test Fixtures
 * Shared utilities for all E2E tests
 */

// Test user credentials
export const testUser = {
  email: 'e2e-test@example.com',
  password: 'E2ETestPassword123!',
  username: 'e2etest',
};

// Admin user credentials
export const adminUser = {
  email: 'admin@cryptox.com',
  password: 'AdminPassword123!',
  username: 'admin',
};

/**
 * Login helper function
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/auth/login');
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-button"]');
  
  // Wait for redirect to trading page
  await page.waitForURL('**/trade**', { timeout: 10000 });
}

/**
 * Logout helper function
 */
export async function logout(page: Page): Promise<void> {
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout-button"]');
  await page.waitForURL('**/auth/login**');
}

/**
 * Register helper function
 */
export async function register(
  page: Page, 
  email: string, 
  password: string
): Promise<void> {
  await page.goto('/auth/register');
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.fill('[data-testid="confirm-password-input"]', password);
  await page.click('[data-testid="register-button"]');
  
  // Wait for redirect
  await page.waitForURL('**/trade**', { timeout: 10000 });
}

/**
 * Navigate to a specific trading pair
 */
export async function navigateToTradingPair(page: Page, pair: string): Promise<void> {
  await page.goto(`/trade/${pair}`);
  await page.waitForSelector('[data-testid="order-book"]');
}

/**
 * Place a limit order
 */
export async function placeLimitOrder(
  page: Page,
  side: 'buy' | 'sell',
  price: string,
  quantity: string
): Promise<void> {
  // Select order type
  await page.click('[data-testid="limit-order-tab"]');
  
  // Select side
  await page.click(`[data-testid="${side}-button"]`);
  
  // Fill in price and quantity
  await page.fill('[data-testid="price-input"]', price);
  await page.fill('[data-testid="quantity-input"]', quantity);
  
  // Submit order
  await page.click('[data-testid="place-order-button"]');
  
  // Wait for confirmation
  await page.waitForSelector('[data-testid="order-success-toast"]', { timeout: 5000 });
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const userMenu = await page.$('[data-testid="user-menu"]');
  return userMenu !== null;
}

/**
 * Wait for loading to complete
 */
export async function waitForLoading(page: Page): Promise<void> {
  // Wait for any loading spinners to disappear
  await page.waitForSelector('[data-testid="loading-spinner"]', { state: 'hidden', timeout: 10000 }).catch(() => {});
}

/**
 * Get wallet balance for a currency
 */
export async function getWalletBalance(page: Page, currency: string): Promise<string> {
  await page.goto('/wallet');
  const balanceElement = await page.waitForSelector(`[data-testid="balance-${currency}"]`);
  return balanceElement?.textContent() || '0';
}

/**
 * Generate unique test email
 */
export function generateTestEmail(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;
}
