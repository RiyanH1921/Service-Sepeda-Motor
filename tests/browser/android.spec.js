import { test, expect } from '@playwright/test';

const android = {
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 1,
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
};

test.beforeAll(async ({ request }) => {
  const state = await (await request.get('/api/state')).json();
  if (!state.vehicles.length) await request.post('/api/demo', { data: {} });
});

async function noHorizontalScroll(page) {
  const size = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(size.document, JSON.stringify(size)).toBeLessThanOrEqual(size.viewport + 1);
}

for (const width of [320, 360, 390, 412]) {
  test(`Android ${width}px: navigasi, halaman, dan formulir tetap terbaca`, async ({ browser }) => {
    const context = await browser.newContext({ ...android, viewport: { width, height: 844 }, locale: 'id-ID', timezoneId: 'Asia/Jakarta' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto('http://localhost:3101/#garasi');
      await expect(page.getByRole('heading', { name: 'Garasi Riyan' })).toBeVisible();
      const nav = page.getByRole('navigation', { name: 'Navigasi ponsel' });
      await expect(nav.getByRole('link')).toHaveCount(3);
      for (const link of await nav.getByRole('link').all()) expect((await link.boundingBox()).height).toBeGreaterThanOrEqual(48);
      await noHorizontalScroll(page);
      await expect(page.getByRole('button', { name: 'Catat servis', exact: true })).toBeVisible();
      await expect(page.locator('.garage-hero')).toBeVisible();
      expect((await page.locator('.garage-hero').boundingBox()).height).toBeLessThan(220);
      await page.screenshot({ path: `docs/screenshots/web-android-${width}.png`, fullPage: true });

      await page.locator('.mobile-recent-item').first().scrollIntoViewIfNeeded();
      await page.locator('.mobile-recent-item').first().click();
      await expect(page.getByRole('dialog').getByRole('heading', { name: 'Detail servis' })).toBeVisible();
      await page.getByRole('dialog').getByRole('button', { name: 'Tutup', exact: true }).last().click();
      await expect(page.getByRole('dialog')).toHaveCount(0);

      for (const [link, title] of [['Riwayat', 'Riwayat servis'], ['Pengingat', 'Pengingat servis']]) {
        await nav.getByRole('link', { name: link, exact: true }).click();
        await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
        await noHorizontalScroll(page);
      }

      await page.getByRole('button', { name: 'Buka navigasi', exact: true }).click();
      const drawer = page.locator('.sidebar');
      await expect(drawer).not.toHaveAttribute('inert');
      await expect(page.getByRole('button', { name: 'Tutup navigasi', exact: true })).toBeFocused();
      await drawer.getByRole('link', { name: /^Kendaraan saya/ }).click();
      await expect(page.getByRole('heading', { name: 'Kendaraan saya', exact: true })).toBeVisible();
      await expect(drawer).toHaveAttribute('inert', '');
      await noHorizontalScroll(page);
      await page.getByRole('button', { name: 'Buka pengaturan', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Pengaturan', exact: true })).toBeVisible();
      await noHorizontalScroll(page);

      await nav.getByRole('link', { name: 'Garasi', exact: true }).click();
      await page.getByRole('button', { name: 'Catat servis', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      const viewport = await page.evaluate(() => ({ width: innerWidth, height: visualViewport.height }));
      const bounds = await dialog.boundingBox();
      expect(bounds.width).toBeCloseTo(viewport.width, 0);
      expect(bounds.height).toBeCloseTo(viewport.height, 0);
      await dialog.getByLabel('Bengkel', { exact: true }).fill('Bengkel Android Uji');
      await dialog.getByLabel('Catatan', { exact: true }).fill('Isian tetap ada ketika formulir digulir.');
      await expect(dialog.getByRole('button', { name: 'Simpan servis' })).toBeVisible();
      const save = await dialog.getByRole('button', { name: 'Simpan servis' }).boundingBox();
      expect(save.height).toBeGreaterThanOrEqual(48);
      expect(save.y + save.height).toBeLessThanOrEqual(viewport.height + 1);
      expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy();
      await page.screenshot({ path: `docs/screenshots/web-android-form-${width}.png` });
      await dialog.getByRole('button', { name: 'Batal', exact: true }).click();
      await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
      expect(errors).toEqual([]);
    } finally { await context.close(); }
  });
}

test('Android: formulir mengikuti ruang keyboard yang mengecil', async ({ browser }) => {
  const context = await browser.newContext({ ...android, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto('http://localhost:3101/#garasi');
    await page.getByRole('button', { name: 'Catat servis', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Catatan', { exact: true }).fill('Tetap bisa disimpan saat ruang keyboard berkurang.');
    await page.setViewportSize({ width: 390, height: 430 });
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.keyboardOpen)).toBe('true');
    const footer = dialog.getByRole('button', { name: 'Simpan servis' });
    await expect(footer).toBeVisible();
    const bounds = await footer.boundingBox();
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(431);
    expect(await dialog.getByRole('textbox', { name: 'Catatan', exact: true }).inputValue()).toContain('ruang keyboard');
    expect(await dialog.getByRole('textbox', { name: 'Catatan', exact: true }).evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
    await page.screenshot({ path: 'docs/screenshots/web-android-keyboard.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    await dialog.getByRole('button', { name: 'Batal', exact: true }).click();
    await expect(page.getByRole('navigation', { name: 'Navigasi ponsel' })).toBeVisible();
  } finally { await context.close(); }
});

test('Android landscape: menu dan tombol Simpan tetap terjangkau', async ({ browser }) => {
  const context = await browser.newContext({ ...android, viewport: { width: 844, height: 390 } });
  const page = await context.newPage();
  try {
    await page.goto('http://localhost:3101/#garasi');
    await expect(page.getByRole('navigation', { name: 'Navigasi ponsel' })).toBeVisible();
    await noHorizontalScroll(page);
    await page.getByRole('button', { name: 'Catat servis', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Catatan', { exact: true }).fill('Formulir pada posisi mendatar.');
    const button = dialog.getByRole('button', { name: 'Simpan servis' });
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(391);
    await page.screenshot({ path: 'docs/screenshots/web-android-landscape.png' });
  } finally { await context.close(); }
});

test('Mode Android di desktop memakai viewport ponsel yang dapat dipilih', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Mode Android', exact: true }).click();
  await expect(page).toHaveURL(/mode=android/);
  const frame = page.frameLocator('iframe[title="Pratinjau Android Buku Servis"]');
  await expect(frame.getByRole('navigation', { name: 'Navigasi ponsel' })).toBeVisible();
  for (const [option, width] of [['0', 360], ['1', 390], ['2', 412]]) {
    await page.getByLabel('Ukuran layar').selectOption(option);
    await expect.poll(() => frame.locator('html').evaluate(() => window.innerWidth)).toBe(width);
    expect(await frame.locator('html').evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  await page.screenshot({ path: 'docs/screenshots/web-mode-android.png' });
  await page.getByRole('link', { name: 'Tampilan desktop', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Garasi Riyan' })).toBeVisible();
});
