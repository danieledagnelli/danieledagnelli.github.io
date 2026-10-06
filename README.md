# dagnelli.net

Daniele D’Agnelli’s personal website. For now every path shows only the name, centred on a black page: `src/components/NamePage.astro`, rendered by `src/pages/index.astro` and `src/pages/404.astro` (GitHub Pages serves the latter for unknown paths). `tests/home.spec.ts` checks it. `src/components/BidiFrame.astro`, a full-viewport iframe of [bidi world](https://bidi.unplatform.dev/), is kept but not rendered.

The previous homepage, Follow the pulse, is archived and described below. Its pages and tests are in `src/_archive/pulse-site`; its modules are still in `src`.

## Follow the pulse (archived)

Six different mini-games on a black canvas, revealing the person behind the heartbeat. A hidden code-breaking game is the optional seventh challenge.

```sh
npm install
npm run dev -- --host 0.0.0.0
```

Open http://localhost:4321 and choose **start exploring**. Retrace a route through four cities, rotate a circuit, repeat a pattern, spot data anomalies, build a pizza, and guide a light through a maze. Each game reveals a personal story. A small star near the heartbeat’s peak opens the secret code puzzle.

The header shows elapsed time and discoveries out of six. Time counts while exploring the main trail, including reading discoveries. It pauses on breaks, hidden tabs, and the bonus puzzle, and stops when the six main stories are discovered. Completed games and time survive a reload; an unfinished mini-game starts fresh. Solved games and stories revealed through the skip control are counted separately. The bonus is tracked separately from the main six.

Every game has a hint and a direct route to the story. Mouse, touch, and keyboard work. Reduced motion replaces pattern playback with a static sequence. **Read instead** opens all six stories without the game or JavaScript.

### Development

- `src/components/PulseExperience.astro`: shared homepage and `/v2` experience.
- `src/pulse/game.ts`: game flow, elapsed clock, discoveries, bonus dialog, and validated local progress.
- `src/pulse/minigames.ts`: six independent game mechanics and the secret code puzzle.
- `src/data/signals.ts`: stories; professional facts reference `src/data/resume.ts`.
- `src/styles/pulse.css`: responsive styles and SVG animation.
- `src/_archive/pulse-site/about.astro`: static reading alternative.
- `src/_archive/pulse-site/pulse.spec.ts`: completion, persistence, pointer, keyboard, touch, and accessibility checks.

```sh
npm run check:game
npm test
npm run build -- --outDir /tmp/heartbeat-v2-build
```

Playwright requires Chromium and starts the development server if needed. Test artifacts go to `/tmp/heartbeat-tests`. Use an isolated build to preserve historical tracked `dist` artifacts.

There are no added runtime dependencies, external fonts, audio, or frame-by-frame JavaScript animation loops. CSS animates the heartbeat. The elapsed clock updates once per second only while active; the memory game uses short, cancellable timeouts. Pauses and hidden tabs suspend both.

## Previous versions

The Pineapple homepage, tests, and documentation are preserved in `src/_archive`; its supporting modules remain in `src/game`. Earlier themes remain in `src/_archive/legacy-site`. Archives are not live routes.

GitHub Pages deploys through `.github/workflows/deploy.yml` on pushes to `main`. Local development does not publish the site.
