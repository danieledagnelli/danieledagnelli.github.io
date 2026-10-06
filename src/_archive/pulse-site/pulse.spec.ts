import { test, expect, type Page } from '@playwright/test';

const saveKey = 'dagnelli:minigames:v1';
const ids = ['roots', 'curiosity', 'music', 'work', 'pizza', 'family'];
const titles = ['Bari → Milan → Dublin → London.', 'Code. Cells. Endless questions.', 'Italian rap. EDM. Repeat.', 'Big systems. Real people.', 'Yes, pineapple. On purpose.', 'Father of a little queen.'];
const route = async (page: Page) => { for (const city of ['Bari', 'Milan', 'Dublin', 'London']) await page.locator(`[data-city="${city}"]`).click(); };
const circuit = async (page: Page) => {
  for (const [index, turns] of [1, 1, 2, 1, 1, 3, 2, 1, 1].entries())
    for (let turn = 0; turn < turns; turn++) await page.locator(`[data-tile="${index}"]`).click();
};
const memory = async (page: Page) => {
  await page.getByRole('button', { name: 'show the pattern' }).click();
  await expect(page.locator('[data-pad="0"]')).toBeEnabled();
  for (const pad of [0, 2, 1, 3]) await page.locator(`[data-pad="${pad}"]`).click();
};
const anomaly = async (page: Page) => { for (const index of [7, 12, 2]) await page.locator(`[data-reading="${index}"]`).click(); };
const pizza = async (page: Page) => {
  for (const topping of ['tomato', 'mozzarella', 'pineapple']) await page.getByRole('button', { name: topping, exact: true }).click();
  await page.getByRole('button', { name: 'serve it' }).click();
};
const maze = async (page: Page) => {
  await page.locator('.maze-grid').focus();
  for (const key of ['ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown']) await page.keyboard.press(key);
};
const solvers = [route, circuit, memory, anomaly, pizza, maze];

async function seed(page: Page, completed: Record<string, string>, extra = {}) {
  // Seed from the static page so the active game's pagehide save cannot overwrite it.
  await page.goto('/about/');
  await page.evaluate(({ saveKey, completed, extra }) => localStorage.setItem(saveKey, JSON.stringify({ version: 1, completed, elapsedMs: 2000, started: true, ...extra })), { saveKey, completed, extra });
  await page.goto('/');
  await page.getByRole('button', { name: 'continue exploring' }).click();
}

test('solve six different games, resume a run, and discover the secret seventh game', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.screenshot({ path: '/tmp/mini-desktop-intro.png' });
  await page.getByRole('button', { name: 'start exploring' }).click();
  for (let index = 0; index < solvers.length; index++) {
    if (index === 1) await page.screenshot({ path: '/tmp/mini-desktop-circuit.png' });
    await solvers[index](page);
    await expect(page.getByRole('heading', { name: titles[index], exact: true })).toBeFocused();
    await expect(page.locator('#hud-progress')).toHaveText(`0${index + 1} / 06`);
    if (index === 0) {
      await page.reload();
      await page.getByRole('button', { name: 'continue exploring' }).click();
      await expect(page.locator('#game-title')).toHaveText('Close the circuit.');
    } else await page.getByRole('button', { name: index === 5 ? 'finish the trail' : 'next game' }).click();
  }
  await expect(page.locator('#run-summary')).toContainText('6 solved · 0 revealed');
  await expect(page.getByRole('link', { name: 'your turn. say hello' })).toHaveAttribute('href', 'https://www.linkedin.com/in/dagnelli/');
  await expect(page.getByRole('link', { name: 'say hello', exact: false }).last()).toHaveAttribute('href', 'https://www.linkedin.com/in/dagnelli/');
  await expect(page.locator('.trail-progress')).toHaveAttribute('aria-valuenow', '6');
  const finishTime = await page.locator('#elapsed').textContent();
  await page.getByRole('button', { name: 'An unusual signal' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'check the code' }).click();
  await expect(page.locator('#bonus-feedback')).toContainText('1 in place · 0 misplaced');
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: /Code slot 1/ }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /Code slot 3/ }).click();
  await page.getByRole('button', { name: 'check the code' }).click();
  await expect(page.locator('#bonus-reward')).toContainText('distinction');
  await page.getByRole('button', { name: 'back to the trail' }).click();
  await expect(page.locator('#elapsed')).toHaveText(finishTime!);
  await expect(page.locator('#progress-count')).toHaveText('06 / 06 stories · bonus 01 / 01');
  await page.reload();
  await page.getByRole('button', { name: 'view your discoveries' }).click();
  await page.getByRole('button', { name: 'Revisit roots: solved' }).click();
  await expect(page.getByRole('heading', { name: titles[0], exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'finish the trail' }).click();
  await page.getByRole('button', { name: 'start a fresh run' }).click();
  await expect(page.locator('#hud-progress')).toHaveText('00 / 06');
  await expect(page.locator('#bonus-nav')).toBeDisabled();
  await expect(page.locator('#elapsed')).toHaveText('00:00');
  expect(errors).toEqual([]);
});

