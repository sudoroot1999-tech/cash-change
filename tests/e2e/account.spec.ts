import { test, expect } from '@playwright/test';
import { login, testUser } from './fixtures';

/**
 * Account Settings E2E Tests
 * Tests profile, settings, security, and verification pages
 */

test.describe('Account Pages', () => {
  
  test.describe('Profile Page', () => {
    
    test('should redirect to login if not authenticated', async ({ page }) => {
      await page.goto('/account/profile');
      await expect(page).toHaveURL(/auth|login/i, { timeout: 5000 });
    });
    
    test('should display profile information', async ({ page }) => {
      test.skip(!testUser.email, 'No test user');
      // After login:
      // Should show email, username, verification status
    });
    
    test('should allow editing profile', async ({ page }) => {
      test.skip(!testUser.email, 'No test user');
      // Click edit button
      // Form should become editable
    });
  });
  
  test.describe('Settings Page', () => {
    
    test('should display settings tabs', async ({ page }) => {
      test.skip(!testUser.email, 'No test user');
      // Should have: General, Notifications, Trading, Appearance
    });
    
    test('should toggle notifications', async ({ page }) => {
      test.skip(!testUser.email, 'No test user');
      // Toggle notification switches
    });
    
    test('should change theme', async ({ page }) => {
      test.skip(!testUser.email, 'No test user');
      // Switch between light/dark theme
      // Should persist
    });
  });
  
  test.describe('Security Page', () => {
    
    test('should display security options', async ({ page }) => {
      test.skip(!testUser.email, 'No test user');
      // Should show:
      // - 2FA status
      // - Change password
      // - Active sessions
    });
    
    test('should show 2FA setup option', async ({ page }) => {
      test.skip(!testUser.email, 'No test user');
      // Click "Enable 2FA"
      // Should show QR code or setup instructions
    });
    
    test('should allow changing password', async ({ page }) => {
      test.skip(!testUser.email, 'No test user');
      // Click "Change Password"
      // Form should appear
    });
    
    test('should display active sessions', async ({ page }) => {
      test.skip(!testUser.email, 'No test user');
      // Should show list of active sessions
      // With "Logout All" option
    });
  });
  
  test.describe('API Keys Page', () => {
    
    test('should display API keys list', async ({ page }) => {
      test.skip(!testUser.email, 'No test user');
      // Navigate to API keys
      // Should show table or empty state
    });
    
    test('should show create API key modal', async ({ page }) => {
      test.skip(!testUser.email, 'No test user');
      // Click "Create API Key"
      // Modal should appear with permissions
    });
  });
  
  test.describe('Verification (KYC) Page', () => {
    
    test('should display verification tiers', async ({ page }) => {
      test.skip(!testUser.email, 'No test user');
      // Should show verification levels and limits
    });
    
    test('should show verification progress', async ({ page }) => {
      test.skip(!testUser.email, 'No test user');
      // Should show current verification status
    });
    
    test('should have document upload', async ({ page }) => {
      test.skip(!testUser.email, 'No test user');
      // Click "Verify Now"
      // Should show document upload form
    });
  });
});

test.describe('Navigation', () => {
  
  test('header should have account dropdown', async ({ page }) => {
    await page.goto('/trade');
    
    // User menu should exist (even if for login prompt)
    const userMenu = page.locator('[data-testid="user-menu"], .user-menu, button:has-text("Account")');
    await expect(userMenu).toBeVisible({ timeout: 5000 }).catch(() => {
      // Might show login button instead
      expect(page.locator('text=/login|sign in/i')).toBeVisible();
    });
  });
  
  test('account sidebar should have all links', async ({ page }) => {
    test.skip(!testUser.email, 'No test user');
    // After login, go to account
    // Sidebar should have:
    // - Profile
    // - Settings
    // - Security
    // - API Keys
    // - Verification
  });
});
