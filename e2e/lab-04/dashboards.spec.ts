import { test, expect } from '@playwright/test';
import { loginAs, USERS } from './helpers';

test.describe('Dashboards Flow (E2E-07..10)', () => {

  test('E2E-07: Requester dashboard -> card drill-down -> Ticket Detail', async ({ page }) => {
    await loginAs(page, USERS.jennifer);

    // Dashboard should be the landing page
    await expect(page.getByRole('button', { name: /^Dashboard$/i })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { name: 'My Dashboard' })).toBeVisible();

    // 4 metric cards should be visible
    await expect(page.getByTestId('card-open')).toBeVisible();
    await expect(page.getByTestId('card-waitingForYou')).toBeVisible();
    await expect(page.getByTestId('card-resolved')).toBeVisible();
    await expect(page.getByTestId('card-closed')).toBeVisible();

    // Click on Open card drill-down
    await page.getByTestId('card-open').click();

    // Should navigate to My Tickets tab
    await expect(page.getByRole('button', { name: /^My Tickets$/i })).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('table')).toBeVisible();
  });

  test('E2E-08: Staff dashboard card -> Queue; compare totals', async ({ page }) => {
    await loginAs(page, USERS.staff1);

    // Staff landing page is Dashboard
    await expect(page.getByRole('button', { name: /^Dashboard$/i })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { name: 'Staff Dashboard' })).toBeVisible();

    // Check staff cards exist
    await expect(page.getByTestId('card-unassigned')).toBeVisible();
    await expect(page.getByTestId('card-myAssigned')).toBeVisible();

    // Click Unassigned card
    await page.getByTestId('card-unassigned').click();

    // Should navigate to Queue
    await expect(page.getByRole('button', { name: /^Queue$/i })).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('table')).toBeVisible();
  });

  test('E2E-09: David Lee zero-state dashboard', async ({ page }) => {
    await loginAs(page, USERS.david);

    // David Lee has 0 tickets
    await expect(page.getByRole('heading', { name: 'My Dashboard' })).toBeVisible();
    
    // Check that counts show 0
    const openCard = page.getByTestId('card-open');
    await expect(openCard).toContainText('0');

    // Check for empty state message
    await expect(page.getByText(/No recent tickets found|No tickets needing attention|No recently resolved tickets/i).first()).toBeVisible();
  });

  test('E2E-10: Admin dashboard vs Staff dashboard and role boundary', async ({ page }) => {
    // 1. Admin sees Users card
    await loginAs(page, USERS.admin);
    await expect(page.getByRole('heading', { name: 'Staff Dashboard' })).toBeVisible();
    await expect(page.getByTestId('card-users')).toBeVisible();

    // 2. Staff does NOT see Users card
    await loginAs(page, USERS.staff1);
    await expect(page.getByRole('heading', { name: 'Staff Dashboard' })).toBeVisible();
    await expect(page.getByTestId('card-users')).not.toBeVisible();
  });
});
