import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginAs, USERS } from './helpers';

test.describe('Accessibility Scans & Keyboard Navigation (A11Y-01..02)', () => {

  test('A11Y-01: axe-core scan of Login, Requester Dashboard, Staff Dashboard, Staff Ticket Detail', async ({ page }) => {
    // 1. Login page
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('#email', { state: 'visible' });
    const loginScan = await new AxeBuilder({ page }).analyze();
    const loginViolations = loginScan.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(loginViolations).toEqual([]);

    // 2. Requester Dashboard
    await loginAs(page, USERS.jennifer);
    await expect(page.getByRole('heading', { name: /My Dashboard/i })).toBeVisible();
    const reqDashScan = await new AxeBuilder({ page }).analyze();
    const reqDashViolations = reqDashScan.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(reqDashViolations).toEqual([]);

    // 3. Staff Dashboard
    await loginAs(page, USERS.staff1);
    await expect(page.getByRole('heading', { name: /Staff Dashboard/i })).toBeVisible();
    const staffDashScan = await new AxeBuilder({ page }).analyze();
    const staffDashViolations = staffDashScan.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(staffDashViolations).toEqual([]);

    // 4. Staff Ticket Detail with Actions Taken tab open
    await page.getByRole('button', { name: /^Queue$/i }).click();
    const row = page.locator('table tbody tr').first();
    if (await row.count() > 0 && await row.getByText('No tickets found').count() === 0) {
      await row.getByRole('button', { name: 'Open' }).click();
      await page.getByRole('tab', { name: /Actions Taken/i }).click();
      await expect(page.locator('.card-header', { hasText: 'Actions Taken' }).first()).toBeVisible();

      const detailScan = await new AxeBuilder({ page }).analyze();
      const detailViolations = detailScan.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
      expect(detailViolations).toEqual([]);
    }
  });

  test('A11Y-02: Keyboard-only interaction: record action form and keyboard controls', async ({ page }) => {
    await loginAs(page, USERS.staff1);
    await page.getByRole('button', { name: /^Queue$/i }).click();

    const row = page.locator('table tbody tr').first();
    if (await row.count() > 0 && await row.getByText('No tickets found').count() === 0) {
      await row.getByRole('button', { name: 'Open' }).click();

      // Navigate to Actions Taken tab
      await page.getByRole('tab', { name: /Actions Taken/i }).focus();
      await page.keyboard.press('Enter');

      // Open Record Action form
      const recordBtn = page.getByRole('button', { name: /\+ Record Action/i });
      await recordBtn.focus();
      await page.keyboard.press('Enter');

      // Form should be visible
      await expect(page.locator('#description')).toBeVisible();

      // Fill using keyboard
      await page.locator('#description').focus();
      await page.keyboard.type('Keyboard navigated action verification');

      await page.locator('#result').focus();
      await page.keyboard.type('Successfully saved with keyboard');

      // Submit with keyboard
      const submitBtn = page.getByRole('button', { name: /^Record Action$/i });
      await submitBtn.focus();
      await page.keyboard.press('Enter');

      await expect(page.getByText('Keyboard navigated action verification').first()).toBeVisible();
    }
  });
});
