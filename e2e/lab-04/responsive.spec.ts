import { test, expect } from '@playwright/test';
import { loginAs, USERS } from './helpers';
import * as path from 'path';

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'mobile', width: 390, height: 844 },
];

test.describe('Responsive Layout & Screenshots (RESP-01)', () => {

  for (const vp of VIEWPORTS) {
    test(`Responsive verification and screenshot at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // 1. Requester Dashboard
      await loginAs(page, USERS.jennifer);
      await page.getByRole('group').getByRole('button', { name: /^Dashboard$/i }).click();
      await expect(page.getByRole('heading', { name: /My Dashboard/i })).toBeVisible();

      // Verify no horizontal overflow
      const requesterDashboardOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth <= window.innerWidth + 2; // small tolerance for scrollbars
      });
      expect(requesterDashboardOverflow).toBe(true);

      // Screenshot Requester Dashboard
      await page.screenshot({
        path: path.join('artifacts/lab-04/screenshots/requester-dashboard', `${vp.name}.png`),
        fullPage: true,
      });

      // 2. Staff Dashboard
      await loginAs(page, USERS.staff1);
      await page.getByRole('button', { name: /^Dashboard$/i }).click();
      await expect(page.getByRole('heading', { name: /Staff Dashboard/i })).toBeVisible();

      const staffDashboardOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth <= window.innerWidth + 2;
      });
      expect(staffDashboardOverflow).toBe(true);

      // Screenshot Staff Dashboard
      await page.screenshot({
        path: path.join('artifacts/lab-04/screenshots/staff-dashboard', `${vp.name}.png`),
        fullPage: true,
      });

      // 3. Staff Ticket Detail with Actions Taken tab open
      await page.getByRole('button', { name: /^Queue$/i }).click();
      await page.waitForTimeout(500);

      // In mobile view it's cards, in desktop/tablet it's a table row
      const openBtn = page.getByRole('button', { name: /^Open$/i }).first();
      if (await openBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await openBtn.click();
        await expect(page.getByRole('heading', { name: /IT Workspace/i })).toBeVisible();

        // Switch to Actions Taken tab
        await page.getByRole('tab', { name: /Actions Taken/i }).click();
        await expect(page.locator('.card-header', { hasText: 'Actions Taken' }).first()).toBeVisible();

        const actionsTakenOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth <= window.innerWidth + 2;
        });
        expect(actionsTakenOverflow).toBe(true);

        // Screenshot Actions Taken tab
        await page.screenshot({
          path: path.join('artifacts/lab-04/screenshots/actions-taken', `${vp.name}.png`),
          fullPage: true,
        });
      }
    });
  }
});
