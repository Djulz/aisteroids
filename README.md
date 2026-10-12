# AIsteroid Mining · Alpha 0.6.0

Mobile-first autonomous asteroid mining game. Run a growing company in one persistent overhead world. Each shift lasts 45 seconds; between shifts, purchase fleet upgrades and choose a survey priority. The English interface and industrial artwork use Canvas 2D.

## Run

Node 24 recommended.

```
npm ci
npm run dev
npm test
npm run build
```

Open the Vite URL ending in `/aisteroids/`. Published at https://djulz.github.io/aisteroids/ through GitHub Actions on `main`.

## The world and progression

- The 800 × 930 field has a home pocket, a Far Belt with rich teal deposits, and an Outer Reach outpost site. Pan, zoom, follow the fleet, or show the whole map; the radar marks visible points of interest.
- Rock positions and remaining health persist across completed shifts. Rocks take many impacts to destroy and never regenerate. Loose minerals, including cargo dropped by destroyed drones, also remain on the map for later collection. A mission abort rolls back its changes.
- The first trip can fund a second drone (10 minerals) or Reinforced Hull (10). Asteroid Scanner costs 30 and Mining Laser costs 40. Scanner enables the Far Belt survey directive. Miner drones remain autonomous during a shift.
- Deliver a rich sample to unlock Expanded Cargo (60), Deep Prospecting (90, requires Scanner) and Ion Drive (110). Rich rocks yield eight minerals per impact; ordinary rocks yield four.
- A rival scout appears after a rich sample is delivered. Once encountered, autonomous Bodyguard Drones are available (100, then 160). Mining lasers extract ore and cannot shoot enemies. Survey the Outer Reach site to unlock the Outer Outpost (220), then select the launch and unloading location for the next shift.
- Discoveries and unlocks depend on exploration and actions in the world, never the number of missions played. Survey directives give the fleet a priority between shifts; after completion they revert to free mining.

## Shift rules

- Early drones wander and oversteer. A ram requires a fresh approach, knocks the miner away and costs one hull point. Basic hull survives three impacts; reinforced hull survives six. Return navigation and physical rock collisions also work with full cargo.
- Cargo holds 12 minerals, or 18 with Expanded Cargo. Full miners return, pause beside the station while cargo particles fly in, then resume. Delivered minerals fund purchases. Free repairs restore the persistent fleet between shifts.
- After 45 seconds surviving drones are recalled; return can take longer. Pause and 2× speed are available. Backgrounding pauses the simulation.
- Save version 4 uses browser localStorage. Existing v1, v2 and v3 companies retain their money, roster and purchased technology when migrating. There is no backend account sync.

## Structure

- `src/sim.ts`: deterministic fixed-step simulation and progression.
- `src/navigation.ts`: obstacle-aware routing and visibility checks.
- `src/render.ts`: Canvas sprites, map and effects.
- `src/main.ts`: workshop, mission UI and camera controls.
- `src/storage.ts`: save validation and migration.
- `tests/`: simulation, persistence, economy, navigation and camera checks.

Artwork is original code-generated geometry. Bundled Barlow and Barlow Condensed fonts use the SIL Open Font License.

Each Pages build runs the automated tests before publication.
