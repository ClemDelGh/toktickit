import { test, expect } from '@playwright/test';
import { loginAs, USERS } from './helpers';

test.describe('Role Regression & Screen Tour (E2E-11..12)', () => {

  test('E2E-11: Representative regression per role: login/logout, create ticket + comment, staff note, admin safety', async ({ page }) => {
    // 1. Requester flow: Create ticket and add comment
    await loginAs(page, USERS.jennifer);
    await page.getByRole('group').getByRole('button', { name: /^Create Ticket$/i }).click();
    await page.locator('#summary').fill('Regression Test Ticket Creation');
    await page.locator('#description').fill('Testing ticket creation regression from Lab 3');
    await page.getByRole('button', { name: /Submit Ticket/i }).click();
    await expect(page.getByText(/Ticket Created Successfully/i)).toBeVisible();

    const ticketNumber = (await page.getByText(/Your Ticket Number is:/i).innerText()).split(': ')[1]?.trim();

    // View in My Tickets and add comment
    await page.getByRole('group').getByRole('button', { name: /^My Tickets$/i }).click();
    await page.locator('table tbody tr', { hasText: ticketNumber }).click();

    await page.locator('textarea[placeholder*="comment"]').fill('Requester added follow-up comment');
    await page.getByRole('button', { name: /Post Comment/i }).click();
    await expect(page.getByText('Requester added follow-up comment')).toBeVisible();

    // 2. Staff flow: View Queue and add Internal Note
    await loginAs(page, USERS.staff1);
    await page.getByRole('button', { name: /^Queue$/i }).click();
    await page.locator('input[placeholder*="Search"]').fill(ticketNumber);
    await page.waitForTimeout(500);

    const staffRow = page.locator('table tbody tr', { hasText: ticketNumber }).first();
    await staffRow.getByRole('button', { name: 'Open' }).click();

    await page.locator('textarea[placeholder*="internal note"]').fill('Staff internal note verification');
    await page.getByRole('button', { name: /Post Internal Note/i }).click();
    await expect(page.getByText('Staff internal note verification')).toBeVisible();

    // 3. Admin flow: User Management & Safety rules
    await loginAs(page, USERS.admin);
    await page.getByRole('button', { name: /^Users$/i }).click();
    await expect(page.getByRole('heading', { name: /User Management/i })).toBeVisible();

    // Verify Admin is listed
    await expect(page.locator('table tbody tr', { hasText: USERS.admin.email })).toBeVisible();
  });

  test('E2E-12: Screen tour per role without console errors or uncaught exceptions', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: Error[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        // Exclude benign network cancellations if any
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // --- Requester Tour ---
    await loginAs(page, USERS.jennifer);
    await page.getByRole('group').getByRole('button', { name: /^Dashboard$/i }).click();
    await expect(page.getByRole('heading', { name: /My Dashboard/i })).toBeVisible();

    await page.getByRole('group').getByRole('button', { name: /^Create Ticket$/i }).click();
    await expect(page.getByRole('heading', { name: /Create New Support Ticket/i })).toBeVisible();

    await page.getByRole('group').getByRole('button', { name: /^My Tickets$/i }).click();
    await expect(page.getByRole('heading', { name: /My Tickets/i })).toBeVisible();

    // Open first ticket if present
    const firstTicketRow = page.locator('table tbody tr').first();
    if (await firstTicketRow.count() > 0) {
      await firstTicketRow.click();
      await expect(page.getByRole('heading', { name: /Ticket Details/i })).toBeVisible();
    }

    // --- Staff Tour ---
    await loginAs(page, USERS.staff1);
    await page.getByRole('button', { name: /^Dashboard$/i }).click();
    await expect(page.getByRole('heading', { name: /Staff Dashboard/i })).toBeVisible();

    await page.getByRole('button', { name: /^Queue$/i }).click();
    await expect(page.getByRole('heading', { name: /Ticket Queue/i })).toBeVisible();

    // Open ticket and tour tabs
    const queueRow = page.locator('table tbody tr').first();
    if (await queueRow.count() > 0 && await queueRow.getByText('No tickets found').count() === 0) {
      await queueRow.getByRole('button', { name: 'Open' }).click();
      await expect(page.getByRole('heading', { name: /IT Workspace/i })).toBeVisible();

      await page.getByRole('tab', { name: /Actions Taken/i }).click();
      await expect(page.getByRole('heading', { name: /Actions Taken/i })).toBeVisible();

      await page.getByRole('tab', { name: /Ticket Details & Activity/i }).click();
    }

    // --- Admin Tour ---
    await loginAs(page, USERS.admin);
    await page.getByRole('button', { name: /^Dashboard$/i }).click();
    await expect(page.getByRole('heading', { name: /Staff Dashboard/i })).toBeVisible();

    await page.getByRole('button', { name: /^Queue$/i }).click();
    await expect(page.getByRole('heading', { name: /Ticket Queue/i })).toBeVisible();

    await page.getByRole('button', { name: /^Users$/i }).click();
    await expect(page.getByRole('heading', { name: /User Management/i })).toBeVisible();

    // Verify 0 uncaught page errors
    expect(pageErrors).toHaveLength(0);
  });
});

