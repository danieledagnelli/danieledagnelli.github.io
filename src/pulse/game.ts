import { mountMiniGame, mountSecret, type MiniGame } from './minigames';

const SAVE_KEY = 'dagnelli:minigames:v1';
type Result = 'solved' | 'revealed';
interface Progress { version: 1; completed: Record<string, Result>; elapsedMs: number; started: boolean; bonusUnlocked: boolean; bonusSolved: boolean }
const fresh = (): Progress => ({ version: 1, completed: {}, elapsedMs: 0, started: false, bonusUnlocked: false, bonusSolved: false });
const timeText = (ms: number) => `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

export function startPulseGame() {
  const get = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-signal]'));
  const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-panel]'));
  const dots = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-revisit]'));
  const ids = cards.map(card => card.dataset.signal!);
  const dialog = get<HTMLDialogElement>('#bonus-dialog');
  const fieldset = get<HTMLFieldSetElement>('#challenge');
  const pauseButton = get<HTMLButtonElement>('#pause-pulse');
  let progress = fresh();
  let current = 0;
  let paused = false;
  let activeGame: MiniGame | undefined;
  let bonusGame: MiniGame | undefined;
  let anchor: number | null = null;
  let ticker: ReturnType<typeof setInterval> | undefined;
  const count = () => Object.keys(progress.completed).length;

  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (saved?.version === 1) {
      for (const id of ids) if (saved.completed?.[id] === 'solved' || saved.completed?.[id] === 'revealed') progress.completed[id] = saved.completed[id];
      progress.elapsedMs = Number.isFinite(saved.elapsedMs) && saved.elapsedMs >= 0 ? Math.min(saved.elapsedMs, Number.MAX_SAFE_INTEGER) : 0;
      progress.started = saved.started === true || count() > 0;
      progress.bonusSolved = saved.bonusSolved === true;
      progress.bonusUnlocked = saved.bonusUnlocked === true || progress.bonusSolved;
    }
  } catch { /* An unavailable or malformed save must not block the games. */ }

  function settleTime() {
    if (anchor !== null) { const now = performance.now(); progress.elapsedMs += Math.max(0, now - anchor); anchor = now; }
  }
  function save() {
    settleTime();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(progress)); }
    catch { get('#save-note').hidden = false; }
  }
  function renderClock() {
    get('#elapsed').textContent = timeText(progress.elapsedMs);
    get('#elapsed').setAttribute('aria-label', `Elapsed time: ${Math.floor(progress.elapsedMs / 60000)} minutes ${Math.floor(progress.elapsedMs / 1000) % 60} seconds`);
  }
  function syncTimer() {
    settleTime();
    const running = progress.started && count() < cards.length && !paused && !document.hidden && !dialog.open && document.body.dataset.state !== 'intro';
    if (running && anchor === null) {
      anchor = performance.now();
      ticker = setInterval(() => { settleTime(); renderClock(); }, 1000);
    } else if (!running) {
      anchor = null;
      if (ticker !== undefined) clearInterval(ticker);
      ticker = undefined;
    }
    fieldset.disabled = paused || document.hidden;
    get<HTMLFieldSetElement>('#bonus-challenge').disabled = document.hidden;
    get<HTMLButtonElement>('#secret-trigger').disabled = paused;
    get<HTMLButtonElement>('#bonus-nav').disabled = !progress.bonusUnlocked || paused;
    get('#paused-note').hidden = !paused;
    document.documentElement.classList.toggle('paused', paused);
    document.documentElement.classList.toggle('suspended', document.hidden);
    renderClock();
  }
  function renderProgress() {
    const total = String(count()).padStart(2, '0');
    get('#hud-progress').textContent = `${total} / 06`;
    get('#progress-count').textContent = `${total} / 06 stories · ${progress.bonusSolved ? 'bonus 01 / 01' : progress.bonusUnlocked ? 'bonus 00 / 01' : 'secret ?'}`;
    get('#progress-fill').style.width = `${count() / cards.length * 100}%`;
    get('.trail-progress').setAttribute('aria-valuenow', String(count()));
    dots.forEach((dot, index) => {
      const result = progress.completed[ids[index]];
      dot.disabled = !result;
      dot.dataset.found = String(!!result);
      dot.dataset.result = result || '';
      dot.setAttribute('aria-label', result ? `Revisit ${cards[index].dataset.label}: ${result}` : `${cards[index].dataset.label} — undiscovered`);
      if (index === current && ['playing', 'discovery'].includes(document.body.dataset.state!)) dot.setAttribute('aria-current', 'step');
      else dot.removeAttribute('aria-current');
    });
    const bonusNav = get<HTMLButtonElement>('#bonus-nav');
    bonusNav.disabled = !progress.bonusUnlocked || paused;
    bonusNav.dataset.found = String(progress.bonusSolved);
    bonusNav.setAttribute('aria-label', progress.bonusUnlocked ? 'Open secret game' : 'Secret game undiscovered');
    bonusNav.querySelector('span')!.textContent = progress.bonusSolved ? '✦' : '?';
    get('#secret-trigger').dataset.found = String(progress.bonusUnlocked);
    const solved = Object.values(progress.completed).filter(result => result === 'solved').length;
    get('#run-summary').textContent = `${timeText(progress.elapsedMs)} elapsed · ${solved} solved · ${count() - solved} revealed`;
    get('#secret-clue').textContent = progress.bonusSolved ? 'And you found the seventh game. Nicely spotted.' : progress.bonusUnlocked ? 'One code is still waiting to be cracked. Look for the ? below.' : 'Something is still hiding in the heartbeat. Look near its peak.';
  }
  function show(panel: HTMLElement, state: string) {
    activeGame?.destroy(); activeGame = undefined;
    panels.forEach(candidate => { candidate.hidden = candidate !== panel; });
    document.body.dataset.state = state;
    syncTimer();
    renderProgress();
    panel.querySelector<HTMLElement>('h2[tabindex]')?.focus({ preventScroll: true });
  }
  const report = (message: string) => { get('#game-feedback').textContent = message; };
  function reveal(index: number) {
    current = index;
    const card = cards[index];
    card.querySelector('.found-label')!.textContent = progress.completed[ids[index]] === 'solved' ? 'game solved' : 'story revealed';
    card.querySelector('[data-next]')!.textContent = count() === cards.length ? 'finish the trail →' : 'next game →';
    show(card, 'discovery');
  }
  function finish(result: Result) {
    if (document.body.dataset.state !== 'playing' || paused || document.hidden) return;
    progress.completed[ids[current]] = result;
    syncTimer(); save(); reveal(current);
  }
  function begin() {
    progress.started = true;
    current = cards.findIndex(card => !progress.completed[card.dataset.signal!]);
    if (current === -1) { show(get('#complete'), 'complete'); save(); return; }
    get('#game-chapter').textContent = `game ${String(current + 1).padStart(2, '0')} / 06 · ${cards[current].dataset.label}`;
    get('#game-title').textContent = cards[current].dataset.gameTitle!;
    get('#game-instruction').textContent = cards[current].dataset.instruction!;
    report('');
    show(get('#playing'), 'playing');
    activeGame = mountMiniGame(current, get('#mini-game'), () => finish('solved'), report);
    save();
  }

  get('#start').addEventListener('click', begin);
  document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', begin));
  dots.forEach((dot, index) => dot.addEventListener('click', () => { if (progress.completed[ids[index]]) reveal(index); }));
  get('#hint').addEventListener('click', () => { if (activeGame) report(activeGame.hint()); });
  get('#skip').addEventListener('click', () => finish('revealed'));
  get('#restart').addEventListener('click', () => {
    settleTime(); anchor = null; if (ticker !== undefined) clearInterval(ticker); ticker = undefined;
    progress = fresh(); paused = false;
    pauseButton.setAttribute('aria-pressed', 'false'); get('#pulse-label').textContent = 'pause';
    save(); begin();
  });
  pauseButton.addEventListener('click', () => {
    paused = !paused;
    if (paused) activeGame?.suspend();
    pauseButton.setAttribute('aria-pressed', String(paused));
    get('#pulse-label').textContent = paused ? 'resume' : 'pause';
    syncTimer(); save();
  });

  function openBonus() {
    if (paused || dialog.open) return;
    progress.bonusUnlocked = true;
    activeGame?.suspend();
    get('#bonus-play').hidden = progress.bonusSolved;
    get('#bonus-reward').hidden = !progress.bonusSolved;
    get('#bonus-title').textContent = progress.bonusSolved ? 'You found the hidden chapter.' : 'Crack the code.';
    get('#bonus-feedback').textContent = '';
    if (!progress.bonusSolved) {
      bonusGame = mountSecret(get('#bonus-game'), () => {
        progress.bonusSolved = true;
        bonusGame?.destroy(); bonusGame = undefined;
        get('#bonus-play').hidden = true; get('#bonus-reward').hidden = false;
        get('#bonus-title').textContent = 'You found the hidden chapter.';
        get('#bonus-title').focus({ preventScroll: true });
        save(); renderProgress();
      }, message => { get('#bonus-feedback').textContent = message; });
    }
    dialog.showModal(); syncTimer(); save(); renderProgress();
    get('#bonus-title').focus({ preventScroll: true });
  }
  get('#secret-trigger').addEventListener('click', openBonus);
  get('#bonus-nav').addEventListener('click', openBonus);
  get('#bonus-hint').addEventListener('click', () => { if (bonusGame) get('#bonus-feedback').textContent = bonusGame.hint(); });
  get('#close-bonus').addEventListener('click', () => dialog.close());
  get('#return-to-trail').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { bonusGame?.destroy(); bonusGame = undefined; syncTimer(); save(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { activeGame?.suspend(); bonusGame?.suspend(); } syncTimer(); save(); });
  window.addEventListener('pagehide', () => { settleTime(); save(); anchor = null; if (ticker !== undefined) clearInterval(ticker); ticker = undefined; activeGame?.suspend(); });
  window.addEventListener('pageshow', () => syncTimer());

  if (progress.started) {
    get('#start').textContent = count() === cards.length ? 'view your discoveries ↗' : 'continue exploring ↗';
    get('#intro-copy').textContent = `${count()} of 6 stories discovered. ${timeText(progress.elapsedMs)} on the trail. Welcome back.`;
  }
  get('#start').hidden = false; pauseButton.hidden = false;
  get('#secret-trigger').hidden = false; get('.discoveries').hidden = false; get('.run-hud').hidden = false;
  syncTimer(); renderProgress();
}
