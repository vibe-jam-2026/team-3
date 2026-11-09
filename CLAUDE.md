# Team 3 game jam: notes for Claude

- Browser game, plain HTML + JavaScript modules + one canvas, no build step. Published from `main` by GitHub Pages.
- `GAME.md` is the game concept; keep its rules table in sync with gameplay changes.
- `STATS.md` lists every base value (players, chain, enemies, boss, waves, upgrades, debug options).
  **Whenever a value in `js/config.js` or `js/upgrades.js` changes, or an entity/upgrade is added or removed, update `STATS.md` in the same commit.**
- Work on a `claude/...` branch from the latest `main` and open a pull request; the team merges it.
- Debug URL options: `?god`, `?wave=N`, `?start=N`, `?coins=N`; `window.game` is available in the browser console.
