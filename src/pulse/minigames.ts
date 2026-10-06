export interface MiniGame {
  destroy(): void;
  suspend(): void;
  hint(): string;
}
type Report = (message: string) => void;
type Mount = (root: HTMLElement, win: () => void, report: Report) => MiniGame;

function lifecycle(root: HTMLElement, win: () => void) {
  const abort = new AbortController();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let finished = false;
  const clear = () => { timers.forEach(clearTimeout); timers.clear(); };
  return {
    signal: abort.signal,
    click(fn: (button: HTMLButtonElement) => void) {
      root.addEventListener('click', event => {
        const button = (event.target as Element).closest('button');
        if (button && root.contains(button) && !button.disabled && !finished) fn(button);
      }, { signal: abort.signal });
    },
    after(fn: () => void, ms: number) {
      const timer = setTimeout(() => { timers.delete(timer); if (!finished) fn(); }, ms);
      timers.add(timer);
    },
    clear,
    win() { if (!finished) { finished = true; clear(); win(); } },
    destroy() { finished = true; clear(); abort.abort(); },
  };
}

const route: Mount = (root, win, report) => {
  const life = lifecycle(root, win);
  const answer = ['Bari', 'Milan', 'Dublin', 'London'];
  const picked: string[] = [];
  root.innerHTML = '<ol class="route-slots" aria-label="Your route"><li>01</li><li>02</li><li>03</li><li>04</li></ol><div class="city-choices">' + ['London', 'Dublin', 'Bari', 'Milan'].map(city => `<button type="button" data-city="${city}">${city}<span aria-hidden="true">↗</span></button>`).join('') + '</div><button type="button" data-undo class="text-button">undo last stop</button>';
  const draw = () => {
    root.querySelectorAll('.route-slots li').forEach((slot, i) => { slot.textContent = picked[i] || `0${i + 1}`; slot.classList.toggle('filled', !!picked[i]); });
    root.querySelectorAll<HTMLButtonElement>('[data-city]').forEach(button => { button.disabled = picked.includes(button.dataset.city!); });
    root.querySelector<HTMLButtonElement>('[data-undo]')!.disabled = !picked.length;
  };
  life.click(button => {
    if (button.hasAttribute('data-undo')) picked.pop();
    else if (button.dataset.city && picked.length < 4) picked.push(button.dataset.city);
    draw();
    if (picked.length === 4) {
      if (picked.every((city, i) => city === answer[i])) life.win();
      else report('A detour. Undo a stop or two: Bari first, London last.');
    } else report(`${picked.length} of 4 stops placed.`);
  });
  draw();
  return { destroy: life.destroy, suspend: life.clear, hint: () => 'Start in Bari, then Milan, then Dublin. London is the final stop.' };
};

const circuit: Mount = (root, win, report) => {
  const life = lifecycle(root, win);
  // Directions are north, east, south, west. Every connection is checked both ways.
  const shapes = ['straight', 'straight', 'corner', 'corner', 'straight', 'corner', 'corner', 'straight', 'straight'];
  const rotations = [0, 0, 0, 0, 0, 0, 2, 0, 0];
  const delta = [-3, 1, 3, -1];
  const ports = (index: number) => (shapes[index] === 'straight' ? [0, 2] : [0, 1]).map(direction => (direction + rotations[index]) % 4);
  root.innerHTML = '<div class="circuit-labels"><span>→ power in</span><span>power out →</span></div><div class="circuit-grid" aria-label="Rotate the nine circuit tiles">' + shapes.map((shape, index) => `<button type="button" data-tile="${index}"><svg viewBox="0 0 60 60" fill="none" aria-hidden="true"><path d="${shape === 'straight' ? 'M30 0V60' : 'M30 0V30H60'}"/><circle cx="30" cy="30" r="3"/></svg></button>`).join('') + '</div>';
  const draw = () => {
    const powered = new Set<number>();
    const queue = ports(0).includes(3) ? [0] : [];
    while (queue.length) {
      const index = queue.shift()!;
      if (powered.has(index)) continue;
      powered.add(index);
      for (const direction of ports(index)) {
        if ((direction === 1 && index % 3 === 2) || (direction === 3 && index % 3 === 0)) continue;
        const neighbour = index + delta[direction];
        if (neighbour >= 0 && neighbour < 9 && ports(neighbour).includes((direction + 2) % 4) && !powered.has(neighbour)) queue.push(neighbour);
      }
    }
    root.querySelectorAll<HTMLButtonElement>('[data-tile]').forEach((button, index) => {
      button.dataset.powered = String(powered.has(index));
      button.setAttribute('aria-label', `Rotate tile ${index + 1}. Connects ${ports(index).map(port => ['up', 'right', 'down', 'left'][port]).join(' and ')}${powered.has(index) ? '. Powered' : ''}`);
      button.querySelector<SVGElement>('svg')!.style.transform = `rotate(${rotations[index] * 90}deg)`;
    });
    if (powered.has(8) && ports(8).includes(1)) life.win();
    else report(`${powered.size} of 9 tiles powered. Connect left of the top row to right of the bottom row.`);
  };
  life.click(button => { const index = Number(button.dataset.tile); rotations[index] = (rotations[index] + 1) % 4; draw(); });
  draw();
  return { destroy: life.destroy, suspend: life.clear, hint: () => 'Make a snake: across the top →, back across the middle ←, then across the bottom →. Tap to turn each piece.' };
};

