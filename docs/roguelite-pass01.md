# Aisteroids Roguelite Prototype · Pass 01

Implemented against verified current `main` **1d734ce4f901d401ccf635ac661ee861f5b177d6**, Alpha 0.33.0. Dedicated branch: `feature/roguelite-prototype-01`. No changes to `main`, Pages workflows, or Classic save formats/keys. The experiment is opt-in through the Classic menu or `?roguelite`.

## Play and reproduce

```sh
git fetch origin
git switch feature/roguelite-prototype-01
npm ci
npm run dev -- --host 127.0.0.1
```

Open <http://127.0.0.1:5173/aisteroids/?roguelite>. Start seed **7**. There is one free Miner. Open **BUY** to buy Slots and then hulls. A useful starting fleet is two Miners followed by Fighters. Keep a replacement reserve; empty purchased capacity remains available after destruction. Collect and return Tech caches, then choose one upgrade. The Captain arrives at 10:00 active simulation time. Its destruction is Victory; losing all viable income routes without funds for a Miner is Bankruptcy.

For the exact benchmark policy, run:

```sh
npm run roguelite:playtest -- 7 42 1337
npm run roguelite:playtest -- --reckless 7
```

The balanced policy checks purchases once per simulated second, replaces the last Miner first, builds to two Miners and then Fighters, and buys a Slot when it can also retain 20 Credits. Tech priority is Twin Guns, Escort Drones, Nanite Delivery, Kinetic Ram, Chain Shatter, Magnetic Collection, Reactive Hull, Emergency Retreat, Cargo Relay, Salvage Bonus, Scout Echo, Overdrive. The unprotected policy buys only Miners with the same available Tech priority. These are real zero-grant simulations using exactly the player purchase and draft APIs, physical extraction/delivery, damage, repairs and replacement rules.

## Implemented systems

- `roguelite.ts`: independent seeded run ownership, economy, hull ledger, Tech, director, result decisions and save serialization. Original physical mining/claims/cargo, pathfinding, fog, flight and combat are reused from `sim.ts`.
- `sim.ts`: opt-in continuous-world flag bypasses shift transitions and settlement; independent physical return/unload/repair/redeployment. Fighters retreat to HQ and spend time repairing instead of being replaced for free. Classic worlds omit the flag and retain their existing loop.
- Three complete hulls: Miner 20, Scout 30, Fighter 55 Credits. Starting Miner free once. Slots 2–6 cost 20/50/125/300/700. Each model keeps its immutable specialization; there is no free hull conversion. Future Hauler (40/1 Slot) and Rig (100/2 Slots) are centrally catalogued but unavailable in this pass.
- Tech is uncovered as a unique physical cache in an excavated asteroid area, carried by a Miner or Scout, and delivered at HQ. A destroyed carrier loses it. Ordinary mineral transfers never grant Tech. Drafts contain three upgrades eligible for the current hulls; if unique options run low, Nanite Delivery, Cargo Relay and Reactive Hull offer functional additional levels and stop the entire simulation.
- Twelve functional upgrades: Chain Shatter, Magnetic Collection, Kinetic Ram, Nanite Delivery, Emergency Retreat, Fighter Twin Guns, Escort Drones, Cargo Relay, Scout Echo, Overdrive, Salvage Bonus and Reactive Hull. Effects include real secondary mining, collection attraction, faster repair/return, extra damaging guns/defenders, sensor coverage, a durability tradeoff, physical enemy salvage, and defensive damage. Mining lasers retain their mining-only behavior.
- Fixed-stat Pirate Mk I (one laser), Pirate Mk II (two hardpoints and two damaging shots), visibly armored Marauder, and twin-cannon Siege Captain. Time grows a bounded active population budget; progress unlocks the stronger mixture. No enemy-stat multipliers. Spawn locations are outside HQ and at least 220 world units from living hulls; attacks use existing warning/acquisition and line of sight. Active enemies are capped at ten including the boss.
- Responsive English UI with Credits, owned/used capacity, fixed prices, trailing-minute income, time/threat, per-hull health/job, repair rings, Tech cargo markers, focus and autonomous orders, pan/pinch/zoom, pause, 1×/2×, seed copy, run menu and final statistics. Draft/result dialogs support keyboard focus trapping.
- Save key `aisteroids-roguelite-pass01-v1` preserves full physical state, cargo, RNG, discoveries, choices, director, repairs and results. Continue starts paused; hidden tabs and closed sessions award no time, combat or income. Run saves never migrate or write Classic data.

