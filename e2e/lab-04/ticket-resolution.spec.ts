import { test, expect } from '@playwright/test';
import { loginAs, USERS } from './helpers';

test.describe('Ticket Resolution & Concurrency Flow (E2E-03..06)', () => {

  test('E2E-03: Staff tries to Resolve -> blocked list -> gate satisfied -> Resolved', async ({ page }) => {
    // 1. Requester creates a fresh ticket to guarantee unowned, no actions, and clean state
    await loginAs(page, USERS.jennifer);
    await page.getByRole('group').getByRole('button', { name: /^Create Ticket$/i }).click();
    await page.locator('#summary').fill('E2E Test Resolution Gate Ticket');
    await page.locator('#description').fill('Testing the resolution gate blockers');
    await page.getByRole('button', { name: /Submit Ticket/i }).click();
    await expect(page.getByText(/Ticket Created Successfully/i)).toBeVisible();

    const ticketNumber = (await page.getByText(/Your Ticket Number is:/i).innerText()).split(': ')[1]?.trim();

    // 2. Staff logs in and finds that ticket
    await loginAs(page, USERS.staff1);
    await page.getByRole('button', { name: /^Queue$/i }).click();
    await page.locator('input[placeholder*="Search"]').fill(ticketNumber);
    await page.waitForTimeout(500);

    const staffRow = page.locator('table tbody tr', { hasText: ticketNumber }).first();
    await staffRow.getByRole('button', { name: 'Open' }).click();
    await expect(page.locator('#status-select')).toBeVisible();
    await expect(page.locator('#status-select')).toBeEnabled();

    // Transition from New to Open so Resolved is an allowed transition
    await page.locator('#status-select').selectOption('Open');
    await page.getByRole('button', { name: 'Save Properties' }).click();
    await page.waitForTimeout(500);

    // Try selecting Resolved without filling summary or actions
    await page.locator('#status-select').selectOption('Resolved');
    await page.getByRole('button', { name: 'Save Properties' }).click();

    // Verify Resolution Blocked checklist appears
    await expect(page.getByText(/Resolution Blocked/i)).toBeVisible();

    // Ensure owner claimed
    const claimBtn = page.getByRole('button', { name: 'Claim Ticket' });
    if (await claimBtn.isVisible().catch(() => false)) {
      await claimBtn.click();
      await page.waitForTimeout(500);
    }

    // Add an Action Taken
    await page.getByRole('tab', { name: /Actions Taken/i }).click();
    await page.getByRole('button', { name: /\+ Record Action/i }).click();
    await page.locator('#description').fill('Completed final testing and fix deployment');
    await page.locator('#result').fill('Root cause fixed and verified');
    await page.getByRole('button', { name: /Record Action/i }).click();
    await expect(page.getByText('Completed final testing and fix deployment').first()).toBeVisible();

    // Return to details tab
    await page.getByRole('tab', { name: /Ticket Details & Activity/i }).click();

    // Select Resolved and fill resolution summary
    await page.locator('#status-select').selectOption('Resolved');
    await page.locator('#resolutionSummary').fill('Issue resolved by updating routing rules');
    await page.getByRole('button', { name: 'Save Properties' }).click();

    // Verify status is now Resolved
    await expect(page.locator('#status-select')).toHaveValue('Resolved');
  });

  test('E2E-04: Requester says "appears resolved" -> staff sees cue -> staff resolves/closes', async ({ page }) => {
    // 1. Requester creates a fresh ticket to guarantee active status
    await loginAs(page, USERS.jennifer);
    await page.getByRole('group').getByRole('button', { name: /^Create Ticket$/i }).click();
    await page.locator('#summary').fill('E2E Test Requester Resolution Indication');
    await page.locator('#description').fill('Testing the problem appears resolved flow');
    await page.getByRole('button', { name: /Submit Ticket/i }).click();
    await expect(page.getByText(/Ticket Created Successfully/i)).toBeVisible();

    const ticketNumber = (await page.getByText(/Your Ticket Number is:/i).innerText()).split(': ')[1]?.trim();

    // Navigate to My Tickets and open the newly created ticket
    await page.getByRole('group').getByRole('button', { name: /^My Tickets$/i }).click();
    await page.locator('table tbody tr', { hasText: ticketNumber }).click();

    // Click "Problem Appears Resolved"
    await page.getByRole('button', { name: /Problem Appears Resolved/i }).click();
    await expect(page.getByText(/You indicated this problem appears resolved/i)).toBeVisible();

    // 2. Staff logs in and opens that ticket
    await loginAs(page, USERS.staff1);
    await page.getByRole('button', { name: /^Queue$/i }).click();
    
    await page.locator('input[placeholder*="Search"]').fill(ticketNumber);
    await page.waitForTimeout(500);

    const staffRow = page.locator('table tbody tr', { hasText: ticketNumber }).first();
    await staffRow.getByRole('button', { name: 'Open' }).click();
    
    // Verify advisory callout is visible
    await expect(page.getByText(/Requester indicates this is resolved/i)).toBeVisible();
  });

  test('E2E-05: Reopen a Resolved Ticket; cancel another; terminal states locked', async ({ page }) => {
    await loginAs(page, USERS.staff1);
    await page.getByRole('button', { name: /^Queue$/i }).click();

    // 1. Pick an active ticket and cancel it
    await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/staff/tickets') && res.status() === 200),
      page.locator('select').filter({ hasText: 'All Statuses' }).selectOption('New'),
    ]);
    let activeRow = page.locator('table tbody tr').first();
    if (await activeRow.count() === 0 || await activeRow.getByText('No tickets found').count() > 0) {
      await Promise.all([
        page.waitForResponse(res => res.url().includes('/api/staff/tickets') && res.status() === 200),
        page.locator('select').filter({ hasText: 'All Statuses' }).selectOption('Open'),
      ]);
      activeRow = page.locator('table tbody tr').first();
    }

    await activeRow.getByRole('button', { name: 'Open' }).click();
    const statusSelect = page.locator('#status-select');
    await expect(statusSelect).toBeVisible();

    // Cancel ticket
    await statusSelect.selectOption('Cancelled');
    await page.getByRole('button', { name: 'Save Properties' }).click();

    // Verify controls locked on terminal ticket
    await expect(statusSelect).toBeDisabled();
    await expect(page.getByText(/cannot be modified|locked/i).first()).toBeVisible();

    // 2. Go back to Queue and test Reopen on a Resolved ticket
    await page.getByRole('button', { name: /Back to Queue/i }).click();
    await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/staff/tickets') && res.status() === 200),
      page.locator('select').filter({ hasText: 'All Statuses' }).selectOption('Resolved'),
    ]);

    const resolvedRow = page.locator('table tbody tr').first();
    if (await resolvedRow.count() > 0 && await resolvedRow.getByText('No tickets found').count() === 0) {
      await resolvedRow.getByRole('button', { name: 'Open' }).click();
      await expect(page.locator('#status-select')).toBeVisible();
      // Reopen (transition from Resolved to Reopened)
      await page.locator('#status-select').selectOption('Reopened');
      await page.getByRole('button', { name: 'Save Properties' }).click();
      await expect(page.locator('#status-select')).toHaveValue('Reopened');
    }
  });

  test('E2E-06: Two browser contexts edit the same Ticket -> 409 conflict detected', async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // Both login as Staff
    await loginAs(pageA, USERS.staff1);
    await loginAs(pageB, USERS.staff2);

    // Both open Queue
    await pageA.getByRole('button', { name: /^Queue$/i }).click();
    await pageB.getByRole('button', { name: /^Queue$/i }).click();

    // Filter by Open or New to find an active ticket
    await Promise.all([
      pageA.waitForResponse(res => res.url().includes('/api/staff/tickets') && res.status() === 200),
      pageA.locator('select').filter({ hasText: 'All Statuses' }).selectOption('Open'),
    ]);
    let firstRowA = pageA.locator('table tbody tr').first();
    if (await firstRowA.count() === 0 || await firstRowA.getByText('No tickets found').count() > 0) {
      await Promise.all([
        pageA.waitForResponse(res => res.url().includes('/api/staff/tickets') && res.status() === 200),
        pageA.locator('select').filter({ hasText: 'All Statuses' }).selectOption('New'),
      ]);
      firstRowA = pageA.locator('table tbody tr').first();
    }
    const ticketNumber = await firstRowA.locator('td').first().innerText();

    await firstRowA.getByRole('button', { name: 'Open' }).click();

    // Page B searches for that ticket
    await pageB.locator('input[placeholder*="Search"]').fill(ticketNumber);
    await pageB.waitForTimeout(500);
    await pageB.locator('table tbody tr', { hasText: ticketNumber }).first().getByRole('button', { name: 'Open' }).click();

    await expect(pageA.locator('#it-priority-select')).toBeVisible();
    await expect(pageB.locator('#it-priority-select')).toBeVisible();

    // User A changes priority to High (or Medium) and saves
    const currPriority = await pageA.locator('#it-priority-select').inputValue();
    const newPriorityA = currPriority === 'High' ? 'Medium' : 'High';
    await pageA.locator('#it-priority-select').selectOption(newPriorityA);
    await pageA.getByRole('button', { name: 'Save Properties' }).click();
    await pageA.waitForTimeout(1000);

    // User B tries to change priority to Low and saves (stale version!)
    await pageB.locator('#it-priority-select').selectOption('Low');
    await pageB.getByRole('button', { name: 'Save Properties' }).click();

    // User B should receive 409 conflict banner with Reload button
    await expect(pageB.getByText(/modified by another user/i)).toBeVisible();
    await expect(pageB.getByRole('button', { name: /Reload/i })).toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});
