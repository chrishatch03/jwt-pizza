import { expect } from 'playwright-test-coverage';
import { Page } from '@playwright/test';
import { Role, User } from '../src/service/pizzaService';

export const diner: User = { id: '3', name: 'Kai Chen', email: 'd@jwt.com', password: 'a', roles: [{ role: Role.Diner }] };
export const franchisee: User = { id: '4', name: 'Frank Chise', email: 'f@jwt.com', password: 'f', roles: [{ role: Role.Diner }, { role: Role.Franchisee, objectId: '2' }] };
export const admin: User = { id: '1', name: 'Anna Min', email: 'a@jwt.com', password: 'admin', roles: [{ role: Role.Admin }] };

export const menu = [
  { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
  { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
];

export const franchises = [
  { id: 2, name: 'LotaPizza', admins: [{ id: '4', name: 'Frank Chise', email: 'f@jwt.com' }], stores: [{ id: 4, name: 'Lehi', totalRevenue: 0.05 }, { id: 5, name: 'Springville', totalRevenue: 0.02 }] },
  { id: 3, name: 'PizzaCorp', admins: [], stores: [{ id: 7, name: 'Spanish Fork', totalRevenue: 0 }] },
];

/**
 * Mocks every JWT Pizza Service endpoint the frontend calls, so tests control
 * their own data and need no running backend. Pass the users that are allowed
 * to log in; the first one is used where a test just needs "someone".
 */
export async function mockService(page: Page, users: User[] = [diner]) {
  let loggedInUser: User | undefined;
  const validUsers: Record<string, User> = {};
  users.forEach((u) => (validUsers[u.email as string] = u));

  // register (POST), login (PUT), logout (DELETE)
  await page.route('*/**/api/auth', async (route) => {
    const method = route.request().method();

    if (method === 'DELETE') {
      loggedInUser = undefined;
      await route.fulfill({ json: { message: 'logout successful' } });
      return;
    }

    const body = route.request().postDataJSON();

    if (method === 'POST') {
      loggedInUser = { id: '9', name: body.name, email: body.email, roles: [{ role: Role.Diner }] };
      await route.fulfill({ json: { user: loggedInUser, token: 'abcdef' } });
      return;
    }

    const user = validUsers[body.email];
    if (!user || user.password !== body.password) {
      await route.fulfill({ status: 404, json: { message: 'unknown user' } });
      return;
    }
    loggedInUser = user;
    await route.fulfill({ json: { user: loggedInUser, token: 'abcdef' } });
  });

  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: loggedInUser });
  });

  await page.route('*/**/api/order/menu', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: menu });
  });

  // GET order history, POST a new order
  await page.route(/\/api\/order$/, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          dinerId: 3,
          page: 1,
          orders: [{ id: 1, franchiseId: 2, storeId: 4, date: '2026-01-01T00:00:00.000Z', items: [{ id: 1, menuId: 1, description: 'Veggie', price: 0.0038 }] }],
        },
      });
      return;
    }
    const orderReq = route.request().postDataJSON();
    await route.fulfill({ json: { order: { ...orderReq, id: 23 }, jwt: 'eyJpYXQ' } });
  });

  // list franchises (GET) and create one (POST)
  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    if (route.request().method() === 'POST') {
      const req = route.request().postDataJSON();
      await route.fulfill({ json: { id: 9, name: req.name, admins: req.admins, stores: [] } });
      return;
    }
    await route.fulfill({ json: { franchises, more: false } });
  });

  // a single user's franchises (GET) or closing a franchise (DELETE)
  await page.route(/\/api\/franchise\/\d+$/, async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ json: { message: 'franchise deleted' } });
      return;
    }
    const isFranchisee = loggedInUser?.roles?.some((r) => r.role === Role.Franchisee);
    await route.fulfill({ json: isFranchisee ? [franchises[0]] : [] });
  });

  await page.route(/\/api\/franchise\/\d+\/store$/, async (route) => {
    expect(route.request().method()).toBe('POST');
    const req = route.request().postDataJSON();
    await route.fulfill({ json: { id: 99, franchiseId: 2, name: req.name } });
  });

  await page.route(/\/api\/franchise\/\d+\/store\/\d+$/, async (route) => {
    expect(route.request().method()).toBe('DELETE');
    await route.fulfill({ json: { message: 'store deleted' } });
  });

  // the pizza factory, which the frontend calls directly
  await page.route('*/**/api/order/verify', async (route) => {
    await route.fulfill({ json: { message: 'valid', payload: { vendor: 'hatch07' } } });
  });

  await page.route('*/**/api/docs', async (route) => {
    await route.fulfill({ json: { version: '1.0.0', endpoints: [{ requiresAuth: true, method: 'GET', path: '/api/order', description: 'Get orders', example: 'curl x', response: {} }], config: {} } });
  });

  await page.goto('/');
}

export async function login(page: Page, user: User) {
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill(user.email as string);
  await page.getByRole('textbox', { name: 'Password' }).fill(user.password as string);
  await page.getByRole('button', { name: 'Login' }).click();
}
