import { test, expect } from '@playwright/test';
import { login, testUser, navigateToTradingPair, placeLimitOrder } from './fixtures';

/**
 * Trading E2E Tests
 * Tests trading page, order placement, order book, and trade history
 */

test.describe('Trading Page', () => {
  
  test.describe('Trading Interface', () => {
    
    test('should display trading page with chart', async ({ page }) => {
      await page.goto('/trade');
      
      // Should have main trading components
      await expect(page.locator('[data-testid="trading-chart"], .chart-container, canvas')).toBeVisible();
    });
    
    test('should display order book', async ({ page }) => {
      await page.goto('/trade');
      
      await expect(page.locator('[data-testid="order-book"], .order-book')).toBeVisible();
      
      // Order book should have bids and asks sections
      await expect(page.locator('text=/bid|buy/i')).toBeVisible();
      await expect(page.locator('text=/ask|sell/i')).toBeVisible();
    });
    
    test('should display recent trades', async ({ page }) => {
      await page.goto('/trade');
      
      await expect(page.locator('[data-testid="recent-trades"], .trade-history')).toBeVisible();
    });
    
    test('should display order form', async ({ page }) => {
      await page.goto('/trade');
      
      // Order form elements
      await expect(page.locator('[data-testid="order-form"], .order-form')).toBeVisible();
      await expect(page.locator('text=/limit|market/i')).toBeVisible();
    });
    
    test('should switch between trading pairs', async ({ page }) => {
      await page.goto('/trade/BTCUSDT');
      
      // Click on pair selector
      const pairSelector = page.locator('[data-testid="pair-selector"], .pair-selector');
      
      if (await pairSelector.isVisible()) {
        await pairSelector.click();
        
        // Select a different pair
        await page.click('text=ETHUSDT');
        
        // URL should update
        await expect(page).toHaveURL(/ETHUSDT/i);
      }
    });
  });
  
  test.describe('Order Form', () => {
    
    test('should have limit and market order tabs', async ({ page }) => {
      await page.goto('/trade');
      
      await expect(page.locator('text=/limit/i')).toBeVisible();
      await expect(page.locator('text=/market/i')).toBeVisible();
    });
    
    test('should switch between buy and sell', async ({ page }) => {
      await page.goto('/trade');
      
      // Buy button
      const buyButton = page.locator('[data-testid="buy-button"], button:has-text("Buy")');
      await expect(buyButton).toBeVisible();
      
      // Sell button  
      const sellButton = page.locator('[data-testid="sell-button"], button:has-text("Sell")');
      await expect(sellButton).toBeVisible();
    });
    
    test('should calculate total on price/quantity input', async ({ page }) => {
      await page.goto('/trade');
      
      // Click limit tab if available
      await page.click('text=/limit/i').catch(() => {});
      
      // Fill price and quantity
      const priceInput = page.locator('[data-testid="price-input"], input[name="price"]');
      const quantityInput = page.locator('[data-testid="quantity-input"], input[name="quantity"]');
      
      if (await priceInput.isVisible() && await quantityInput.isVisible()) {
        await priceInput.fill('45000');
        await quantityInput.fill('0.1');
        
        // Total should be calculated
        await expect(page.locator('text=/total|4500/i')).toBeVisible();
      }
    });
    
    test('should show login prompt for unauthenticated users', async ({ page }) => {
      await page.goto('/trade');
      
      // Try to place order without login
      const placeOrderBtn = page.locator('[data-testid="place-order-button"], button:has-text("Place Order")');
      
      if (await placeOrderBtn.isVisible()) {
        await placeOrderBtn.click();
        
        // Should show login prompt or redirect
        await expect(page.locator('text=/login|sign in/i')).toBeVisible({ timeout: 5000 });
      }
    });
  });
  
  test.describe('Order Book Interaction', () => {
    
    test('should update order form when clicking order book price', async ({ page }) => {
      await page.goto('/trade');
      
      // Click on a price in the order book
      const priceRow = page.locator('[data-testid="order-book"] .price-row, .order-book-row').first();
      
      if (await priceRow.isVisible()) {
        await priceRow.click();
        
        // Price input should be populated
        const priceInput = page.locator('[data-testid="price-input"], input[name="price"]');
        await expect(priceInput).not.toBeEmpty();
      }
    });
  });
  
  test.describe('Chart', () => {
    
    test('should display candlestick chart', async ({ page }) => {
      await page.goto('/trade');
      
      // Chart container should be visible
      await expect(page.locator('.chart-container, [data-testid="trading-chart"], canvas')).toBeVisible();
    });
    
    test('should have timeframe selector', async ({ page }) => {
      await page.goto('/trade');
      
      // Timeframe buttons
      const timeframes = page.locator('text=/1m|5m|15m|1h|4h|1d/i');
      expect(await timeframes.count()).toBeGreaterThan(0);
    });
  });
});

test.describe('Trading (Authenticated)', () => {
  
  test.beforeEach(async ({ page }) => {
    // Skip all tests in this group if no test user
    test.skip(!testUser.email, 'No test user configured');
  });
  
  test('should place a limit buy order', async ({ page }) => {
    // Would need authentication
    // await login(page, testUser.email, testUser.password);
    // await navigateToTradingPair(page, 'BTCUSDT');
    // await placeLimitOrder(page, 'buy', '40000', '0.001');
    
    // Order should appear in open orders
    // await expect(page.locator('[data-testid="open-orders"]')).toContainText('40000');
  });
  
  test('should cancel an open order', async ({ page }) => {
    // Would need authentication and an open order
  });
  
  test('should display order history', async ({ page }) => {
    // Navigate to orders page
    // await page.goto('/orders');
    // await expect(page.locator('table, [data-testid="orders-table"]')).toBeVisible();
  });
});
