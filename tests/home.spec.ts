import { expect, test } from '@playwright/test';

for (const path of ['/', '/anything/else']) {
  test(`${path} shows the name centred on black`, async ({ page }) => {
    await page.goto(path);
    const name = page.getByRole('heading', { name: 'Daniele D’Agnelli' });
    await expect(name).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(0, 0, 0)');
    const box = (await name.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(2);
    expect(Math.abs(box.y + box.height / 2 - viewport.height / 2)).toBeLessThan(2);
  });
}