## Measured runs

Seconds are active simulation time, not time spent reading drafts. Raw summaries are in `roguelite-playtests.json`.

| Seed / policy | Result | First Tech | Second hull | First loss | Captain | End / stop | Delivered Credits | Credits/min | Hulls lost |
| --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: |
| 7 / balanced | Victory | 0:38.8 | 2:58.0 | none | 10:00 | 10:51.1 | 378 | 34.84 | 0 |
| 42 / balanced | Bankruptcy | 0:30.9 | 2:05.0 | 7:52.3 | 10:00 | 11:42.4 | 410 | 35.03 | 6 |
| 1337 / balanced | Bankruptcy | 0:39.0 | 4:31.0 | 4:30.4 | not reached | 4:43.2 | 34 | 7.20 | 2 |
| 7 / unprotected mining | Still running at limit | 0:38.8 | 2:58.0 | 11:16.7 | 10:00 | 15:00 | 511 | 34.07 | 8 |

The same seed wins at 10:51 with combat purchases; the unprotected fleet has eight losses and has not defeated the Captain by 15:00. Seed 42 demonstrates a full 11-minute failure with paid replacements, while seed 1337 exposes a much harsher early income path. This is a balance limitation, not a guaranteed 10-minute survival promise. Enemy stats are identical across all runs.

## Validation

- `npm test`: 126 passing tests: original 106 regressions plus 20 new rogue regressions; no unrelated coverage removed.
- `npm run build`: strict TypeScript check and Vite production build pass.
- `npm run balance:smoke`: all six existing nickel/Hauler scenarios pass.
- `npm run performance`: 12 alternating routes, 93 ms total; six-ship/240-fragment fixture, 900 steps, p95 10.99 ms, p99 22.17 ms, worst 62.4 ms on this shared test environment. This is the existing stressed Classic fixture, not a phone measurement.
- Headless Chromium: mobile 390×844 has no horizontal overflow; desktop 1280×800 verified. Checked new run, normal pause, Save & Menu, reload/Continue paused, Tech modal/clock freeze and choice, live battle, Victory, restart, and Classic menu. A valid Classic save remained byte-for-byte unchanged. No JavaScript errors. Sampled live multi-hull battle frame median/p95 about 16.7/16.8 ms. This is a desktop headless frame-pacing check, not a physical-device guarantee.
- New deterministic tests cover starter/replacement prices, permanent capacity, immutable hulls, physical income, timed repair, Tech delivery/loss/unique choice, fixed enemy stats, real twin projectiles and damage, bankruptcy and rescuing pending deposits, paused/inactive/save-resume clocks, restored cargo, Victory/restart, eligible drafts, actual mining cascades and all upgrade categories, and the bounded enemy population.

## Preview, simplifications and next pass

A [private isolated phone preview](https://aisteroids-roguelite-pass01-2026.etteventuppsala.chatgpt.site/?roguelite) was deployed from the gameplay commit `acc6715`. Open it using the same ChatGPT account. The Classic GitHub Pages deployment was not triggered. The branch also builds and runs locally using the steps above; the draft PR is the review entry point.

Pass 01 intentionally has one local seeded belt around HQ, three purchasable hull types, up to eight unique caches, and no outpost expansion, Hauler/Rig gameplay, meta progression or offline earnings. The local belt reuses seeded deposit geometry but tunes finite Ferrite reserves for a single continuous run. Dock repair is free in Credits and costs real time, so it does not create an unpayable repair deadlock. Existing AI decision caches are recomputed on load, so exact trajectories can vary slightly; physical ledgers, RNG, clocks and run ownership persist without catch-up.

Known limitations: seed-dependent opening income is still uneven; purely defensive builds can prolong a run beyond 15 minutes; target selection is a shared mining/survey focus rather than a separate Fighter attack command. A real Android/iOS device and background/resume cycle should be playtested next. Tune income/raid timing across more seeds, make Fighter retreat and enemy telegraphs clearer in crowded fights, then evaluate Hauler/Rig before any merge decision.
