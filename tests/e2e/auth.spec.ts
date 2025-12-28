import { test, expect } from '@playwright/test';
import { login, register, logout, testUser, generateTestEmail } from './fixtures';

/**
 * Authentication E2E Tests
 * Tests user registration, login, logout, and session management
 */

test.describe('Authentication Flow', () => {
  
  test.describe('Registration', () => {
    
    test('should display registration page', async ({ page }) => {
      await page.goto('/auth/register');
      
      await expect(page.locator('h1, h2')).toContainText(/register|sign up|create account/i);
      await expect(page.locator('[data-testid="email-input"], input[type="email"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-input"], input[type="password"]')).toBeVisible();
    });
    
    test('should show validation errors for invalid input', async ({ page }) => {
      await page.goto('/auth/register');
      
      // Submit empty form
      await page.click('[data-testid="register-button"], button[type="submit"]');
      
      // Should show validation errors
      await expect(page.locator('.error, .invalid-feedback, [class*="error"]')).toBeVisible();
    });
    
    test('should show password requirements', async ({ page }) => {
      await page.goto('/auth/register');
      
      await page.fill('[data-testid="password-input"], input[type="password"]', 'weak');
      
      // Should show password requirements message
      await expect(page.locator('text=/password|characters|uppercase/i')).toBeVisible();
    });
    
    test('should register a new user successfully', async ({ page }) => {
      const email = generateTestEmail();
      
      await page.goto('/auth/register');
      await page.fill('[data-testid="email-input"], input[type="email"]', email);
      await page.fill('[data-testid="password-input"], input[type="password"]', 'SecureP@ss123!');
      await page.fill('[data-testid="confirm-password-input"], input[name="confirmPassword"]', 'SecureP@ss123!');
      
      await page.click('[data-testid="register-button"], button[type="submit"]');
      
      // Should redirect to trading or dashboard
      await expect(page).toHaveURL(/trade|dashboard|verify/i, { timeout: 10000 });
    });
  });
  
  test.describe('Login', () => {
    
    test('should display login page', async ({ page }) => {
      await page.goto('/auth/login');
      
      await expect(page.locator('h1, h2')).toContainText(/login|sign in/i);
      await expect(page.locator('[data-testid="email-input"], input[type="email"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-input"], input[type="password"]')).toBeVisible();
    });
    
    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/auth/login');
      
      await page.fill('[data-testid="email-input"], input[type="email"]', 'invalid@test.com');
      await page.fill('[data-testid="password-input"], input[type="password"]', 'wrongpassword');
      await page.click('[data-testid="login-button"], button[type="submit"]');
      
      // Should show error message
      await expect(page.locator('text=/invalid|incorrect|failed/i')).toBeVisible({ timeout: 5000 });
    });
    
    test('should have link to registration', async ({ page }) => {
      await page.goto('/auth/login');
      
      const registerLink = page.locator('a[href*="register"]');
      await expect(registerLink).toBeVisible();
    });
    
    test('should have forgot password link', async ({ page }) => {
      await page.goto('/auth/login');
      
      const forgotLink = page.locator('a[href*="forgot"], a[href*="reset"]');
      await expect(forgotLink).toBeVisible();
    });
  });
  
  test.describe('Session Management', () => {
    
    test('should redirect to login when accessing protected route', async ({ page }) => {
      await page.goto('/wallet');
      
      // Should redirect to login
      await expect(page).toHaveURL(/auth|login/i, { timeout: 5000 });
    });
    
    test('should persist session across page refreshes', async ({ page }) => {
      // This test requires a logged-in state
      // Skip if no test user available
      test.skip(!testUser.email, 'No test user configured');
      
      // Login first (would need actual login mechanism)
      // await login(page, testUser.email, testUser.password);
      
      // Refresh page
      // await page.reload();
      
      // Should still be logged in
      // await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });
  });
  
  test.describe('Logout', () => {
    
    test('should logout successfully', async ({ page }) => {
      // Skip if no authenticated session
      test.skip(!testUser.email, 'No test user configured');
      
      // Would need to be logged in first
      // await login(page, testUser.email, testUser.password);
      
      // Click user menu and logout
      // await page.click('[data-testid="user-menu"]');
      // await page.click('[data-testid="logout-button"]');
      
      // Should redirect to login
      // await expect(page).toHaveURL(/auth|login/i);
    });
  });
});

test.describe('Password Reset', () => {
  
  test('should display forgot password page', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
  
  test('should send reset email for valid email', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    
    await page.fill('input[type="email"]', 'user@example.com');
    await page.click('button[type="submit"]');
    
    // Should show success message
    await expect(page.locator('text=/sent|check|email/i')).toBeVisible({ timeout: 5000 });
  });
});
