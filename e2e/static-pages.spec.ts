import { test, expect } from '@playwright/test';

test('/pricing — tiers visible', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page).toHaveTitle(/Pricing/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText(/Free/).first()).toBeVisible();
});

test('/changelog — entries visible', async ({ page }) => {
  await page.goto('/changelog');
  await expect(page).toHaveTitle(/Changelog/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText(/v\d+\.\d+/).first()).toBeVisible();
});

test('/founder-access — heading visible', async ({ page }) => {
  await page.goto('/founder-access');
  await expect(page).toHaveTitle(/Founder Access/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('/features — feature list visible', async ({ page }) => {
  await page.goto('/features');
  await expect(page).toHaveTitle(/Features/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('/templates — template cards visible', async ({ page }) => {
  await page.goto('/templates');
  await expect(page).toHaveTitle(/Templates/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText(/campaign/i).first()).toBeVisible();
});

test('/blog — posts visible', async ({ page }) => {
  await page.goto('/blog');
  await expect(page).toHaveTitle(/Blog/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('/use-cases — sections visible', async ({ page }) => {
  await page.goto('/use-cases');
  await expect(page).toHaveTitle(/Use Cases/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('/compare — comparisons visible', async ({ page }) => {
  await page.goto('/compare');
  await expect(page).toHaveTitle(/SquishyMind vs/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
