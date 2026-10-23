import { test, expect } from '@playwright/test';
import { loginAs, USERS } from './helpers';

test.describe('Actions Taken Flow (E2E-01..02)', () => {

  test('E2E-01: Staff opens Ticket, adds then edits an Action; Requester views it read-only', async ({ page }) => {
    // 1. Staff logs in and opens queue
    await loginAs(page, USERS.staff1);
    await page.getByRole('button', { name: /^Queue$/i }).click();
    await expect(page.locator('table')).toBeVisible();

    // Open first ticket detail
    await page.locator('table tbody tr').first().getByRole('button', { name: 'Open' }).click();
    await expect(page.getByRole('tab', { name: /Actions Taken/i })).toBeVisible();

    // Switch to Actions Taken tab
    await page.getByRole('tab', { name: /Actions Taken/i }).click();

    // Click Record Action
    await page.getByRole('button', { name: /\+ Record Action/i }).click();
    await expect(page.getByText('Record New Action Taken')).toBeVisible();

    // Fill form
    const uniqueDesc = `E2E Diagnostic Check ${Date.now()}`;
    await page.locator('#description').fill(uniqueDesc);
    await page.locator('#result').fill('Network switch port reset and connectivity restored');
    await page.locator('#attachmentNotes').fill('See syslog capture');
    await page.getByRole('button', { name: /Record Action/i }).click();

    // Verify Action was added to list
    await expect(page.getByText(uniqueDesc).first()).toBeVisible();

    // Now edit the Action
    const row = page.locator('tbody tr', { hasText: uniqueDesc });
    await row.getByRole('button', { name: /^Edit$/i }).click();
    await expect(page.getByText(/Edit Action/i)).toBeVisible();

    const updatedResult = 'Updated: verified 1Gbps link speed with 0 packet drops';
    await page.locator('#result').fill(updatedResult);
    await page.getByRole('button', { name: /Save Changes/i }).click();

    await expect(page.getByText(updatedResult).first()).toBeVisible();

    // 2. Requester views actions as read-only
    await loginAs(page, USERS.jennifer);
    await page.getByRole('group').getByRole('button', { name: /^My Tickets$/i }).click();
    await page.locator('table tbody tr').first().click();

    // On Requester detail, actions list is displayed read-only (no "+ Record Action" button)
    await expect(page.getByRole('button', { name: /\+ Record Action/i })).not.toBeVisible();
  });

  test('E2E-02: Invalid Action form, then correction keeps values and saves', async ({ page }) => {
    await loginAs(page, USERS.staff1);
    await page.getByRole('button', { name: /^Queue$/i }).click();
    await page.locator('table tbody tr').first().getByRole('button', { name: 'Open' }).click();

    await page.getByRole('tab', { name: /Actions Taken/i }).click();
    await page.getByRole('button', { name: /\+ Record Action/i }).click();

    // Fill description but leave result empty, check followUpRequired but leave followUpNote empty
    const testDesc = `Invalid Form Test ${Date.now()}`;
    await page.locator('#description').fill(testDesc);
    await page.locator('#followUpRequired').check();

    // Submit invalid form
    await page.getByRole('button', { name: /Record Action/i }).click();

    // Verify validation errors appear
    await expect(page.getByText(/Result is required/i)).toBeVisible();
    await expect(page.getByText(/Follow-up note is required/i)).toBeVisible();

    // Verify entered description is preserved
    await expect(page.locator('#description')).toHaveValue(testDesc);

    // Correct the form
    await page.locator('#result').fill('Valid test result');
    await page.locator('#followUpNote').fill('Follow-up verification tomorrow');
    await page.getByRole('button', { name: /Record Action/i }).click();

    // Verify successfully saved
    await expect(page.getByText(testDesc).first()).toBeVisible();
  });
});