test('elapsed time pauses for breaks, hidden tabs, and the secret; it persists on reload', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.clock.runFor(3000);
  await expect(page.locator('#elapsed')).toHaveText('00:00');
  await page.getByRole('button', { name: 'start exploring' }).click();
  await page.clock.runFor(2200);
  await expect(page.locator('#elapsed')).toHaveText('00:02');
  await page.getByRole('button', { name: 'pause', exact: true }).click();
  await expect(page.locator('#challenge')).toHaveJSProperty('disabled', true);
  await expect(page.locator('.trace')).toHaveCSS('animation-play-state', 'paused');
  await page.clock.runFor(5000);
  await expect(page.locator('#elapsed')).toHaveText('00:02');
  await page.getByRole('button', { name: 'resume', exact: true }).click();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.runFor(5000);
  await expect(page.locator('#elapsed')).toHaveText('00:02');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.locator('[data-city="Bari"]').click();
  await page.getByRole('button', { name: 'An unusual signal' }).click();
  await page.clock.runFor(5000);
  await expect(page.locator('#elapsed')).toHaveText('00:02');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'An unusual signal' })).toBeFocused();
  await expect(page.locator('.route-slots li').first()).toHaveText('Bari');
  await page.clock.runFor(2100);
  await expect(page.locator('#elapsed')).toHaveText('00:04');
  await page.getByRole('button', { name: 'pause', exact: true }).click();
  const savedTime = await page.locator('#elapsed').textContent();
  await page.reload();
  await expect(page.locator('#elapsed')).toHaveText(savedTime!);
  await page.clock.runFor(3000);
  await expect(page.locator('#elapsed')).toHaveText(savedTime!);
});

test('wrong answers are recoverable and revealing a story is distinguished from solving', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'start exploring' }).click();
  for (const city of ['London', 'Dublin', 'Milan', 'Bari']) await page.locator(`[data-city="${city}"]`).click();
  await expect(page.locator('#game-feedback')).toContainText('A detour');
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'undo last stop' }).click();
  await page.getByRole('button', { name: 'a little hint', exact: true }).click();
  await expect(page.locator('#game-feedback')).toContainText('Start in Bari');
  await route(page);
  await page.getByRole('button', { name: 'next game' }).click();
  for (let i = 1; i < 6; i++) {
    await page.getByRole('button', { name: 'just reveal the story' }).click();
    await expect(page.locator('[data-panel]:visible .found-label')).toHaveText('story revealed');
    await page.getByRole('button', { name: i === 5 ? 'finish the trail' : 'next game' }).click();
  }
  await expect(page.locator('#run-summary')).toContainText('1 solved · 5 revealed');
});

