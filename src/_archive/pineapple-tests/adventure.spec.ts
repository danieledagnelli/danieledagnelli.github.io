import { test, expect, type Page } from '@playwright/test';

const saveKey = 'operation-pineapple:v1';
async function visit(page: Page, room: string) {
  await page.getByRole('button', { name: 'Open places menu' }).click();
  await page.locator(`[data-visit="${room}"]`).click();
  await expect(page.locator('#game-dialog')).toBeVisible();
}
async function startPuzzle(page: Page, room: string) { await visit(page, room); await page.locator('#room-main').click(); }
async function exitReward(page: Page) { await page.locator('#reward-next').click(); }
async function progress(page: Page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{}'), saveKey); }

test('complete all puzzles, discover the family ending, and resume without audio', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Music: Off' })).toHaveAttribute('aria-pressed', 'false');
  await startPuzzle(page, 'workshop');
  await page.locator('#test-circuit').click();
  await expect(page.locator('#feedback')).toContainText('Still a gap');
  await page.locator('#hint').click();
  await expect(page.locator('#feedback')).toContainText('tile 4');
  for (const [tile, turns] of [[3, 3], [0, 1], [1, 1], [2, 2], [5, 2]]) {
    for (let i = 0; i < turns; i++) await page.locator('.circuit button').nth(tile).click();
  }
  await page.locator('#test-circuit').click();
  await expect(page.locator('.reward-stamp')).toContainText('DOUGH COLLECTED');
  await exitReward(page);
  await startPuzzle(page, 'listening');
  await page.locator('[data-track="hiphop"]').click();
  await page.getByRole('button', { name: 'Beat 2', exact: true }).click();
  await expect(page.locator('#feedback')).toContainText('Start again');
  for (const beat of [1, 3, 2, 4]) await page.getByRole('button', { name: `Beat ${beat}`, exact: true }).click();
  await expect(page.locator('.reward-stamp')).toContainText('MOZZARELLA COLLECTED');
  await exitReward(page);
  await startPuzzle(page, 'pizzeria');
  for (const topping of ['Olives', 'Tomato', 'Mozzarella']) await page.locator(`[data-topping="${topping}"]`).click();
  await page.locator('#check-pizza').click();
  await expect(page.locator('#feedback')).toContainText('stickler for order');
  await page.locator('#reset-pizza').click();
  for (const topping of ['Tomato', 'Mozzarella', 'Pineapple']) await page.locator(`[data-topping="${topping}"]`).click();
  await page.locator('#check-pizza').click();
  await expect(page.locator('.reward-stamp')).toContainText('PINEAPPLE COLLECTED');
  await exitReward(page);
  await page.locator('#room-main').click();
  await expect(page.locator('#serve')).toBeDisabled();
  for (const item of ['dough', 'mozzarella', 'pineapple']) await page.locator(`[data-place="${item}"]`).click();
  await page.locator('#serve').click();
  await expect(page.locator('#dialog-title')).toHaveText('The best seat in the house.');
  await expect(page.locator('#dialog-content')).toContainText('father of a little queen');
  expect((await progress(page)).finished).toBe(true);
  await page.reload();
  await expect(page.locator('#continue-game')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Music: Off' })).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#continue-game').click();
  await expect(page.locator('#progress-text')).toHaveText('3 OF 3 COLLECTED');
  await startPuzzle(page, 'workshop');
  await expect(page.locator('.reward-stamp')).toContainText('ALREADY IN YOUR BAG');
  expect((await progress(page)).ingredients).toHaveLength(3);
  expect(errors).toEqual([]);
});

