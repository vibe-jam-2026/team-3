# Game concept (working title: "Tethered")

**▶ Play it: https://vibe-jam-2026.github.io/team-3/**

**▶ Start at wave 5 (boss wave): https://vibe-jam-2026.github.io/team-3/?start=5**

All numbers (hp, damage, speeds, costs …): **[STATS.md](STATS.md)**

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
| Chain damage | A swinging chain (moving faster than a minimum speed) hits enemies it touches. Hits to kill: **egg 1, chicken 2, rooster 3, rat 1, dino boss 5** |
| Enemies | Three tiers, all chase the nearest player and hurt on touch (no special abilities yet). **Tier 1 egg**: small, rolls, cracks open when killed. **Tier 2 chicken**: bigger, hits harder, bursts into feathers. **Tier 3 rooster**: biggest, hits hardest. Chickens appear from wave 2, roosters from wave 3, more of them each wave |
| Waves | Each wave lasts 30 s; enemies spawn faster and get tougher every wave. After a wave: a menu with a **Continue** button, the arena is cleared and both players heal to full |
| Boss | Every 5th wave a **dinosaur** roars into the arena 5 s into the wave, and the wave doesn't end (after the 30 s timer the HUD says *Kill the boss!*) until it's dead. It stomps toward the players, then shows a red arrow for 1 s and charges across the arena in that direction until it hits a wall (then it's dazed briefly). It shoves players aside and hits hard. While it's alive, other enemies spawn 75% less. Takes **5 chain hits** to kill and drops 20 coins |
| Rats | Neutral critters (from wave 1, max 4 at once). They never hurt the players. They run to the nearest egg, crack it in one bite and sit eating it for 2.5 s. Eggs eaten by rats give no kills or coins. The chain kills rats (1 coin) |
| Coins | Killed enemies drop coins on the spot (on average egg 0.8, chicken 2.4, rooster 4.8, boss 20). After 1 s they can be collected: by touching a player, by touching the **chain**, or by being pulled in by each player's small **magnet field**. The team shares one wallet. Coins still on the floor when the wave ends are lost |
| Upgrades | Bought between waves in the shop (click or keys 1–6), shared by both players: **Chain length** (+30 px), **Max health** (+25), **Health regen** (+1 hp/s), **Move speed** (+8%), **Enemy slow** (−7% enemy speed), **Coin magnet** (+35 px field). No level cap; prices follow Fibonacci: 3, 5, 8, 13, 21, 34, ... |
| Secret | The shop has a free **Max All** card. Its second line, written in the same colour as the card, says *enemies*: the next wave becomes a flood (up to 300) of enemies that can't be killed |
| Health | Each player has their own health; if **either** player dies it's game over (revive mechanics are an open question) |

Sound: chickens cluck and roosters crow when they enter the arena (synthesised in `js/audio.js`, no sound files). **M** toggles sound.

All tuning numbers live in `js/config.js`. Debug URL options: `?god` (players can't take damage), `?wave=5` (5-second waves), `?start=4` (begin at wave 4), `?coins=200` (start with 200 coins) — e.g. `https://vibe-jam-2026.github.io/team-3/?god&wave=5`.

## Open questions (decide later)
- **Spawning:** where (now: random point on the edge), groups/formations, boss waves?
- **Enemy types:** fast/weak, slow/tanky, ranged, ones that can cut or grab the chain?
- **Health:** shared pool instead? Down-and-revive (stand next to partner to revive) instead of instant game over?
- **Chain tuning:** length, stiffness, can it be extended by upgrades, does it hurt only when taut / only above a speed?
- **Player attacks:** does each player also auto-attack, or is the chain the only weapon?
- **Progression:** more upgrades (pickup magnet, chain damage area, weapons), per-player upgrades?
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
