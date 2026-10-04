import { test, expect } from '@playwright/test';

const INVALID_USER = { email: 'jennifer.a@example.com', password: 'wrongpassword' };
const INACTIVE_USER = { email: 'inactive.user@example.com', password: 'password' }; 
const VALID_USER = { email: 'jennifer.a@example.com', defaultPassword: 'password', newPassword: 'NewSecurePassword123!' };

test.describe('Authentication Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/');
  });

  test('should display a safe error message for invalid credentials', async ({ page }) => {
    // 1. Essai avec un mauvais mot de passe
    await page.getByLabel('Email address').fill(INVALID_USER.email);
    await page.getByLabel('Password').fill(INVALID_USER.password);
    await page.click('button[type="submit"]');

    // Vérification du message d'erreur générique
    const errorMessage = page.locator('[role="alert"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Invalid email or password');
  });

  test('should reject inactive users with the same safe error message', async ({ page }) => {
    // 1. Essai avec un compte inactif
    await page.getByLabel('Email address').fill(INACTIVE_USER.email);
    await page.getByLabel('Password').fill(INACTIVE_USER.password);
    await page.click('button[type="submit"]');

    // Vérification du MÊME message d'erreur générique (sécurité)
    const errorMessage = page.locator('[role="alert"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Invalid email or password');
  });

  test('should force password change on first login, allow logout, and login normally afterwards', async ({ page }) => {
    // 1. Connexion initiale
    await page.getByLabel('Email address').fill(VALID_USER.email);
    await page.getByLabel('Password').fill(VALID_USER.defaultPassword);
    await page.click('button[type="submit"]');

    // 2. On attend de voir le formulaire de changement (au lieu de checker l'URL)
    await expect(page.getByLabel('Current Password')).toBeVisible();

    // 3. Test du garde-fou : on essaie de forcer l'accès à une autre page
    await page.goto('http://localhost:5173/tickets');
    // On s'assure qu'on est toujours bloqué sur le changement de mot de passe
    await expect(page.getByLabel('Current Password')).toBeVisible(); 

    // 4. On remplit le formulaire pour débloquer le compte
    await page.getByLabel('Current Password').fill(VALID_USER.defaultPassword);
    await page.getByLabel('New Password', { exact: true }).fill(VALID_USER.newPassword);
    await page.getByLabel('Confirm New Password').fill(VALID_USER.newPassword);
    await page.click('button[type="submit"]');
    
    // 5. On vérifie qu'on est bien entré (présence du bouton Logout)
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")');
    await expect(logoutButton).toBeVisible();

    // 6. Test de déconnexion et reconnexion avec le nouveau mot de passe
    await logoutButton.click();
    await expect(page.getByLabel('Email address')).toBeVisible(); // Retour au login

    await page.getByLabel('Email address').fill(VALID_USER.email);
    await page.getByLabel('Password').fill(VALID_USER.newPassword);
    await page.click('button[type="submit"]');
    await expect(logoutButton).toBeVisible(); // Re-connecté avec succès !
  });
});