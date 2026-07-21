import { test, expect } from '@playwright/test';

test('local user happy-path: dashboard -> operations -> start -> submit -> complete', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('BlueTeam-EMU').first()).toBeVisible();

  await page.goto('/operations');
  // Open the first operation in the table
  const firstOp = page.locator('a:has-text("open")').first();
  await firstOp.click();

  await page.getByRole('button', { name: 'Start run' }).click();

  await page.getByRole('radio', { name: 'True positive' }).check();
  await page.locator('textarea').fill('invoice.exe seen');
  await page.getByRole('button', { name: 'Submit step' }).click();
});