test('alternate order, skip paths, career notes, and new game', async ({ page }) => {
  await page.goto('/');
  await startPuzzle(page, 'rooftop');
  await expect(page.locator('#dialog-title')).toHaveText('Almost dinner time.');
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  for (const room of ['pizzeria', 'listening', 'workshop']) {
    await startPuzzle(page, room);
    await page.locator('#skip-puzzle').click();
    await page.locator('#reward-stay').click();
  }
  for (const note of ['bari', 'journey', 'work', 'toolbox']) {
    await page.getByRole('button', { name: 'Open places menu' }).click();
    await page.locator(`[data-note="${note}"]`).click();
    await page.locator('#keep-exploring').click();
  }
  await page.locator('#journal-button').click();
  await expect(page.locator('#dialog-content')).toContainText('Dublin');
  await expect(page.locator('#dialog-content')).toContainText('$18M');
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.locator('#new-game').click();
  await page.locator('#cancel-new').click();
  expect((await progress(page)).ingredients).toHaveLength(3);
  await page.locator('#new-game').click();
  await page.locator('#confirm-new').click();
  await expect(page.locator('#progress-text')).toHaveText('0 OF 3 COLLECTED');
  expect((await progress(page)).discoveries).toEqual(['hello']);
});

test('walking respects walls, click navigation enters rooms, and dialogs pause movement', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('#world'); await canvas.focus();
  const coords = () => page.locator('#coordinates').textContent();
  await page.keyboard.down('ArrowUp');
  let previous = '', stable = 0;
  await expect.poll(async () => {
    const current = (await coords())!;
    stable = current === previous && Number(current.split(':')[1]) < 267 ? stable + 1 : 0;
    previous = current; return stable;
  }, { intervals: [100], timeout: 8000 }).toBeGreaterThanOrEqual(3);
  await page.keyboard.up('ArrowUp');
  const blocked = (await coords())!; expect(Number(blocked.split(':')[1])).toBeGreaterThan(253);
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(350); await page.keyboard.up('ArrowUp');
  const stillOutside = (await coords())!;
  expect(Number(stillOutside.split(':')[0])).toBe(226);
  expect(Number(stillOutside.split(':')[1])).toBeGreaterThanOrEqual(259);
  await page.keyboard.press('e'); await expect(page.locator('#dialog-title')).toHaveText('The science workshop');
  const stopped = await coords(); await page.keyboard.press('ArrowDown'); expect(await coords()).toBe(stopped);
  await page.locator('#room-wander').click();
  await canvas.focus(); await page.keyboard.press('Escape');
  await expect(page.locator('#dialog-title')).toHaveText('A little intermission.');
  await page.keyboard.press('Escape'); await expect(page.locator('#game-dialog')).not.toBeVisible();
  await expect(canvas).toBeFocused();
  // Exercise real pointer-to-path navigation through the map, not a state shortcut.
  await page.getByRole('button', { name: 'Open places menu' }).click();
  await page.locator('[data-visit="neighbourhood"]').click();
  const box = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: box.width * 760 / 960, y: box.height * 155 / 640 } });
  await expect(page.locator('#dialog-title')).toHaveText('Good frequencies', { timeout: 12_000 });
});

test('audio is opt-in, changes track, mutes, handles visibility, and never starts on reload', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.AudioContext;
    const observation = { contexts: [] as AudioContext[], gains: [] as GainNode[] };
    (window as any).__audio = observation;
    window.AudioContext = class extends original {
      constructor(...args: ConstructorParameters<typeof AudioContext>) { super(...args); observation.contexts.push(this); }
      createGain() { const gain = super.createGain(); observation.gains.push(gain); return gain; }
    };
  });
  await page.goto('/');
  expect(await page.evaluate(() => (window as any).__audio.contexts.length)).toBe(0);
  await startPuzzle(page, 'listening'); await page.locator('[data-track="hiphop"]').click();
  await page.getByRole('button', { name: 'Beat 1', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__audio.contexts.length)).toBe(0);
  await page.keyboard.press('Escape');
  await page.locator('#sound-toggle').click();
  await expect(page.locator('#sound-toggle')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => (window as any).__audio.gains[0].gain.value)).toBeGreaterThan(0.1);
  await page.locator('#volume').fill('0');
  await visit(page, 'workshop');
  await expect.poll(() => page.evaluate(() => (window as any).__audio.gains[0].gain.value)).toBeLessThan(0.001);
  await page.keyboard.press('Escape');
  await page.locator('#volume').fill('50');
  await expect.poll(() => page.evaluate(() => (window as any).__audio.gains[0].gain.value)).toBeGreaterThan(0.2);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(() => page.evaluate(() => (window as any).__audio.gains[0].gain.value)).toBeLessThan(0.001);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(() => page.evaluate(() => (window as any).__audio.gains[0].gain.value)).toBeGreaterThan(0.2);
  await page.locator('#sound-toggle').click();
  await expect.poll(() => page.evaluate(() => (window as any).__audio.gains[0].gain.value)).toBeLessThan(0.001);
  await page.reload();
  expect(await page.evaluate(() => (window as any).__audio.contexts.length)).toBe(0);
  await expect(page.locator('#sound-toggle')).toHaveAttribute('aria-pressed', 'false');
});

