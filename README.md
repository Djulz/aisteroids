# AIsteroid Mining · Alpha 0.7.2

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
- Rock positions and remaining health persist across completed shifts. Rocks take many impacts to destroy and never regenerate. Loose minerals, including cargo dropped by destroyed drones, also remain on the map for later collection. Miners ignore ore that cannot fit in their remaining cargo and return to unload when nothing collectable remains. A mission abort rolls back its changes.
- The first trip can fund a second drone (10 minerals) or Reinforced Hull (10). Further miners cost 30, 70, 140, 240. The 30 mineral Asteroid Scanner reveals rich deposits, remaining field resources and exploration directives. Miners already seek nearby asteroids without it. Mining Laser costs 80 and equips every miner.
- Deliver a rich sample to unlock Expanded Cargo (120), Deep Prospecting (130, requires Scanner) and Ion Drive (160). A ram produces four minerals from an ordinary deposit or eight from a rich one; a laser pulse produces one or two respectively and cannot hurt enemies. Asteroids have four times as much integrity as before, preserving the total recoverable ore per rock.
- A rival scout appears after a rich sample is delivered. It chases miners across the whole map, including near HQ and during recall, and destroys a basic miner in three clear shots. Once encountered, the fixed HQ Turret (90) or mobile Bodyguard Drones (180, then 280) can defend the fleet. Escorts can be destroyed by concentrated scout fire. Survey the Outer Reach site to unlock the Outer Outpost (300), then select the launch and unloading location for the next shift.
- Discoveries and unlocks depend on exploration and actions in the world, never the number of missions played. Survey directives give the fleet a priority between shifts; after completion they revert to free mining.

## Shift rules

- Early drones seek work immediately, but still wobble and headbutt. A ram requires a fresh approach, knocks the miner away and costs one hull point. Basic hull survives three impacts; reinforced hull survives six. Return navigation and physical rock collisions also work with full cargo.
- Cargo holds 12 minerals, or 18 with Expanded Cargo. Full miners return, pause beside the station while cargo particles fly in, then resume. Delivered minerals fund purchases. Free repairs restore the persistent fleet between shifts.
- Mining lasers hold a position away from the asteroid surface while extracted ore flies back to the miner. Six miners can dock at the Outpost without blocked berths.
- After 45 seconds surviving drones are recalled; return can take longer. Pause and 2× speed are available. Backgrounding pauses the simulation.
- When every miner is destroyed, the wreckage remains visible briefly. All completed shifts show an on-map debrief with delivered and extracted minerals, rich ore, losses, discoveries and salvage before the player returns to the workshop.
- Save version 5 uses browser localStorage. Existing v1–v4 companies retain their money, roster, purchases and persistent deposit depletion when migrating. There is no backend account sync.

## Structure

- `src/sim.ts`: deterministic fixed-step simulation and progression.
- `src/navigation.ts`: obstacle-aware routing and visibility checks.
- `src/render.ts`: Canvas sprites, map and effects.
- `src/main.ts`: workshop, mission UI and camera controls.
- `src/storage.ts`: save validation and migration.
- `tests/`: simulation, persistence, economy, navigation and camera checks.

Artwork is original code-generated geometry. Bundled Barlow and Barlow Condensed fonts use the SIL Open Font License.

Each Pages build runs the automated tests before publication.
