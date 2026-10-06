# Project guide

This is Daniele D’Agnelli’s Astro personal website at dagnelli.net. For now every path shows only the name, centred on a black page (`src/components/NamePage.astro`, rendered by `src/pages/index.astro` and `src/pages/404.astro`). `src/components/BidiFrame.astro`, a full-viewport iframe of https://bidi.unplatform.dev/, is kept but not rendered.

The previous homepage, Follow the pulse (six mini-games that reveal personal stories, plus a hidden code-breaking bonus), is archived: its pages and Playwright tests are in `src/_archive/pulse-site`, and its modules remain in `src/pulse`, `src/mirror`, `src/data`, and `src/styles`. The notes below about the game apply only if it is restored.

## Commands

- `npm run dev -- --host 0.0.0.0`: preview on port 4321.
- `npm run check:game`: strict TypeScript checks for the current game.
- `npm test`: Playwright checks for the name page (`tests/home.spec.ts`).
- `npm run build -- --outDir /tmp/heartbeat-v2-build`: isolated production build.

## Structure and constraints

- Archived: `/` and `/v2` rendered `src/components/PulseExperience.astro`; `/about` provided the stories without JavaScript.
- Game flow and timer: `src/pulse/game.ts`. Individual mechanics: `src/pulse/minigames.ts`. Stories: `src/data/signals.ts`. Styles: `src/styles/pulse.css`.
- Professional facts reference `src/data/resume.ts`; contact metadata comes from `src/siteMetadata.js`. Do not invent personal facts.
- Preserve the black canvas, green heartbeat, calm pacing, and lightweight implementation. Prefer SVG/CSS animation and event-driven controls.
- Support keyboard, mouse, touch, reduced motion, pause, and blocked or invalid storage. Track active elapsed time and main progress out of six; count the bonus separately. Pause the timer during breaks, hidden tabs, and the bonus game. Every mini-game needs a hint and a direct story reveal; distinguish solved from revealed chapters.
- Keep stories and contact accessible without playing or JavaScript.
- The Pineapple homepage, tests, and documentation are archived in `src/_archive`; its supporting modules remain in `src/game`. They are not the active experience.
- Older themes remain in `src/_archive/legacy-site` and must not become live routes accidentally.
- Publishing is separate from local development. GitHub Pages builds on pushes to main.

The repository historically tracks generated `.astro`, `dist`, and `node_modules` files. Avoid sweeping changes to these artifacts or existing user modifications.
