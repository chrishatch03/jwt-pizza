import { test, expect } from 'playwright-test-coverage';
import { mockService, login, diner, admin } from './mockService';

test('a diner can update their name', async ({ page }) => {
  await mockService(page);
  await login(page, diner);

  await page.getByRole('link', { name: 'KC' }).click();
  await expect(page.getByRole('main')).toContainText('Kai Chen');

  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('h3')).toContainText('Edit user');

  await page.getByRole('textbox').first().fill('Kai Chenx');
  await page.getByRole('button', { name: 'Update' }).click();
  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });

  await expect(page.getByRole('main')).toContainText('Kai Chenx');
});

test('the edit dialog can be dismissed without changes', async ({ page }) => {
  await mockService(page);
  await login(page, diner);

  await page.getByRole('link', { name: 'KC' }).click();
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('h3')).toContainText('Edit user');

  await page.getByRole('button', { name: 'Update' }).click();
  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });

  await expect(page.getByRole('main')).toContainText('Kai Chen');
});

test('an admin can see the list of users', async ({ page }) => {
  await mockService(page, [admin]);
  await login(page, admin);

  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Kai Chen' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'd@jwt.com' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'diner', exact: true })).toBeVisible();
});

test('an admin can filter the user list by name', async ({ page }) => {
  await mockService(page, [admin]);
  await login(page, admin);

  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page.getByRole('cell', { name: 'Frank Chise' })).toBeVisible();

  await page.getByPlaceholder('Filter users').fill('Kai');
  await page.getByRole('button', { name: 'Filter' }).click();

  await expect(page.getByRole('cell', { name: 'Kai Chen' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Frank Chise' })).not.toBeVisible();
});

test('an admin can delete a user', async ({ page }) => {
  await mockService(page, [admin]);
  await login(page, admin);

  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page.getByRole('cell', { name: 'Frank Chise' })).toBeVisible();

  await page.getByRole('row', { name: 'Frank Chise' }).getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByRole('cell', { name: 'Frank Chise' })).not.toBeVisible();
  await expect(page.getByRole('cell', { name: 'Kai Chen' })).toBeVisible();
});
