import { test, expect } from '@playwright/test';

const STAFF_USER = { 
  email: 'staff@example.com', 
  defaultPassword: 'password', 
  newPassword: 'NewSecurePassword123!' 
};

test.describe('IT Staff Ticket Flow', () => {
  test('should login as staff, view ticket queue, check details, and logout', async ({ page }) => {
    // 1. Connexion en tant que Staff
    await page.goto('http://localhost:5173/');
    await page.getByLabel('Email address').fill(STAFF_USER.email);
    await page.getByLabel('Password').fill(STAFF_USER.defaultPassword);
    await page.click('button[type="submit"]');

    // 2. Gestion du changement de mot de passe obligatoire (Nouveau)
    await expect(page.getByLabel('Current Password')).toBeVisible();
    await page.getByLabel('Current Password').fill(STAFF_USER.defaultPassword);
    await page.getByLabel('New Password', { exact: true }).fill(STAFF_USER.newPassword);
    await page.getByLabel('Confirm New Password').fill(STAFF_USER.newPassword);
    await page.click('button[type="submit"]');

    // 3. Vérification de l'accès à la Queue
    await expect(page.locator('text=Ticket Queue').first()).toBeVisible();

   // 4. Ouvrir le premier ticket de la liste via le bouton "Open"
    await page.locator('table tbody tr').first().getByRole('button', { name: 'Open' }).click();

    // 5. Vérifier la présence d'un élément exclusif au Staff (les notes internes)
    await expect(page.locator('text=Internal Notes')).toBeVisible();

    // 6. Déconnexion
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")');
    await logoutButton.click();
    
    // 7. Retour à l'écran de connexion validé
    await expect(page.getByLabel('Email address')).toBeVisible();
  });
});