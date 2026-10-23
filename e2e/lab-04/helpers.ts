import { Page, expect } from '@playwright/test';

export const USERS = {
  jennifer: { email: 'jennifer.a@example.com', password: 'password', role: 'Requester' },
  michael: { email: 'michael.b@example.com', password: 'password', role: 'Requester' },
  david: { email: 'david.l@example.com', password: 'password', role: 'Requester' },
  staff1: { email: 'it1@example.com', password: 'password', role: 'ITStaff' },
  staff2: { email: 'it2@example.com', password: 'password', role: 'ITStaff' },
  admin: { email: 'admin@example.com', password: 'password', role: 'Administrator' },
};

export async function loginAs(page: Page, user: { email: string; password?: string }) {
  await page.context().clearCookies();
  await page.goto('http://localhost:5173/');
  
  await page.waitForSelector('#email', { state: 'visible', timeout: 10000 });
  await page.locator('#email').fill(user.email);
  await page.locator('#password').fill(user.password || 'password');
  await page.getByRole('button', { name: /Sign In/i }).click();

  // If mustChangePassword page appears, handle it
  const currentPass = page.locator('#currentPassword');
  if (await currentPass.isVisible({ timeout: 1500 }).catch(() => false)) {
    await currentPass.fill(user.password || 'password');
    await page.locator('#newPassword').fill('NewSecurePassword123!');
    await page.locator('#confirmPassword').fill('NewSecurePassword123!');
    await page.getByRole('button', { name: /Update Password/i }).click();
  }

  // Expect dashboard or main app to be loaded
  await expect(page.getByRole('button', { name: /^Logout$/i })).toBeVisible({ timeout: 10000 });
}

