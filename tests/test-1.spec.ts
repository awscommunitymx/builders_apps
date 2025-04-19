import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('test@app.awscommunity.mx');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('Test1234!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('textbox', { name: 'Enter short ID' }).click();
  await page.getByRole('textbox', { name: 'Enter short ID' }).fill('abc123');
  await page.getByText('User ID: user1').click();
  await page.getByText('User ID: user1').click({
    button: 'right',
  });
  await page.getByText('Short ID: abc123').click();
  await expect(page.getByRole('listitem')).toContainText('Short ID: abc123');
  await expect(page.getByRole('listitem')).toContainText('User ID: user1');
});
