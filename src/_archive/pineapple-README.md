# Operation: Pineapple

Daniele D’Agnelli’s personal website, presented as a small playable pixel adventure. Explore a neighbourhood of science, music, pizza, and family. The complete biography is also available below the game without JavaScript.

```sh
npm install
npm run dev -- --host 0.0.0.0
```

Open http://localhost:4321. Click the world, then use WASD/arrows to move and E/Enter to interact. Click a building to walk there, or use the Places menu. Mobile has a directional pad and an action button. J opens field notes; Escape pauses. Every puzzle has a hint and skip option.

Music is an original procedural synth score. It starts off on **every page load**, and is enabled only with the music button. Quest progress is saved locally when browser storage is available.

## Development

- `src/game/content.ts`: personal stories, shared résumé references, and versioned progress storage.
- `src/game/world.ts`: local pixel artwork, geometry, collision, pathfinding, and Canvas rendering.
- `src/game/game.ts`: interaction, puzzles, journal, inputs, and accessible HTML dialogs.
- `src/game/audio.ts`: optional Web Audio soundtrack and effects.
- `src/pages/index.astro`: homepage, complete reading alternative, and metadata.
- `src/styles/game.css`: responsive presentation.

```sh
npm run check:game
npx playwright install --with-deps chromium
npm test
npm run build
```

Playwright starts the development server if needed. Traces and test artifacts go to `/tmp/operation-pineapple-tests`. To review a production build without overwriting this repository’s historical tracked `dist` artifacts, use `npm run build -- --outDir /tmp/operation-pineapple-build`.

## Archived site

The previous rotating homepage and themed pages are preserved under `src/_archive/legacy-site`. They are no longer live routes. Retired URLs display a 404 page linking to the new homepage and biography. Historical static assets are retained.

GitHub Pages deployment remains controlled by `.github/workflows/deploy.yml` when changes are pushed to `main`. Local development does not publish the site.