test('pattern playback can pause and retry; reduced motion has a static pattern', async ({ page }) => {
  await seed(page, { roots: 'solved', curiosity: 'solved' });
  await page.getByRole('button', { name: 'show the pattern' }).click();
  await page.getByRole('button', { name: 'pause', exact: true }).click();
  await page.getByRole('button', { name: 'resume', exact: true }).click();
  await expect(page.locator('#game-feedback')).toContainText('Pattern paused');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.trace')).toHaveCSS('animation-name', 'none');
  await page.getByRole('button', { name: 'show the pattern' }).click();
  await expect(page.locator('.memory-reference')).toBeVisible();
  await page.locator('[data-pad="3"]').click();
  await expect(page.locator('#game-feedback')).toContainText('Different beat');
  for (const pad of [0, 2, 1, 3]) await page.locator(`[data-pad="${pad}"]`).click();
  await expect(page.getByRole('heading', { name: titles[2], exact: true })).toBeVisible();
});

test('malformed, stale and blocked storage never break a run', async ({ page }) => {
  await page.goto('/about/');
  await page.evaluate(key => localStorage.setItem(key, '{broken'), saveKey);
  await page.goto('/');
  await expect(page.locator('#hud-progress')).toHaveText('00 / 06');
  await seed(page, { roots: 'solved', curiosity: 'bogus', unknown: 'solved' }, { elapsedMs: -99 });
  await expect(page.locator('#hud-progress')).toHaveText('01 / 06');
  await expect(page.locator('#elapsed')).toHaveText('00:00');
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
    Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
  });
  await page.reload();
  await page.getByRole('button', { name: 'start exploring' }).click();
  await route(page);
  await expect(page.locator('#save-note')).toBeVisible();
  await expect(page.locator('#hud-progress')).toHaveText('01 / 06');
});

test('mobile games fit, pizza responds to touch, and maze walls stop movement', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/');
  await page.screenshot({ path: '/tmp/mini-mobile-intro.png' });
  await page.getByRole('button', { name: 'start exploring' }).tap();
  for (let i = 0; i < 4; i++) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (i === 1) await page.screenshot({ path: '/tmp/mini-mobile-circuit.png' });
    await page.getByRole('button', { name: 'just reveal the story' }).tap();
    await page.getByRole('button', { name: 'next game' }).tap();
  }
  await page.getByRole('button', { name: 'olives', exact: true }).tap();
  await page.getByRole('button', { name: 'serve it' }).tap();
  await expect(page.locator('#game-feedback')).toContainText('Not quite my order');
  await page.getByRole('button', { name: 'olives', exact: true }).tap();
  for (const topping of ['tomato', 'mozzarella', 'pineapple']) await page.getByRole('button', { name: topping, exact: true }).tap();
  await expect(page.locator('[data-art="pineapple"]')).toBeVisible();
  await page.screenshot({ path: '/tmp/mini-mobile-pizza.png' });
  await page.getByRole('button', { name: 'serve it' }).tap();
  await page.getByRole('button', { name: 'next game' }).tap();
  await page.getByRole('button', { name: 'Move down', exact: true }).tap();
  await expect(page.locator('[data-cell="0"]')).toHaveClass(/player/);
  await expect(page.locator('#game-feedback')).toContainText('A wall');
  await page.screenshot({ path: '/tmp/mini-mobile-maze.png' });
  await page.setViewportSize({ width: 320, height: 568 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const direction of ['right', 'down', 'down', 'right', 'right', 'right', 'down', 'down']) await page.getByRole('button', { name: `Move ${direction}`, exact: true }).tap();
  await expect(page.getByRole('heading', { name: titles[5], exact: true })).toBeVisible();
  await context.close();
});

test('no-JavaScript visitors can read the stories, and root and v2 show the same game', async ({ browser, request }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/');
  await page.getByRole('link', { name: 'read my story' }).click();
  for (const title of titles) await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'say hello' })).toHaveAttribute('href', 'https://www.linkedin.com/in/dagnelli/');
  const v2 = await request.get('/v2/');
  expect(v2.status()).toBe(200); expect(await v2.text()).toContain('six small games. one human.');
  expect((await request.get('/rpg')).status()).toBe(404);
  await context.close();
});
