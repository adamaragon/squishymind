import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/SquishyMind/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('homepage h1 contains squishier', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('squishier');
});

test('Claim Founder Access CTA links to /signup', async ({ page }) => {
  await page.goto('/');
  const cta = page.getByRole('link', { name: /Claim Founder Access/ });
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute('href', '/signup');
});

test('feature cards are visible', async ({ page }) => {
  await page.goto('/');
  const featuresSection = page.locator('#features');
  await expect(featuresSection).toBeVisible();
  const cards = featuresSection.locator('.glass');
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(3);
});

test('Recently shipped section loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Recently shipped')).toBeVisible();
});
