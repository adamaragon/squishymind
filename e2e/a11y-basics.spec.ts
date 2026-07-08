import { test, expect } from '@playwright/test';

test('homepage has h1', async ({ page }) => {
  await page.goto('/');
  const headings = page.locator('h1');
  await expect(headings).toHaveCount(1);
});

test('homepage images have alt text', async ({ page }) => {
  await page.goto('/');
  const images = page.locator('img');
  const count = await images.count();
  for (let i = 0; i < count; i++) {
    const img = images.nth(i);
    const alt = await img.getAttribute('alt');
    expect(alt).toBeDefined();
  }
});

test('homepage has a skip link or nav landmark', async ({ page }) => {
  await page.goto('/');
  const hasSkipLink = (await page.locator('a[href="#main"], a[href="#main-content"]').count()) > 0;
  const hasNav = (await page.locator('nav, [role="navigation"]').count()) > 0;
  expect(hasSkipLink || hasNav).toBeTruthy();
});

test('homepage has an html lang attribute', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('lang');
});

test('focus styles function on buttons', async ({ page }) => {
  await page.goto('/');
  const buttons = page.locator('button, a[href]');
  const count = await buttons.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < Math.min(count, 5); i++) {
    await buttons.nth(i).focus();
    const isFocused = await buttons.nth(i).evaluate((el) => el === document.activeElement);
    if (isFocused) {
      const styles = await buttons.nth(i).evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          boxShadow: style.boxShadow,
        };
      });
      const hasFocusIndicator =
        (styles.outlineStyle !== 'none' && parseFloat(styles.outlineWidth) > 0) ||
        styles.boxShadow !== 'none';
      expect(hasFocusIndicator).toBeTruthy();
      break;
    }
  }
});
