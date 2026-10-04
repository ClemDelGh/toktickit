import { test, expect } from '@playwright/test';

const ADMIN_USER = { 
  email: 'admin@example.com', 
  defaultPassword: 'password', 
  newPassword: 'NewSecurePassword123!' 
};

test.describe('Administrator User Management Flow', () => {
  test('should login as admin, view user management, and logout', async ({ page }) => {
    // 1. Connexion en tant qu'Admin
    await page.goto('http://localhost:5173/');
    await page.getByLabel('Email address').fill(ADMIN_USER.email);
    await page.getByLabel('Password').fill(ADMIN_USER.defaultPassword);
    await page.click('button[type="submit"]');

    // 2. Gestion du changement de mot de passe obligatoire (Nouveau)
    await expect(page.getByLabel('Current Password')).toBeVisible();
    await page.getByLabel('Current Password').fill(ADMIN_USER.defaultPassword);
    await page.getByLabel('New Password', { exact: true }).fill(ADMIN_USER.newPassword);
    await page.getByLabel('Confirm New Password').fill(ADMIN_USER.newPassword);
    await page.click('button[type="submit"]');

    // 3. Vérification de l'accès à la page de gestion des utilisateurs
    await expect(page.locator('text=User Management').first()).toBeVisible();

    // 4. Vérifier qu'on peut voir la liste et le bouton pour ajouter un utilisateur
    const addUserButton = page.locator('button', { hasText: /Add User|Create User/i }).first();
    await expect(addUserButton).toBeVisible();

    // 5. Déconnexion
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")');
    await logoutButton.click();
    
    // 6. Retour à l'écran de connexion validé
    await expect(page.getByLabel('Email address')).toBeVisible();
  });
});