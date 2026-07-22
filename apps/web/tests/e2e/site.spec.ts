import { test, expect } from '@playwright/test';

const BASE = '/BlueTeam-EMU';

test('app shell loads at root', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await expect(page.locator('body')).toContainText('BlueTeam-EMU');
  // SPA boot loads LeftRail nav
  await expect(page.getByText('Operations').first()).toBeVisible({ timeout: 10000 });
});

test('operations page shows seeded ops', async ({ page }) => {
  await page.goto(`${BASE}/operations`, { waitUntil: 'networkidle' });
  await expect(page.getByText('phishing-credential-theft').first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('kerberoasting').first()).toBeVisible({ timeout: 5000 });
});

test('tracks page loads', async ({ page }) => {
  await page.goto(`${BASE}/tracks`, { waitUntil: 'networkidle' });
  await expect(page.getByText('SOC Analyst Foundations').first()).toBeVisible({ timeout: 10000 });
});

test('start run and submit step', async ({ page }) => {
  await page.goto(`${BASE}/operations/phishing-credential-theft`, { waitUntil: 'networkidle' });
  // Wait for SPA boot and content hydration
  await expect(page.getByText('phishing-credential-theft').first()).toBeVisible({ timeout: 15000 });

  // Start the run
  await page.getByRole('button', { name: 'Start run' }).click();
  await page.waitForTimeout(1000);

  // Submit first step verdict
  await page.getByRole('radio', { name: 'True positive' }).check();
  await page.locator('textarea').fill('invoice.exe seen with macro');
  await page.getByRole('button', { name: 'Submit step' }).click();
  await page.waitForTimeout(1000);

  // Step 2 should now be active
  await expect(page.getByText('macro dropped a loader').first()).toBeVisible({ timeout: 5000 });
});

test('reports page loads', async ({ page }) => {
  await page.goto(`${BASE}/reports`, { waitUntil: 'networkidle' });
  await expect(page.getByText('Reports').first()).toBeVisible({ timeout: 10000 });
});