test('blocked storage does not prevent play', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
    Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
  });
  await page.goto('/');
  await startPuzzle(page, 'pizzeria'); await page.locator('#skip-puzzle').click();
  await expect(page.locator('#progress-text')).toHaveText('1 OF 3 COLLECTED');
  await expect(page.locator('#save-status')).toHaveText('THIS VISIT ONLY');
});

test('ecosystem responds to input and stops when closed', async ({ page }) => {
  await page.goto('/'); await visit(page, 'workshop');
  await page.locator('[data-room-action="ecosystem"]').click();
  await expect(page.locator('.life-grid [aria-pressed=true]')).toHaveCount(3);
  await page.locator('#life-step').click();
  await expect(page.locator('#feedback')).toContainText('Generation 1');
  await expect(page.locator('.life-grid [aria-pressed=true]')).toHaveCount(3);
  await page.locator('#life-run').click();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.waitForTimeout(800);
  await page.locator('#journal-button').click();
  await expect(page.locator('#dialog-content')).toContainText('Computers. Biology.');
});

test('corrupted saves reset safely and inconsistent completion cannot unlock dinner', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(key => localStorage.setItem(key, '{broken json'), saveKey);
  await page.reload();
  await expect(page.locator('#progress-text')).toHaveText('0 OF 3 COLLECTED');
  await expect(page.locator('#game-dialog')).not.toBeVisible();
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ version: 1, ingredients: ['dough', 'dough', 'unknown'], discoveries: ['science', 'unknown'], finished: true })), saveKey);
  await page.reload(); await page.locator('#continue-game').click();
  await expect(page.locator('#progress-text')).toHaveText('1 OF 3 COLLECTED');
  await startPuzzle(page, 'rooftop');
  await expect(page.locator('#dialog-title')).toHaveText('Almost dinner time.');
  await page.goto('/#story');
  await expect(page.locator('#game-dialog')).not.toBeVisible();
});

test('mobile touch controls, readable dialogs, and reduced motion', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const page = await context.newPage(); await page.goto('http://127.0.0.1:4321/');
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await expect(page.locator('.touch-controls')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const before = await page.locator('#coordinates').textContent();
  const control = page.locator('[data-direction="right"]');
  await control.scrollIntoViewIfNeeded();
  const controlBox = (await control.boundingBox())!;
  const touch = await context.newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: controlBox.x + controlBox.width / 2, y: controlBox.y + controlBox.height / 2 }] });
  await page.waitForTimeout(300);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(await page.locator('#coordinates').textContent()).not.toBe(before);
  await page.waitForTimeout(100);
  const released = await page.locator('#coordinates').textContent();
  await page.waitForTimeout(150);
  expect(await page.locator('#coordinates').textContent()).toBe(released);
  await startPuzzle(page, 'pizzeria');
  const box = (await page.locator('#game-dialog').boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.width).toBeLessThanOrEqual(390);
  await page.locator('#skip-puzzle').tap();
  await expect(page.locator('.reward-stamp')).toContainText('PINEAPPLE COLLECTED');
  await page.screenshot({ path: '/tmp/pineapple-mobile-puzzle.png' });
  expect(errors).toEqual([]);
  await context.close();
});

test('full biography remains readable without JavaScript and old themes are retired', async ({ browser, request }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage(); await page.goto('http://127.0.0.1:4321/');
  await page.getByRole('link', { name: 'Read my story' }).click();
  await expect(page.locator('#story')).toContainText('father of a little queen');
  await expect(page.locator('#story')).toContainText('pineapple pizza');
  await expect(page.locator('.career-section')).toContainText('C3 AI');
  expect((await request.get('/rpg')).status()).toBe(404);
  expect((await request.get('/portfolio')).status()).toBe(404);
  await context.close();
});
