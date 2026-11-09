# Game concept (working title: "Tethered")

**▶ Play it: https://vibe-jam-2026.github.io/team-3/**

> Placeholder title. Art, setting, what the players and enemies *are* — all decided later.

## Pitch
A **2-player couch co-op survivor game**. Two players share one screen and one keyboard,
each moving independently — but they are **tied together by a chain**. Hordes of enemies close in;
the players survive by moving, and by using the chain itself as a weapon.

## Core loop
> Move together (but not too together) to **sweep the chain through the horde** while avoiding contact, and survive as long as possible.

1. Enemies spawn and walk toward the players.
2. Players move independently; the chain between them follows.
3. Enemies hit by the chain take damage. Enemies touching a player hurt that player.
4. Survive longer → more and tougher enemies → (later) upgrades.

## Pillars
- **Cooperation is the weapon.** Neither player can do well alone; the best plays come from coordinating (one anchors, the other swings round; both run apart to pull the chain taut across a line of enemies).
- **The chain is both help and hindrance.** It limits how far apart players can go and can drag a partner into danger.
- **Readable chaos.** Many enemies on screen, but you always see where you and the chain are.

## Rules — v1 (decided)
| Topic | v1 decision |
|---|---|
| Players | 2, local, same keyboard |
| Controls | P1: `W A S D` · P2: arrow keys (gamepads later) |
| Arena | One box the size of the browser window; players can't leave it |
| Chain | Physical rope of segments between the players, with a max length. When stretched it pulls the players toward each other |
| Chain damage | Chain segments touching an enemy deal damage (likely scaled by how fast the segment moves, so swinging hits harder) |
| Enemies | Three tiers, all chase the nearest player and hurt on touch (no special abilities yet). **Tier 1 egg**: small, rolls, cracks open when killed. **Tier 2 chicken**: bigger, hits harder, bursts into feathers. **Tier 3 rooster**: biggest, hits hardest. Chickens appear from wave 2, roosters from wave 3, more of them each wave |
| Waves | Each wave lasts 30 s; enemies spawn faster and get tougher every wave. After a wave: a menu with a **Continue** button, the arena is cleared and both players heal to full |
| Health | Each player has their own health; if **either** player dies it's game over (revive mechanics are an open question) |

All tuning numbers live in `js/config.js`. Debug URL options: `?god` (players can't take damage), `?wave=5` (5-second waves), `?start=4` (begin at wave 4) — e.g. `https://vibe-jam-2026.github.io/team-3/?god&wave=5`.

## Open questions (decide later)
- **Spawning:** where (now: random point on the edge), groups/formations, boss waves?
- **Enemy types:** fast/weak, slow/tanky, ranged, ones that can cut or grab the chain?
- **Health:** shared pool instead? Down-and-revive (stand next to partner to revive) instead of instant game over?
- **Chain tuning:** length, stiffness, can it be extended by upgrades, does it hurt only when taut / only above a speed?
- **Player attacks:** does each player also auto-attack, or is the chain the only weapon?
- **Progression:** XP pickups, level-up choices (shared or per player), a timer to survive.
- **Scoring:** time survived, kills, high score in `localStorage`.
- **Art/theme:** who the players are, what the chain is (rope, chain, energy beam…), what the enemies are.

## Technical notes
- Plain HTML + JavaScript + one `<canvas>`, no build step.
- Chain: Verlet integration — a list of points with distance constraints; the two ends are pinned to the players.
- Chain vs enemy hit: distance from enemy circle to each chain segment (line segment).
- Many enemies: simple circle collisions; add a spatial grid if performance drops.
- Keyboard: WASD + arrows work on most keyboards together; watch for key-ghosting when both press many keys.

## How this fits the development plan
| Phase | What we build for this game |
|---|---|
| **2 · Skeleton** | Canvas filling the window, game loop, input for two players, start / play / game-over screens. Deploy. |
| **3 · Core prototype** | Two player circles moving in the box · chain between them (Verlet rope, max length, pulls players) · one enemy type chasing the nearest player · chain damages enemies · contact damages players · basic spawning from edges · restart. Coloured shapes only. **Playtest: is swinging the chain fun?** Tune chain length, stiffness and player speed before anything else. |
| **4 · Content** | Decide the open questions: spawn rules and difficulty ramp, 2–3 enemy types, health / revive model, XP and upgrades, timer and high score. |
| **5 · Juice** | Art and theme decided and drawn · chain hit effects (sparks, knockback, hit-stop) · screen shake · sounds for hits, deaths and level-ups · music with mute. |
| **6 · Polish** | Balance, performance with many enemies, window resizing, controls help on the title screen, final deploy. |

## Risks
- **The chain might not feel good.** It is the whole game, so it gets tuned first, in Phase 3.
- **Key-ghosting** with two players on one keyboard → test early; gamepad support as fallback.
- **Screen space:** a window-sized box can be small on laptops → keep players/enemies small, tune chain length to window size.
