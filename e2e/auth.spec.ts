import { test, expect } from '@playwright/test';

test('/signup page loads with form visible', async ({ page }) => {
  await page.goto('/signup');
  await expect(page.getByRole('heading', { name: /Glad you're here/i })).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /Sign up/ })).toBeVisible();
});

test('/login page loads with form visible', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /Log in/ })).toBeVisible();
});

test('/signup form inputs have correct types', async ({ page }) => {
  await page.goto('/signup');
  await expect(page.locator('input[type="email"]')).toHaveCount(1);
  await expect(page.locator('input[type="password"]')).toHaveCount(1);
});

test('/login form inputs have correct types', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('input[type="email"]')).toHaveCount(1);
  await expect(page.locator('input[type="password"]')).toHaveCount(1);
});

test('/signup empty submit shows validation', async ({ page }) => {
  await page.goto('/signup');
  await page.getByRole('button', { name: /Sign up/ }).click();
  const emailInput = page.locator('input[type="email"]');
  await expect(emailInput).toHaveJSProperty('validity.valid', false);
});

test('/login empty submit shows validation', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /Log in/ }).click();
  const emailInput = page.locator('input[type="email"]');
  await expect(emailInput).toHaveJSProperty('validity.valid', false);
});