const memory: Mount = (root, win, report) => {
  const life = lifecycle(root, win);
  const symbols = ['○', '△', '◇', '□'];
  const sequence = [0, 2, 1, 3];
  let playing = false;
  let ready = false;
  let position = 0;
  root.innerHTML = '<div class="memory-reference" hidden aria-label="Pattern to repeat">○ → ◇ → △ → □</div><div class="memory-pads">' + symbols.map((symbol, index) => `<button type="button" data-pad="${index}" aria-label="Pad ${index + 1}: ${['circle', 'triangle', 'diamond', 'square'][index]}" disabled>${symbol}</button>`).join('') + '</div><button type="button" data-watch class="primary-button">show the pattern ↗</button>';
  const pads = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-pad]'));
  const watch = root.querySelector<HTMLButtonElement>('[data-watch]')!;
  const reference = root.querySelector<HTMLElement>('.memory-reference')!;
  const light = (index: number) => pads.forEach((pad, i) => pad.classList.toggle('lit', i === index));
  const enable = () => { playing = false; ready = true; pads.forEach(pad => { pad.disabled = false; }); watch.disabled = false; report('Your turn. Repeat the four symbols.'); };
  life.click(button => {
    if (button.hasAttribute('data-watch')) {
      life.clear(); position = 0; ready = false; playing = true; light(-1);
      pads.forEach(pad => { pad.disabled = true; }); watch.disabled = true;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      reference.hidden = !reduced;
      if (reduced) { enable(); return; }
      report('Watch the four pads…');
      sequence.forEach((pad, index) => {
        life.after(() => { light(pad); report(`Step ${index + 1}: ${['circle', 'triangle', 'diamond', 'square'][pad]}.`); }, index * 800 + 150);
        life.after(() => light(-1), index * 800 + 700);
      });
      life.after(enable, 3400);
    } else if (ready && !playing && button.dataset.pad) {
      const pad = Number(button.dataset.pad);
      if (pad !== sequence[position]) { position = 0; report('Different beat. Try the four-symbol pattern again, or replay it.'); return; }
      position++;
      if (position === sequence.length) life.win();
      else report(`${position} of 4 beats remembered.`);
    }
  });
  return {
    destroy: life.destroy,
    suspend() { if (playing) { life.clear(); playing = false; ready = false; light(-1); watch.disabled = false; report('Pattern paused. Show it again when you’re ready.'); } },
    hint() { reference.hidden = false; return 'Circle → diamond → triangle → square. Show the pattern, then tap that order.'; },
  };
};

