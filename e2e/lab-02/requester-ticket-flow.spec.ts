import { test, expect } from '@playwright/test';

const REQUESTER = { 
  email: 'michael.b@example.com', 
  defaultPassword: 'password', 
  newPassword: 'NewSecurePassword123!' 
};

test.describe('Requester Ticket Flow (Lab 2)', () => {
  
  test('A Requester creates a Ticket and later finds it in My Tickets', async ({ page }) => {
    await page.goto('http://localhost:5173');

    await page.getByLabel('Email address').fill(REQUESTER.email);
    await page.getByLabel('Password').fill(REQUESTER.defaultPassword);
    await page.click('button[type="submit"]');

    await expect(page.getByLabel('Current Password')).toBeVisible();
    await page.getByLabel('Current Password').fill(REQUESTER.defaultPassword);
    await page.getByLabel('New Password', { exact: true }).fill(REQUESTER.newPassword);
    await page.getByLabel('Confirm New Password').fill(REQUESTER.newPassword);
    await page.click('button[type="submit"]');

    await expect(page.locator('button:has-text("Logout"), a:has-text("Logout")')).toBeVisible();

    await page.getByRole('button', { name: 'Create Ticket' }).click();
    await page.getByPlaceholder('Brief description of the issue').fill('E2E Test: Wi-Fi issue on Campus');
    
    const selects = page.locator('select');
    await selects.nth(0).selectOption({ label: 'Network' });      // Category
    await selects.nth(1).selectOption({ label: 'Campus Wi-Fi' }); // Related System
    await selects.nth(2).selectOption({ label: 'High' });         // Requested Priority
    
    await page.getByPlaceholder('Provide detailed information...').fill('I cannot connect to the campus Wi-Fi since this morning.');

    await page.getByRole('button', { name: 'Submit Ticket' }).click();

    await expect(page.getByText('Ticket Created Successfully!')).toBeVisible({ timeout: 5000 });
    
    await page.getByRole('button', { name: 'My Tickets' }).click();
    await expect(page.getByText('E2E Test: Wi-Fi issue on Campus').first()).toBeVisible();
  });
});