# Team 3 game jam: notes for Claude

The game is called **Wormageddon in Space**. Text uses arcade fonts from `js/fonts.js` (Press Start 2P for titles/HUD/buttons, VT323 for longer text); use those for new on-screen text.

- Browser game, plain HTML + JavaScript modules + one canvas, no build step. Published from `main` by GitHub Pages.
- `GAME.md` is the game concept; keep its rules table in sync with gameplay changes.
- `STATS.md` lists every base value (players, chain, enemies, boss, waves, upgrades, debug options).
  **Whenever a value in `js/config.js` or `js/upgrades.js` changes, or an entity/upgrade is added or removed, update `STATS.md` in the same commit.**
- **Version number** lives in `js/version.js` (shown in the corner of every screen) and the "Current version" line in `GAME.md`. Bump it by 0.01 in every pull request that changes the game (1.00 → 1.01 → 1.02 …), mention it in the PR title/body, and always tell the user the new version number.
- **Performance:** things drawn many times per frame (eggs, chickens, roosters, rats, coins) are drawn once into cached sprites (`js/sprites.js`) and stamped with `drawImage`; keep new frequently drawn things cached too, and avoid canvas `filter`, `shadowBlur` and per-shape `save()/clip()` in per-frame code. Canvas resolution is capped at 2x (`js/display.js`). The main loop advances by the real frame time in equal steps of at most 1/60 s.
- Work on a `claude/...` branch from the latest `main` and open a pull request; the team merges it.
- Keys besides movement: Q (P1) / . (P2) throw partner, Esc/P pause, M sound, N music, V voice on/off, 1–7 shop. The beam and meteor are voice-only (no keys). Debug URL options: `?god`, `?wave=N`, `?start=N`, `?coins=N`, `?wormhole`, `?yarn`; `window.game` is available in the browser console.
