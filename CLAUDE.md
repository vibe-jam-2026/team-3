# Team 3 game jam: notes for Claude

- Browser game, plain HTML + JavaScript modules + one canvas, no build step. Published from `main` by GitHub Pages.
- `GAME.md` is the game concept; keep its rules table in sync with gameplay changes.
- `STATS.md` lists every base value (players, chain, enemies, boss, waves, upgrades, debug options).
  **Whenever a value in `js/config.js` or `js/upgrades.js` changes, or an entity/upgrade is added or removed, update `STATS.md` in the same commit.**
- **Version number** lives in `js/version.js` (shown in the corner of every screen) and the "Current version" line in `GAME.md`. Bump it by 0.01 in every pull request that changes the game (1.00 → 1.01 → 1.02 …), mention it in the PR title/body, and always tell the user the new version number.
- Work on a `claude/...` branch from the latest `main` and open a pull request; the team merges it.
- Keys besides movement: Q (P1) / . (P2) throw partner, Esc/P pause, M sound, N music, V voice on/off, 1–7 shop. The beam and meteor are voice-only (no keys). Debug URL options: `?god`, `?wave=N`, `?start=N`, `?coins=N`, `?wormhole`; `window.game` is available in the browser console.
