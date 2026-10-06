# Project guide

This is Daniele D’Agnelli’s Astro personal website at dagnelli.net. The homepage is Operation: Pineapple, a small Canvas 2D pixel adventure with accessible HTML puzzles and a complete static reading alternative.

## Commands

- `npm run dev -- --host 0.0.0.0`: local server on port 4321.
- `npm run check:game`: strict TypeScript checks for the active game modules.
- `npm test`: Playwright interaction tests; install Chromium first if needed.
- `npm run build`: static production output.

## Structure and constraints

- Current pages: `src/pages/index.astro` and `404.astro`.
- Game logic, artwork, and audio live in separate TypeScript modules under `src/game`.
- Personal content is in `src/game/content.ts`. Professional facts reference `src/data/resume.ts`; contact metadata comes from `src/siteMetadata.js`.
- Use local Canvas drawing for pixel graphics and HTML for readable text and interactive dialogs. Do not add a game engine without a concrete need.
- Audio must be silent on every page load and enabled only through an explicit music control. Never auto-enable it through movement or restored quest state.
- All puzzles have hints and skips. Keep the static biography and contact information accessible without completing the game or running JavaScript.
- Support keyboard, mouse, and touch. Modal dialogs suspend character movement and restore focus when closed.
- Progress persistence must tolerate blocked or invalid local storage.
- The previous theme-based website is archived at `src/_archive/legacy-site` and must not become a live route again by accident. Its original project guide is included there.
- GitHub Pages builds on pushes to main through `.github/workflows/deploy.yml`; publishing is separate from local development.

The repository historically tracks generated `.astro`, `dist`, and `node_modules` files. Avoid sweeping changes to these artifacts or to existing user modifications. For an isolated build, pass `--outDir /tmp/operation-pineapple-build`.
