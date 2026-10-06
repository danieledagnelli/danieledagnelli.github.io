import { expect, test } from '@playwright/test';

for (const path of ['/', '/anything/else']) {
  test(`${path} shows bidi in a full-viewport frame`, async ({ page }) => {
    await page.goto(path);
    const frame = page.locator('iframe');
    await expect(frame).toHaveAttribute('src', 'https://bidi.unplatform.dev/');
    const box = await frame.boundingBox();
    const viewport = page.viewportSize();
    expect(box).toEqual({ x: 0, y: 0, width: viewport!.width, height: viewport!.height });
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
  });
}
