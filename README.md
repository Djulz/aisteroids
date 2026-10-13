# AIsteroid Mining · Alpha 0.11.0

A mobile-first autonomous mining game. Configure a fleet between 45-second shifts, deploy, watch the drones work, and use delivered minerals for physical expansion. The deterministic 800 × 930 field, asteroid depletion, loose salvage and discoveries persist after a completed mission. Abort rolls that shift back.

## Run

Node 24 recommended.

```
npm ci
npm test
npm run build
npm run dev
```

Open the Vite URL ending in `/aisteroids/`. GitHub Pages publishes [the game](https://djulz.github.io/aisteroids/) after tests and build on `main`.

## Fleet and economy

- A new company starts with one slot, one Impact Miner and zero Minerals. Old v1–v6 saves are intentionally discarded under the new `aisteroids-company-v7` key; only this game's old company keys are removed. The new save persists normally.
- Every loose fragment is a separate one-Mineral item. A ram removes up to two rock integrity units and emits one fragment per unit. A Laser Miner shot removes one unit and emits one fragment. Rich origin marks discoveries but never multiplies a fragment's value. Fragments have a short pickup lockout and fly visibly from the rock. Cargo dropped on destruction remains as individual salvage.
- Every Miner carries exactly three fragments. At 2/3 cargo it may still ram, collect one of the two fragments, and leave the other on the field. A full Miner returns to the nearest free, rock-clear berth at HQ or the Outpost. Both stations use the same docking geometry.
- Workshop sells Fleet Slots (6, 12, 21, 33, 48 Minerals), HQ Turret (18 after rival contact), and Outer Outpost (38 after site discovery). Workshop has no stats, global Mining Laser, or individual Bodyguard purchases. Purchased slots do not spawn new units automatically.
- Hangar has count controls for Impact Miner and, after rival contact, Escort. Escort is temporarily unlocked by the encounter until Pass B establishes Research. Laser Miner already works in the simulator and deterministic developer fixtures, but remains locked to ordinary players until Research. Hauler and Mobile Mining Rig are future types with no deployable implementation.
- Mission Control keeps Workshop and Hangar as its two tabs. Fleet Doctrine and Mission Plan remain quick settings beside one-tap Deploy. Basic Scanner Intel and survey objectives appear after first Far Belt exploration, temporarily without a paid upgrade. Discoveries continue to drive rich sample, rival and Outpost progression.
- Standard, Full Contact, Careful and Convoy change targeting, risk and coordination. The miner type fixes its extraction method under every doctrine. The HQ turret and Escort preserve their defensive jobs. The current company reserves zero Tech Points and no Tech Points are awarded or displayed in this pass.

## Validation and balance

The fixed-seed early sweep in `tests/simulation.test.ts` runs complete shifts, including recall and delivery. Ten starting seeds yielded 3–4 delivered Minerals in a completed first mission, and the 6-Mineral Fleet Slot was affordable after two completed shifts. A one-Laser developer fixture delivered 5 Minerals in a matching seed while one Impact Miner delivered 3; the Laser is safer and is not yet a player unlock. The next balance pass should revisit their relative production once Research makes the Laser available. Impact recovery and pulse cadence were tuned without global percentage buffs.

Tests cover unit-valued ore, partial cargo, salvage, deaths, deterministic missions, fleet constraints, save reset, reload, doctrine behavior, Mission Plan, and progression. `npm test` and `npm run build` run in GitHub Actions before Pages deploys.

## Structure

- `src/sim.ts`: fixed-step world, mining, combat, docking and settlement.
- `src/fleet.ts`: one authoritative fleet capacity/composition model and type availability.
- `src/storage.ts`: new v7 save and game-only legacy key removal.
- `src/lobby.ts`, `src/main.ts`: compact Mission Control, fleet builder and mission presentation.
- `src/mission-plan.ts`, `src/doctrines.ts`: independent objectives and fleet behavior.
- `src/navigation.ts`, `src/render.ts`, `src/camera.ts`: routing, Canvas presentation and camera.

Pass B should implement unique discovery-based Tech Point awards, their in-game toast and result accounting, a functional Research Tree, and the actual Laser Miner unlock. The typed `unlockedTypes` field and type availability check are the connection points; Pass A does not award points or research unlocks.
