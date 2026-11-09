# Tethered: stats

All base values in the game. The real numbers live in `js/config.js` (and upgrade amounts in `js/upgrades.js`); this page mirrors them and is updated whenever they change.

**▶ Play: https://vibe-jam-2026.github.io/team-3/** · Concept: [GAME.md](GAME.md)

## Players (each is a worm head)

| Stat | Base | Per upgrade level |
|---|---|---|
| Max health | 120 | +25 |
| Health regen | 0 hp/s | +1 hp/s |
| Move speed | 208 px/s | +8% of base |
| Size (radius) | 16 px | – |
| Can't be hurt after a hit | 0.6 s | – |
| Coin magnet field | 40 px (beyond the player's edge) | +35 px |

- Both players heal to full between waves.
- Coins can be collected 1 s after they drop: by touching a player, touching the chain, or being pulled in by the magnet field (pull speed 260 px/s).

## Chain (the worm body)

| Stat | Value |
|---|---|
| Max length | 200 px (+30 per upgrade level) |
| Spring starts pulling players together at | 70% of max length |
| Spring strength | 3 |
| Minimum swing speed to hit | 120 px/s |
| Time before the same enemy can be hit again | 0.25 s (boss: 0.3 s) |
| Knockback | 35% of the chain's speed |
| Links | 14 |
| Drawn body width | 15 px (visual only; hits use the 4 px chain line) |

## Enemies

| | Egg | Chicken | Rooster | Rat | Dino boss | Alien boss |
|---|---|---|---|---|---|---|
| Hits to kill | 1 | 2 | 3 | 1 (+1 per Rat health level) | 5 | 8 |
| Damage per touch (wave 1) | 10 | 18 | 28 | 0 (neutral) | 35 | 25 |
| Shot damage (wave 1) | – | – | – | – | – | 15 |
| Speed (wave 1) | 56 px/s | 56 px/s | 56 px/s | 105 px/s (half when wandering) | 55 walking / 620 charging | 90 gliding |
| Size (radius) | 12 px | 17 px | 22 px | 10 px | 46 px | 44 px |
| Coins (base) | 1 | 3 | 6 | 1 | 25 | 25 |
| Coins (on average, ×0.8) | 0.8 | 2.4 | 4.8 | 0.8 | 20 | 20 |
| First appears | wave 1 | wave 2 | wave 3 | wave 1 | waves 5, 15, 25, … | waves 10, 20, 30, … |

- A hit is a chain swing **or a bounced alien shot** (bounced shots hurt every enemy and both bosses).

- Each enemy also has an unused `hp` value (egg 25, chicken 50, rooster 90, rat 15, +6 per wave) kept for future weapons; the chain counts hits instead.
- Coin drops with a fraction become a chance of one extra coin (e.g. 2.4 = 2 coins + 40% chance of a third).
- Eggs eaten by rats give no kill and no coins.

## Per-wave scaling

| What | Rule |
|---|---|
| Wave length | 30 s (boss waves continue until the dino is dead) |
| Time between spawns | 1.1 s in wave 1, ×0.91 each wave (9% shorter per wave), min 0.15 s; then ÷1.2 (20% more enemies) |
| Enemy speed | ×1.05 per wave (not the dino) |
| Enemy damage | ×1.05 per wave (dino too) |
| Chickens | 15% of spawns at wave 2, +15 points per wave, max 45% |
| Roosters | 10% of spawns at wave 3, +10 points per wave, max 30% |
| Rats | one every 6 s, max 4 alive; the first comes 2 s into the wave |

Spawn interval by wave (after the 20% boost):

| Wave | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 |
|---|---|---|---|---|---|---|---|---|
| Seconds between spawns | 0.92 | 0.83 | 0.76 | 0.69 | 0.63 | 0.57 | 0.47 | 0.39 |
| Enemy speed (px/s) | 56 | 59 | 62 | 65 | 68 | 71 | 79 | 87 |
| Damage ×  | 1.00 | 1.05 | 1.10 | 1.16 | 1.22 | 1.28 | 1.41 | 1.55 |

## Rats

| Stat | Value |
|---|---|
| Spawn interval | 6 s |
| Max alive | 4 |
| Run speed (to an egg) | 105 px/s |
| Eating time after cracking an egg | 2.5 s |

## Dino boss

| Stat | Value |
|---|---|
| Appears | 5 s into waves 5, 15, 25, … (every 5th wave that isn't an alien wave) |
| Walk toward nearest player | 2.5 s at 55 px/s |
| Arrow shown before charging | 1 s |
| Charge | 620 px/s until it hits a wall |
| Dazed after the charge | 1.2 s |
| Other enemies while it's alive | spawn 75% less |
| Wave ends | only when it's dead (after 30 s the HUD says *Kill the boss!*) |

## Alien boss

| Stat | Value |
|---|---|
| Appears | 5 s into waves 10, 20, 30, … (replaces the dino on those waves) |
| Movement | glides to random spots at 90 px/s, pauses 0.6–1.4 s |
| Volleys | every 1.6 s, 3–5 shots, 0.12 s apart |
| Aim | the middle of the two players ± 0.6 rad (≈34°) random spread |
| Shot speed / size | 230 px/s / radius 6 px, fizzles after 6 s or at the wall |
| Shot damage | 15 to a player (×1.05 per wave) |
| Bounced by the chain | any touch (no swing needed); turns blue, ×1.4 speed, then hurts enemies and bosses (1 hit each) instead of players |
| Other enemies while it's alive | spawn 75% less |
| Wave ends | only when it's dead |

## Upgrades (shop between waves)

| Key | Upgrade | Per level |
|---|---|---|
| 1 | Chain length | +30 px |
| 2 | Max health | +25 hp (each player) |
| 3 | Health regen | +1 hp/s (each player) |
| 4 | Move speed | +8% of base |
| 5 | Enemy slow | enemies ×0.93 speed (5 levels ≈ −30%, 12 ≈ −58%) |
| 6 | Coin magnet | +35 px field |
| 7 | Rat health | rats take +1 chain hit to kill (1 → 2 → 3 …) |

- No level cap.
- Price per level follows Fibonacci, the same for every upgrade: **1, 2, 3, 5, 8, 13, 21, 34, 55, …**
- The extra **Max All** card is a trap: it makes the next wave a flood of unkillable enemies (one every 0.04 s, up to 300).

## Highscores

| Rule | Value |
|---|---|
| Names | two, 3 characters each (A–Z, 0–9) |
| Ranked by | waves cleared (dying in wave N = N − 1 cleared), then kills, then time |
| List length | top 10 |
| Saved | in this browser (localStorage); runs with debug options aren't saved |

## Debug URL options

| Option | Effect |
|---|---|
| `?god` | players can't take damage |
| `?wave=5` | waves last 5 s |
| `?start=5` | begin at wave 5, with upgrades worth ≈ 96 coins (three upgrades level 5, three level 4) |
| `?start=10` | begin at wave 10, with upgrades worth ≈ 324 coins (every upgrade level 7) |
| `?coins=200` | start with 200 coins |

Any `?start=N` gives upgrades worth `12 × (N − 1)^1.5` coins, spent evenly across all upgrades (cheapest next level first). Combine options, e.g. `?god&start=5&coins=200`.

Boss test links (with god mode): [dino, wave 5](https://vibe-jam-2026.github.io/team-3/?start=5&god) · [alien, wave 10](https://vibe-jam-2026.github.io/team-3/?start=10&god)
