import { CAREER_STORIES, freshProgress, ingredients, readProgress, roomNames, saveProgress, stories, storyById, type Ingredient, type Room } from './content';
import { Synth, type Track } from './audio';
import { buildings, canStand, findPath, hotspots, spawn, WorldRenderer, type Hotspot, type Point } from './world';

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const escape = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
const button = (id: string, label: string, primary = false) => `<button type="button" id="${id}" class="${primary ? 'primary' : 'secondary'}-button">${label}</button>`;

export function startGame() {
  const canvas = $<HTMLCanvasElement>('#world');
  const dialog = $<HTMLDialogElement>('#game-dialog');
  const content = $('#dialog-content');
  const synth = new Synth();
  let renderer: WorldRenderer;
  try { renderer = new WorldRenderer(canvas); }
  catch { $('#game-fallback').hidden = false; return; }
  let progress = readProgress();
  let room: Room = 'neighbourhood';
  let player = { ...spawn };
  let path: Point[] = [];
  let destination: Hotspot | undefined;
  let nearest: Hotspot | undefined;
  let inView = true;
  let priorFocus: HTMLElement | null = null;
  let dialogCleanup: (() => void) | undefined;
  let lastTime = 0;
  let lastNearest = '';
  let lastCoordinates = '';
  let audioTrack: Track = 'edm';
  let frameId = 0;
  const keys = new Set<string>();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bind = (selector: string, fn: () => void) => $(selector).addEventListener('click', fn);
  const announce = (message: string) => { $('#announcement').textContent = message; };
  const feedback = (message: string) => { $('#feedback').textContent = message; };

  function persist() {
    const saved = saveProgress(progress);
    $('#save-status').textContent = saved ? 'PROGRESS SAVED HERE' : 'THIS VISIT ONLY';
  }
  function updateProgress() {
    for (const item of ingredients) {
      const collected = progress.ingredients.includes(item.id);
      const row = $(`[data-ingredient="${item.id}"]`);
      row.classList.toggle('collected', collected);
      row.querySelector('.item-check')!.textContent = collected ? '✓' : `0${ingredients.indexOf(item) + 1}`;
      row.querySelector('.item-check')!.setAttribute('aria-label', collected ? 'Collected' : 'Not collected');
    }
    $('#progress-text').textContent = `${progress.ingredients.length} OF 3 COLLECTED`;
    $('#progress-fill').style.width = `${progress.ingredients.length / 3 * 100}%`;
    $('.progress-track').setAttribute('aria-valuenow', String(progress.ingredients.length));
    $('#journal-count').textContent = String(progress.discoveries.length).padStart(2, '0');
    $('#quest-title').innerHTML = progress.finished ? 'Good pizza.<br />Better company.' : 'A pizza fit<br />for a queen.';
    $('#objective').textContent = progress.finished ? 'Dinner is served. Stay a little longer—there are still stories to discover.' : progress.ingredients.length === 3 ? 'Everything’s in the bag. Head to the rooftop. The queen has excellent taste.' : 'Three ingredients. One rooftop dinner. My little queen is waiting.';
    $('#game-status').textContent = progress.finished ? 'QUEST COMPLETE. CURIOSITY CONTINUES.' : progress.ingredients.length === 3 ? 'NEXT STOP: THE ROOFTOP.' : 'NO RUSH. LOOK AROUND.';
  }
  function discover(id: string) {
    if (!progress.discoveries.includes(id)) {
      progress.discoveries.push(id); persist(); updateProgress();
      announce(`Field note discovered: ${storyById(id).title}`);
    }
  }
  function clearMovement() { keys.clear(); path = []; destination = undefined; }
  function open(category: string, title: string, html: string) {
    clearMovement();
    dialogCleanup?.(); dialogCleanup = undefined;
    if (!dialog.open) priorFocus = document.activeElement instanceof HTMLElement ? document.activeElement : canvas;
    $('#dialog-category').textContent = category;
    $('#dialog-title').textContent = title;
    content.innerHTML = html;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    $('#close-dialog').focus();
  }
  function close() { dialog.close(); }
  dialog.addEventListener('close', () => {
    dialogCleanup?.(); dialogCleanup = undefined; clearMovement();
    if (priorFocus?.isConnected) priorFocus.focus({ preventScroll: true });
    else canvas.focus({ preventScroll: true });
  });
  dialog.addEventListener('cancel', () => clearMovement());
  bind('#close-dialog', close);
  function showStory(id: string) {
    const story = storyById(id); discover(id);
    open(story.category, story.title, `<p class="dialog-lead">${escape(story.text)}</p><p class="journal-summary">Added to your field notes. ${progress.discoveries.length} of ${stories.length} discoveries.</p><div class="dialog-actions">${button('keep-exploring', 'Keep exploring →', true)}${button('open-notes', 'Open field notes')}</div>`);
    bind('#keep-exploring', close); bind('#open-notes', showJournal);
  }
  function showJournal() {
    open('A PERSON, PIECE BY PIECE', 'My field notes.', `<p class="journal-summary">${progress.discoveries.length} / ${stories.length} DISCOVERIES · ${progress.finished ? 'DINNER SERVED' : 'ADVENTURE IN PROGRESS'}</p>${stories.filter(story => progress.discoveries.includes(story.id)).map(story => `<article class="story-entry"><span class="eyebrow">${story.category}</span><h3>${escape(story.title)}</h3><p>${escape(story.text)}</p></article>`).join('')}${progress.discoveries.length < stories.length ? '<p>More notes are hiding in the neighbourhood. Look for the little question marks, or explore the objects in each room.</p>' : '<p>You found every note. Thanks for getting to know the person behind the pixels.</p>'}<div class="dialog-actions">${button('back-to-world', 'Back to the adventure', true)}<a class="secondary-button" href="#story" id="journal-read">Read the full story ↓</a></div>`);
    bind('#back-to-world', close); bind('#journal-read', close);
  }
  function showPlaces() {
    open('THE NEIGHBOURHOOD', 'Pick a little detour.', `<p>Walk there yourself, click a building, or jump straight in here. Every route tells the same story.</p><div class="place-list">${buildings.map(b => `<button type="button" data-visit="${b.room}">${roomNames[b.room]} <span>${b.room === 'workshop' ? 'DOUGH' : b.room === 'listening' ? 'MOZZARELLA' : b.room === 'pizzeria' ? 'PINEAPPLE' : 'THE FINALE'} ↗</span></button>`).join('')}<button type="button" data-visit="neighbourhood">The neighbourhood <span>EXPLORE ↗</span></button></div><h3 style="margin-top:24px;font-size:15px">Objects with stories</h3><div class="room-actions">${CAREER_STORIES.map(id => `<button type="button" data-note="${id}">${storyById(id).title} ↗</button>`).join('')}</div>`);
    content.querySelectorAll<HTMLButtonElement>('[data-visit]').forEach(el => el.addEventListener('click', () => { close(); enter(el.dataset.visit as Room); }));
    content.querySelectorAll<HTMLButtonElement>('[data-note]').forEach(el => el.addEventListener('click', () => showStory(el.dataset.note!)));
  }
  function enter(next: Room) {
    const previous = room;
    room = next; clearMovement();
    player = next === 'neighbourhood' ? { ...(buildings.find(b => b.room === previous)?.door || spawn) } : { x: 480, y: 480 };
    $('#room-name').textContent = roomNames[room];
    $('#map-label').textContent = room === 'neighbourhood' ? 'THE NEIGHBOURHOOD' : room === 'listening' ? 'THE LISTENING ROOM' : room.toUpperCase();
    synth.setTrack(room === 'listening' ? audioTrack : room === 'rooftop' ? 'rooftop' : 'arcade');
    announce(`Entered ${roomNames[room]}.`);
    canvas.focus({ preventScroll: true });
    if (next !== 'neighbourhood') showRoomIntro();
  }
  function showRoomIntro() {
    const descriptions: Record<string, string> = {
      workshop: 'The greenhouse is offline. The computer is having an existential crisis. Connect the power circuit and the lab’s extremely generous dough dispenser is yours.',
      listening: 'The mozzarella is in the mini-fridge. Obviously. The DJ will hand it over once you find the four-beat pattern. No musical talent required.',
      pizzeria: 'Welcome to Pizzeria Controversia. We respect tradition. We also have a pineapple. Help the topping machine learn the house special.',
      rooftop: 'A little table above the city. A little queen with a big appetite. This is what all the running around was for.',
    };
    const main = hotspots[room][0];
    open('YOU FOUND A NEW CORNER', roomNames[room], `<p class="dialog-lead">${descriptions[room]}</p><div class="dialog-actions">${button('room-main', main.label, true)}${button('room-wander', 'Look around first')}</div><div class="room-actions">${hotspots[room].filter(spot => ['ecosystem', 'story'].includes(spot.kind)).map(spot => `<button type="button" data-room-action="${spot.id}">${spot.label} ↗</button>`).join('')}</div>`);
    bind('#room-main', () => activate(main)); bind('#room-wander', close);
    content.querySelectorAll<HTMLButtonElement>('[data-room-action]').forEach(el => el.addEventListener('click', () => activate(hotspots[room].find(spot => spot.id === el.dataset.roomAction)!)));
  }
  function reward(item: Ingredient) {
    const id = item === 'dough' ? 'science' : item === 'mozzarella' ? 'music' : 'pizza';
    const already = progress.ingredients.includes(item);
    if (!already) progress.ingredients.push(item);
    discover(id); persist(); updateProgress(); synth.effect(84);
    const story = storyById(id);
    open('A LITTLE MORE ABOUT ME', story.title, `<span class="reward-stamp">✓ ${item.toUpperCase()} ${already ? 'ALREADY IN YOUR BAG' : 'COLLECTED'}</span><p class="dialog-lead">${escape(story.text)}</p><p>${progress.ingredients.length === 3 ? 'That’s everything. The rooftop table is waiting.' : `${3 - progress.ingredients.length} more ${progress.ingredients.length === 2 ? 'ingredient' : 'ingredients'} to find. Take the scenic route.`}</p><div class="dialog-actions">${button('reward-next', progress.ingredients.length === 3 ? 'Go to the rooftop →' : 'Back to the neighbourhood →', true)}${button('reward-stay', 'Explore this room')}</div>`);
    bind('#reward-next', () => { close(); enter(progress.ingredients.length === 3 ? 'rooftop' : 'neighbourhood'); });
    bind('#reward-stay', close);
    announce(`${item} collected. ${progress.ingredients.length} of 3 ingredients.`);
  }
  function puzzleTools(item: Ingredient, hint: string) {
    bind('#hint', () => feedback(hint));
    bind('#skip-puzzle', () => reward(item));
  }
  const toolsMarkup = '<div class="puzzle-tools"><button id="hint" class="small-button" type="button">A little hint?</button><button id="skip-puzzle" class="small-button" type="button">Skip & collect →</button></div>';
  function circuitPuzzle() {
    if (progress.ingredients.includes('dough')) { reward('dough'); return; }
    const rotations = [0, 0, 0, 0, 0, 2, 0, 0, 0];
    const types = ['corner', 'straight', 'corner', 'corner', 'straight', 'corner', 'corner', 'straight', 'corner'];
    const directions = ['north', 'east', 'south', 'west'];
    const ports = (i: number) => (types[i] === 'straight' ? [0, 2] : [0, 1]).map(dir => (dir + rotations[i]) % 4);
    open('SCIENCE CLUB / A SMALL REPAIR', 'A bright idea.', '<p>Power comes in from the <strong>left of the middle row</strong>. Get it to the <strong>right of the middle row</strong>. Click a tile to rotate its wire.</p><div class="circuit-labels"><span>↓ POWER IN</span><span>GREENHOUSE ↓</span></div><div class="circuit" aria-label="Nine rotatable circuit tiles"></div><div class="dialog-actions">' + button('test-circuit', 'Test the circuit ⚡', true) + '</div><p id="feedback" class="feedback" role="status">Give the electrons somewhere to go.</p>' + toolsMarkup);
    const grid = $('.circuit');
    function drawTile(tile: HTMLButtonElement, i: number) {
      const ends = ports(i), coords = [[30, 0], [60, 30], [30, 60], [0, 30]];
      tile.setAttribute('aria-label', `Circuit tile ${i + 1}: ${ends.map(dir => directions[dir]).join(' and ')}`);
      tile.innerHTML = `<svg viewBox="0 0 60 60" aria-hidden="true" width="100%" height="100%"><path d="${ends.map(dir => `M30 30L${coords[dir][0]} ${coords[dir][1]}`).join('')}" fill="none" stroke="currentColor" stroke-width="7"/><rect x="25" y="25" width="10" height="10" fill="#f8d76b"/></svg>`;
    }
    for (let i = 0; i < 9; i++) {
      const tile = document.createElement('button'); tile.type = 'button'; drawTile(tile, i);
      tile.addEventListener('click', () => { rotations[i] = (rotations[i] + 1) % 4; drawTile(tile, i); synth.effect(62 + i); }); grid.append(tile);
    }
    bind('#test-circuit', () => {
      const visited = new Set<number>(), queue = ports(3).includes(3) ? [3] : [];
      while (queue.length) {
        const i = queue.shift()!; if (visited.has(i)) continue; visited.add(i);
        if (i === 5 && ports(i).includes(1)) { reward('dough'); return; }
        for (const dir of ports(i)) {
          const x = i % 3 + [0, 1, 0, -1][dir], y = Math.floor(i / 3) + [-1, 0, 1, 0][dir];
          const next = y * 3 + x;
          if (x >= 0 && x < 3 && y >= 0 && y < 3 && ports(next).includes((dir + 2) % 4)) queue.push(next);
        }
      }
      feedback('Still a gap in the circuit. Follow each wire from the left edge, then try again.');
    });
    puzzleTools('dough', 'Try going over the top: tile 4 connects west–north, tile 1 south–east, tile 2 west–east, tile 3 west–south, and tile 6 north–east.');
  }
  function beatPuzzle() {
    if (progress.ingredients.includes('mozzarella')) { reward('mozzarella'); return; }
    const target = [1, 3, 2, 4]; let count = 0;
    open('GOOD FREQUENCIES / SOUND OPTIONAL', 'Find your rhythm.', `<p>Match the four-beat pattern below. Tap the numbered pads in order, at your own pace. Your ears can take the day off.</p><div class="track-options"><button type="button" data-track="edm" aria-pressed="${audioTrack === 'edm'}">EDM SYNTH</button><button type="button" data-track="hiphop" aria-pressed="${audioTrack === 'hiphop'}">HIP-HOP SYNTH</button></div><p style="font:9px var(--mono)">Music changes only if you’ve turned it on.</p><div class="beat-display" aria-label="Target pattern: 1, 3, 2, 4">${target.map(n => `<span>${n}</span>`).join('')}</div><div class="beat-pads">${[1, 2, 3, 4].map((n, i) => `<button type="button" data-pad="${n}" style="--pad:${['#f8d76b', '#bd9cfc', '#b9e784', '#eea08b'][i]}" aria-label="Beat ${n}">${n}</button>`).join('')}</div><p id="feedback" class="feedback" role="status">0 / 4 beats matched. No timer. No pressure.</p>${toolsMarkup}`);
    content.querySelectorAll<HTMLButtonElement>('[data-pad]').forEach(el => el.addEventListener('click', () => {
      const n = Number(el.dataset.pad); synth.effect(60 + n * 3);
      if (n !== target[count]) { count = 0; feedback('A remix! Start again with beat 1.'); }
      else { count++; if (count === target.length) { reward('mozzarella'); return; } feedback(`${count} / 4 beats matched. Keep going.`); }
      content.querySelectorAll('.beat-display>span').forEach((chip, i) => chip.classList.toggle('playing', i < count));
    }));
    content.querySelectorAll<HTMLButtonElement>('[data-track]').forEach(el => el.addEventListener('click', () => {
      audioTrack = el.dataset.track as Track; synth.setTrack(audioTrack);
      content.querySelectorAll<HTMLButtonElement>('[data-track]').forEach(track => track.setAttribute('aria-pressed', String(track === el)));
    }));
    puzzleTools('mozzarella', 'The whole pattern is 1 → 3 → 2 → 4. Tap each numbered pad once, in that order.');
  }
  function pizzaPuzzle() {
    if (progress.ingredients.includes('pineapple')) { reward('pineapple'); return; }
    let selected: string[] = [];
    open('PIZZERIA CONTROVERSIA / HOUSE SPECIAL', 'Tradition has left the chat.', `<p>The topping machine needs a little direction. Add the three toppings in the recipe’s order. One of these ingredients may start an argument.</p><div class="recipe-card">THE HOUSE RECIPE<br /><strong>1. Tomato → 2. Mozzarella → 3. Pineapple</strong></div><div class="topping-grid">${['Tomato', 'Pineapple', 'Olives', 'Mozzarella'].map(name => `<button type="button" data-topping="${name}" aria-pressed="false">${name}</button>`).join('')}</div><div class="pizza-preview" aria-label="Selected toppings"><span>YOUR PIZZA →</span><span id="topping-order">Waiting for greatness.</span></div><div class="dialog-actions">${button('check-pizza', 'Send the order →', true)}${button('reset-pizza', 'Start over')}</div><p id="feedback" class="feedback" role="status">The pineapple is not a trick answer.</p>${toolsMarkup}`);
    const redraw = () => { $('#topping-order').textContent = selected.length ? selected.join(' → ') : 'Waiting for greatness.'; content.querySelectorAll<HTMLButtonElement>('[data-topping]').forEach(el => el.setAttribute('aria-pressed', String(selected.includes(el.dataset.topping!)))); };
    content.querySelectorAll<HTMLButtonElement>('[data-topping]').forEach(el => el.addEventListener('click', () => {
      const name = el.dataset.topping!;
      if (selected.length >= 3) { feedback('Three toppings are on the order. Send it, or start over.'); return; }
      if (selected.includes(name)) { feedback('Already on the pizza. Pick the next topping.'); return; }
      selected.push(name); synth.effect(69 + selected.length * 2); redraw();
    }));
    bind('#reset-pizza', () => { selected = []; redraw(); feedback('A clean slate. A fresh pizza.'); });
    bind('#check-pizza', () => {
      if (selected.join(',') === 'Tomato,Mozzarella,Pineapple') reward('pineapple');
      else feedback('The machine is a stickler for order. Start over, then add tomato, mozzarella, and pineapple.');
    });
    puzzleTools('pineapple', 'Tomato first. Mozzarella second. Pineapple last. Leave the olives for another adventure.');
  }
  function ecosystem() {
    discover('science'); let generation = 0; let cells = Array.from({ length: 64 }, (_, i) => [26, 27, 28].includes(i));
    let timer: ReturnType<typeof setInterval> | undefined;
    open('A TINY EXPERIMENT', 'Life from simple rules.', '<p>A playful nod to my love of biology and computers: a tiny cellular automaton. This is a mathematical toy, not a biological model. Tap squares to plant cells, then advance a generation.</p><div class="life-grid" aria-label="Eight by eight cellular automaton"></div><div class="dialog-actions">' + button('life-step', 'Next generation', true) + button('life-run', 'Run simulation') + button('life-reset', 'Reset') + '</div><p class="feedback" id="feedback" role="status">Generation 0 · A living cell survives with 2–3 neighbours. An empty cell is born with 3.</p>');
    const grid = $('.life-grid');
    function draw() { grid.querySelectorAll('button').forEach((el, i) => el.setAttribute('aria-pressed', String(cells[i]))); feedback(`Generation ${generation} · ${cells.filter(Boolean).length} living cells. Edges do not wrap.`); }
    for (let i = 0; i < 64; i++) {
      const cell = document.createElement('button'); cell.type = 'button'; cell.setAttribute('aria-label', `Cell row ${Math.floor(i / 8) + 1}, column ${i % 8 + 1}`); cell.addEventListener('click', () => { cells[i] = !cells[i]; draw(); }); grid.append(cell);
    }
    const step = () => {
      cells = cells.map((alive, i) => {
        let count = 0; const x = i % 8, y = Math.floor(i / 8);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && x + dx >= 0 && x + dx < 8 && y + dy >= 0 && y + dy < 8 && cells[(y + dy) * 8 + x + dx]) count++;
        return alive ? count === 2 || count === 3 : count === 3;
      }); generation++; draw();
    };
    bind('#life-step', step); bind('#life-run', () => { if (timer) { clearInterval(timer); timer = undefined; } else timer = setInterval(step, 700); $('#life-run').textContent = timer ? 'Pause simulation' : 'Run simulation'; });
    bind('#life-reset', () => { clearInterval(timer); timer = undefined; $('#life-run').textContent = 'Run simulation'; cells = Array.from({ length: 64 }, (_, i) => [26, 27, 28].includes(i)); generation = 0; draw(); });
    dialogCleanup = () => clearInterval(timer); draw();
  }
  function dinner() {
    if (progress.finished) { ending(); return; }
    if (progress.ingredients.length < 3) {
      open('THE TABLE IS RESERVED', 'Almost dinner time.', `<p>The queen has inspected the bag. We’re still missing ${ingredients.filter(item => !progress.ingredients.includes(item.id)).map(item => item.name.toLowerCase()).join(', ')}.</p><p>Visit the workshop, listening room, and pizzeria. Each has a little challenge and an ingredient to share.</p><div class="dialog-actions">${button('dinner-places', 'Find the ingredients →', true)}${button('dinner-wait', 'Enjoy the view')}</div>`);
      bind('#dinner-places', showPlaces); bind('#dinner-wait', close); return;
    }
    const placed = new Set<string>();
    open('THE FINALE / A TABLE FOR TWO', 'Dinner is a team effort.', `<p>All the ingredients, all the little detours. Put your finds on the table, then serve the most controversial pizza in the neighbourhood.</p><div class="room-actions">${ingredients.map(item => `<button type="button" data-place="${item.id}">Place ${item.name.toLowerCase()} →</button>`).join('')}</div><div class="dialog-actions"><button type="button" id="serve" class="primary-button" disabled>Serve dinner ♡</button></div><p class="feedback" id="feedback" role="status">0 / 3 ingredients on the table.</p>`);
    content.querySelectorAll<HTMLButtonElement>('[data-place]').forEach(el => el.addEventListener('click', () => {
      placed.add(el.dataset.place!); el.disabled = true; el.textContent = `✓ ${el.dataset.place} is on the table`; synth.effect(76 + placed.size);
      feedback(`${placed.size} / 3 ingredients on the table.`); $<HTMLButtonElement>('#serve').disabled = placed.size !== 3;
    }));
    bind('#serve', () => { progress.finished = true; discover('family'); persist(); updateProgress(); ending(); });
  }
  function ending() {
    open('QUEST COMPLETE / THE IMPORTANT BIT', 'The best seat in the house.', `<div class="ending-art" aria-hidden="true">♛ + ◒ = ♡</div><p class="dialog-lead">${escape(storyById('family').text)}</p><p>You’ve met the science nerd, the music lover, the pineapple defender, and the dad. Thanks for spending a little time in my world.</p><div class="dialog-actions"><a class="primary-button" href="mailto:daniele@dagnelli.net">Say ciao ↗</a>${button('ending-explore', 'Keep exploring')}</div><div class="dialog-actions">${button('ending-notes', 'My field notes')}<a class="text-link" href="https://github.com/danieledagnelli">GitHub ↗</a><a class="text-link" href="https://linkedin.com/in/dagnelli">LinkedIn ↗</a></div>`);
    bind('#ending-explore', close); bind('#ending-notes', showJournal);
    announce('Quest complete. Dinner is served with your little queen.');
  }
  function activate(spot: Hotspot) {
    if (spot.kind === 'room') { enter(spot.target as Room); return; }
    if (spot.kind === 'exit') { enter('neighbourhood'); return; }
    if (spot.kind === 'story') { showStory(spot.target!); return; }
    if (spot.kind === 'ecosystem') { ecosystem(); return; }
    if (spot.kind === 'dinner') { dinner(); return; }
    if (spot.target === 'dough') circuitPuzzle();
    else if (spot.target === 'mozzarella') beatPuzzle();
    else pizzaPuzzle();
  }
  function interact() { if (dialog.open) return; if (nearest) activate(nearest); else showPlaces(); }
  function showHelp(paused = false) {
    open(paused ? 'TAKE YOUR TIME' : 'PLAYER ONE / QUICK START', paused ? 'A little intermission.' : 'Welcome to my world.', '<p>You’re Daniele, on a very important dinner mission. Collect three ingredients from three corners of the neighbourhood, then head to the rooftop.</p><div class="controls-list"><div><kbd>WASD</kbd><span>Or arrow keys to walk. Click the world first.</span></div><div><kbd>E / ↵</kbd><span>Interact with a nearby object or door.</span></div><div><kbd>J</kbd><span>Open your field notes.</span></div><div><kbd>ESC</kbd><span>Pause, or close a conversation.</span></div></div><p>Click a building to walk there, or use Places to jump in. On mobile, use the directional pad and A button. Every puzzle has a hint and skip. There are no lives to lose.</p><p>Music is optional and starts muted. Turn it on with the music button whenever you like.</p><div class="dialog-actions">' + button('help-play', paused ? 'Resume adventure →' : 'Let’s wander →', true) + button('help-places', 'Explore places') + '</div>');
    bind('#help-play', () => { priorFocus = canvas; close(); }); bind('#help-places', showPlaces);
  }

  bind('#journal-button', showJournal); bind('#places-button', showPlaces); bind('#help-button', () => showHelp());
  bind('#pause-button', () => showHelp(true)); bind('#interact', interact); bind('#touch-interact', interact);
  bind('#new-game', () => {
    open('A FRESH SLICE', 'Start a new adventure?', `<p>This resets the ingredients and field notes saved in this browser.</p><div class="dialog-actions">${button('confirm-new', 'Start fresh', true)}${button('cancel-new', 'Keep my progress')}</div>`);
    bind('#cancel-new', close); bind('#confirm-new', () => { progress = freshProgress(); persist(); updateProgress(); close(); enter('neighbourhood'); player = { ...spawn }; announce('A fresh adventure. Three ingredients to find.'); });
  });
  $('#sound-toggle').addEventListener('click', async () => {
    const toggle = $<HTMLButtonElement>('#sound-toggle'); toggle.disabled = true;
    const on = await synth.toggle();
    toggle.setAttribute('aria-pressed', String(on)); $('#sound-label').textContent = on ? 'Music: On' : 'Music: Off';
    $('.volume-control').hidden = !on; toggle.disabled = false;
    announce(on ? 'Original synth music enabled.' : 'Music is off.');
  });
  $<HTMLInputElement>('#volume').addEventListener('input', event => synth.setVolume(Number((event.target as HTMLInputElement).value) / 100));
  document.addEventListener('visibilitychange', () => { clearMovement(); synth.setHidden(document.hidden); lastTime = 0; });
  window.addEventListener('hashchange', () => {
    if (window.location.hash !== '#story') return;
    clearMovement();
    const story = $('#story'); story.tabIndex = -1;
    if (dialog.open) { priorFocus = story; close(); }
    else story.focus({ preventScroll: true });
  });
  window.addEventListener('blur', clearMovement);
  canvas.addEventListener('blur', () => keys.clear());
  const movementKeys = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'];
  document.addEventListener('keydown', event => {
    if (dialog.open || event.altKey || event.ctrlKey || event.metaKey || document.activeElement !== canvas) return;
    const key = event.key.toLowerCase();
    if (movementKeys.includes(key)) { event.preventDefault(); keys.add(key); path = []; destination = undefined; }
    else if (!event.repeat && ['e', 'enter', 'j', 'escape'].includes(key)) { event.preventDefault(); if (key === 'j') showJournal(); else if (key === 'escape') showHelp(true); else interact(); }
  });
  document.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
  document.querySelectorAll<HTMLButtonElement>('[data-direction]').forEach(el => {
    const key = `arrow${el.dataset.direction}`;
    el.addEventListener('pointerdown', event => {
      if (dialog.open) return; event.preventDefault(); canvas.focus({ preventScroll: true }); path = []; destination = undefined; keys.add(key); el.setPointerCapture(event.pointerId);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => el.addEventListener(type, () => keys.delete(key)));
  });
  canvas.addEventListener('pointerdown', event => {
    if (dialog.open) return;
    canvas.focus({ preventScroll: true }); keys.clear();
    const point = renderer.screenToWorld(event.clientX, event.clientY);
    const hit = hotspots[room].find(spot => Math.hypot(spot.x - point.x, spot.y - point.y) < 48 || (spot.area && point.x >= spot.area.x && point.x <= spot.area.x + spot.area.w && point.y >= spot.area.y && point.y <= spot.area.y + spot.area.h));
    destination = hit;
    if (hit && Math.hypot(player.x - hit.x, player.y - hit.y) < 65) { activate(hit); return; }
    path = findPath(player, hit || point, room);
    if (!path.length) { destination = undefined; announce('That spot is out of reach. Try the path or the Places menu.'); }
  });
  function tick(time: number) {
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.04) : 0; lastTime = time;
    let moving = false;
    if (inView && !document.hidden) {
      if (!dialog.open) {
        let dx = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
        let dy = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
        if (!dx && !dy && path.length) {
          const next = path[0], distance = Math.hypot(next.x - player.x, next.y - player.y);
          if (distance < 5) { path.shift(); if (!path.length && destination) { const target = destination; destination = undefined; activate(target); } }
          else { dx = (next.x - player.x) / distance; dy = (next.y - player.y) / distance; }
        }
        const length = Math.hypot(dx, dy);
        if (length && !dialog.open) {
          const speed = 175 * dt;
          const x = player.x + dx / length * speed, y = player.y + dy / length * speed;
          if (canStand({ x, y: player.y }, room)) { moving ||= Math.abs(x - player.x) > 0; player.x = x; }
          if (canStand({ x: player.x, y }, room)) { moving ||= Math.abs(y - player.y) > 0; player.y = y; }
        }
      }
      nearest = [...hotspots[room]].sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y)).find(spot => Math.hypot(spot.x - player.x, spot.y - player.y) < 68);
      if ((nearest?.id || '') !== lastNearest) { lastNearest = nearest?.id || ''; $('#interact-label').textContent = nearest?.label || 'Explore places'; }
      const coordinates = `${Math.round(player.x).toString().padStart(3, '0')} : ${Math.round(player.y).toString().padStart(3, '0')}`;
      if (coordinates !== lastCoordinates) { lastCoordinates = coordinates; $('#coordinates').textContent = coordinates; }
      renderer.draw(room, player, moving && !reducedMotion, time, nearest, progress.finished);
    }
    frameId = requestAnimationFrame(tick);
  }
  const observer = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; if (!inView) clearMovement(); }); observer.observe(canvas);
  window.addEventListener('pagehide', () => { clearMovement(); synth.setHidden(true); });
  window.addEventListener('pageshow', () => synth.setHidden(document.hidden));
  window.addEventListener('beforeunload', () => { cancelAnimationFrame(frameId); observer.disconnect(); dialogCleanup?.(); synth.dispose(); });
  updateProgress(); frameId = requestAnimationFrame(tick);
  if (window.location.hash !== '#story' && (progress.ingredients.length || progress.discoveries.length > 1 || progress.finished)) {
    open('WELCOME BACK, PLAYER ONE', 'Your table is still reserved.', `<p class="resume-note">${progress.ingredients.length} / 3 ingredients · ${progress.discoveries.length} field notes${progress.finished ? ' · Dinner served' : ''}</p><p>Pick up where you left off. Music starts off, just as it should.</p><div class="dialog-actions">${button('continue-game', 'Continue adventure →', true)}${button('resume-notes', 'Read my field notes')}</div>`);
    bind('#continue-game', () => { priorFocus = canvas; close(); }); bind('#resume-notes', showJournal);
  }
}