const anomaly: Mount = (root, win, report) => {
  const life = lifecycle(root, win);
  const readings = [
    [39, 42, 40, 38, 41, 40, 39, 97, 38, 43, 41, 40, 42, 39, 40, 41],
    [42, 40, 39, 41, 38, 40, 43, 39, 42, 41, 40, 38, 4, 40, 42, 39],
    [40, 41, 88, 39, 42, 40, 38, 43, 39, 41, 42, 40, 38, 42, 39, 41],
  ];
  const odd = [7, 12, 2];
  let round = 0;
  const draw = () => {
    root.innerHTML = `<p class="mini-label">batch ${round + 1} / 3 · usual range 38–43</p><div class="data-grid">` + readings[round].map((value, index) => `<button type="button" data-reading="${index}" aria-label="Reading ${index + 1}: ${value}">${String(value).padStart(2, '0')}</button>`).join('') + '</div>';
  };
  life.click(button => {
    if (Number(button.dataset.reading) !== odd[round]) { report('That reading fits the usual range. Look for the outlier.'); return; }
    round++;
    if (round === readings.length) life.win();
    else { draw(); root.querySelector<HTMLButtonElement>('button')!.focus({ preventScroll: true }); report(`Outlier caught. Find the next one: batch ${round + 1} of 3.`); }
  });
  draw();
  return { destroy: life.destroy, suspend: life.clear, hint: () => 'Look outside 38–43. A reading that is much higher or lower is the anomaly.' };
};

const pizza: Mount = (root, win, report) => {
  const life = lifecycle(root, win);
  const chosen = new Set<string>();
  const toppings = ['tomato', 'mozzarella', 'pineapple', 'olives', 'mushrooms', 'pepperoni'];
  root.innerHTML = '<svg class="pizza-plate" viewBox="0 0 200 200" fill="none" aria-label="Your pizza"><circle class="crust" cx="100" cy="100" r="81"/><circle class="base" cx="100" cy="100" r="71"/><g data-art="tomato" hidden stroke="#65a87d" stroke-width="7"><path d="M54 64Q99 31 142 70M52 107Q104 73 148 113M74 146Q99 124 131 144"/></g><g data-art="mozzarella" hidden fill="#d4e4d7"><circle cx="62" cy="75" r="8"/><circle cx="122" cy="64" r="8"/><circle cx="143" cy="115" r="8"/><circle cx="95" cy="129" r="8"/><circle cx="77" cy="103" r="7"/></g><g data-art="pineapple" hidden fill="#e4ce85"><path d="m87 52 11 4-5 13-11-4zm38 36 12 5-5 12-12-4zm-65 40 11 3-4 13-11-3zm44 11 11 4-4 12-11-4z"/></g><g data-art="olives" hidden stroke="#70a486" stroke-width="4"><circle cx="85" cy="61" r="5"/><circle cx="57" cy="109" r="5"/><circle cx="134" cy="133" r="5"/></g><g data-art="mushrooms" hidden stroke="#b6b8a2" stroke-width="5"><path d="M94 83q10-14 20 0zm10 0v10M50 121q10-14 20 0zm10 0v10"/></g><g data-art="pepperoni" hidden fill="#a37766"><circle cx="101" cy="101" r="10"/><circle cx="67" cy="60" r="9"/><circle cx="126" cy="130" r="9"/></g></svg><div class="topping-choices">' + toppings.map(topping => `<button type="button" data-topping="${topping}" aria-pressed="false">${topping}</button>`).join('') + '</div><button type="button" data-serve class="primary-button">serve it ↗</button>';
  life.click(button => {
    const topping = button.dataset.topping;
    if (topping) {
      if (chosen.has(topping)) chosen.delete(topping); else chosen.add(topping);
      button.setAttribute('aria-pressed', String(chosen.has(topping)));
      root.querySelector(`[data-art="${topping}"]`)!.toggleAttribute('hidden', !chosen.has(topping));
      report(`${chosen.size} toppings on the pizza.`);
    } else if (button.hasAttribute('data-serve')) {
      if (chosen.size === 3 && ['tomato', 'mozzarella', 'pineapple'].every(t => chosen.has(t))) life.win();
      else report('Not quite my order. A tomato-and-cheese base, with a tropical twist. Three toppings.');
    }
  });
  return { destroy: life.destroy, suspend: life.clear, hint: () => 'Tomato + mozzarella + pineapple. Yes, really. Tap extra toppings to remove them.' };
};

