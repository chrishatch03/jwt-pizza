import { test, expect } from 'playwright-test-coverage';
import { mockService, login, diner, franchisee, admin } from './mockService';

test('home page', async ({ page }) => {
  await mockService(page);
  expect(await page.title()).toBe('JWT Pizza');
  await expect(page.getByRole('heading', { name: 'The web' })).toBeVisible();
});

test('static pages render', async ({ page }) => {
  await mockService(page);

  await page.getByRole('link', { name: 'About' }).click();
  await expect(page.getByText('The secret sauce')).toBeVisible();

  await page.getByRole('link', { name: 'History' }).click();
  await expect(page.getByText('Mama Rucci, my my')).toBeVisible();
});

test('unknown route shows the not found page', async ({ page }) => {
  await mockService(page);
  await page.goto('/nowhere');
  await expect(page.getByText('It looks like we have dropped a pizza on the floor')).toBeVisible();
});

test('login shows the user initials', async ({ page }) => {
  await mockService(page);
  await login(page, diner);
  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();
});

test('login with a bad password is rejected', async ({ page }) => {
  await mockService(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('wrong');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('link', { name: 'KC' })).not.toBeVisible();
});

test('register a new user', async ({ page }) => {
  await mockService(page);

  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('Pat Smith');
  await page.getByRole('textbox', { name: 'Email address' }).fill('pat@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('pw');
  await page.getByRole('button', { name: 'Register' }).click();

  await expect(page.getByRole('link', { name: 'PS' })).toBeVisible();
});

test('logout returns to the home page', async ({ page }) => {
  await mockService(page);
  await login(page, diner);
  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();

  await page.getByRole('link', { name: 'Logout' }).click();
  await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
});

test('diner dashboard shows the user and their orders', async ({ page }) => {
  await mockService(page);
  await login(page, diner);

  await page.getByRole('link', { name: 'KC' }).click();
  await expect(page.getByText('Your pizza kitchen')).toBeVisible();
  await expect(page.getByText('Kai Chen')).toBeVisible();
  await expect(page.getByText('d@jwt.com')).toBeVisible();
});

test('a diner is invited to buy a franchise', async ({ page }) => {
  await mockService(page);
  await login(page, diner);

  await page.getByRole('link', { name: 'Franchise' }).first().click();
  await expect(page.getByText('So you want a piece of the pie?')).toBeVisible();
});

test('purchase with login and verify the pizza jwt', async ({ page }) => {
  await mockService(page);

  await page.getByRole('button', { name: 'Order now' }).click();
  await expect(page.locator('h2')).toContainText('Awesome is a click away');

  await page.getByRole('combobox').selectOption('4');
  await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
  await page.getByRole('link', { name: 'Image Description Pepperoni' }).click();
  await expect(page.locator('form')).toContainText('Selected pizzas: 2');
  await page.getByRole('button', { name: 'Checkout' }).click();

  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('main')).toContainText('Send me those 2 pizzas right now!');
  await expect(page.locator('tbody')).toContainText('Veggie');
  await expect(page.locator('tbody')).toContainText('Pepperoni');
  await expect(page.locator('tfoot')).toContainText('0.008 ₿');

  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByText('Here is your JWT Pizza!')).toBeVisible();

  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.getByText('valid', { exact: true })).toBeVisible();
});

test('a franchisee can create and close a store', async ({ page }) => {
  await mockService(page, [franchisee]);
  await login(page, franchisee);

  await page.getByRole('link', { name: 'Franchise' }).first().click();
  await expect(page.getByText('LotaPizza')).toBeVisible();
  await expect(page.getByText('Lehi')).toBeVisible();

  await page.getByRole('button', { name: 'Create store' }).click();
  await page.getByRole('textbox', { name: 'store name' }).fill('Orem');
  await page.getByRole('button', { name: 'Create' }).click();

  await page.getByRole('row', { name: 'Lehi' }).getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText('Sorry to see you go')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText('LotaPizza')).toBeVisible();
});

test('an admin can create and close a franchise', async ({ page }) => {
  await mockService(page, [admin]);
  await login(page, admin);

  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page.getByText("Mama Ricci's kitchen")).toBeVisible();
  await expect(page.getByText('LotaPizza')).toBeVisible();

  await page.getByRole('button', { name: 'Add Franchise' }).click();
  await page.getByRole('textbox', { name: 'franchise name' }).fill('PieHouse');
  await page.getByRole('textbox', { name: 'franchisee admin email' }).fill('f@jwt.com');
  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByText("Mama Ricci's kitchen")).toBeVisible();
  await page.getByRole('row', { name: 'PizzaCorp' }).getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText('Sorry to see you go')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText("Mama Ricci's kitchen")).toBeVisible();
});

test('docs page lists endpoints', async ({ page }) => {
  await mockService(page);
  await page.goto('/docs');
  await expect(page.getByText('JWT Pizza API')).toBeVisible();
});