const maze: Mount = (root, win, report) => {
  const life = lifecycle(root, win);
  const walls = new Set([2, 5, 7, 9, 16, 17, 18, 23]);
  let position = 0;
  root.innerHTML = '<div class="maze-grid" tabindex="0" role="group" aria-label="Bring the light home. Use arrow keys or W A S D.">' + Array.from({ length: 25 }, (_, index) => `<span data-cell="${index}" class="${walls.has(index) ? 'wall' : 'floor'}" aria-hidden="true">${index === 24 ? '⌂' : ''}</span>`).join('') + '</div><div class="maze-controls" aria-label="Movement controls">' + [['up', '↑'], ['left', '←'], ['down', '↓'], ['right', '→']].map(([direction, arrow]) => `<button type="button" data-move="${direction}" aria-label="Move ${direction}">${arrow}</button>`).join('') + '</div>';
  const grid = root.querySelector<HTMLElement>('.maze-grid')!;
  const draw = () => {
    root.querySelectorAll<HTMLElement>('[data-cell]').forEach((cell, index) => cell.classList.toggle('player', index === position));
    grid.setAttribute('aria-label', `Light at row ${Math.floor(position / 5) + 1}, column ${position % 5 + 1}. Home is row 5, column 5. Use arrow keys or W A S D.`);
  };
  const move = (direction: string) => {
    if (root.closest('fieldset')?.disabled) return;
    const delta = ({ up: -5, right: 1, down: 5, left: -1 } as Record<string, number>)[direction];
    const next = position + delta;
    if (next < 0 || next >= 25 || walls.has(next) || (direction === 'left' && position % 5 === 0) || (direction === 'right' && position % 5 === 4)) { report('A wall. Try another direction.'); return; }
    position = next; draw();
    if (position === 24) life.win();
    else report(`Row ${Math.floor(position / 5) + 1}, column ${position % 5 + 1}. Keep the light moving.`);
  };
  life.click(button => { if (button.dataset.move) move(button.dataset.move); });
  root.addEventListener('keydown', event => {
    const direction = ({ ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left', w: 'up', d: 'right', s: 'down', a: 'left' } as Record<string, string>)[event.key];
    if (direction) { event.preventDefault(); move(direction); }
  }, { signal: life.signal });
  draw();
  return { destroy: life.destroy, suspend: life.clear, hint: () => 'From the start: right, down, down, right, right, right, down, down. The little light is heading home.' };
};

const games: Mount[] = [route, circuit, memory, anomaly, pizza, maze];
export const mountMiniGame = (index: number, root: HTMLElement, win: () => void, report: Report) => games[index](root, win, report);

export const mountSecret: Mount = (root, win, report) => {
  const life = lifecycle(root, win);
  const symbols = ['○', '△', '◇', '□'];
  const code = [2, 0, 3];
  const guess = [0, 0, 0];
  let attempts = 0;
  root.innerHTML = '<div class="code-slots">' + guess.map((_, index) => `<button type="button" data-slot="${index}" aria-label="Code slot ${index + 1}: circle">○</button>`).join('') + '</div><button type="button" data-check-code class="primary-button">check the code ↗</button><ol class="code-history" aria-label="Previous guesses"></ol>';
  life.click(button => {
    if (button.dataset.slot !== undefined) {
      const slot = Number(button.dataset.slot);
      guess[slot] = (guess[slot] + 1) % symbols.length;
      button.textContent = symbols[guess[slot]];
      button.setAttribute('aria-label', `Code slot ${slot + 1}: ${['circle', 'triangle', 'diamond', 'square'][guess[slot]]}`);
    } else if (button.hasAttribute('data-check-code')) {
      attempts++;
      const exact = guess.filter((value, index) => value === code[index]).length;
      if (exact === 3) { life.win(); return; }
      const common = symbols.reduce((count, _, symbol) => count + Math.min(code.filter(value => value === symbol).length, guess.filter(value => value === symbol).length), 0);
      const feedback = `${exact} in place · ${common - exact} misplaced`;
      const item = document.createElement('li');
      item.textContent = `${guess.map(value => symbols[value]).join(' ')}   ${feedback}`;
      const history = root.querySelector('ol')!;
      history.prepend(item);
      if (history.children.length > 4) history.lastElementChild!.remove();
      report(`Attempt ${attempts}: ${feedback}. Change the symbols and try again.`);
    }
  });
  return { destroy: life.destroy, suspend: life.clear, hint: () => 'Diamond first, circle second, square third. A little ethical hacking energy.' };
};
