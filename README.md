# AIsteroid Mining · Alpha 0.10.0

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
- Mining lasers hold a position away from the asteroid surface and face it while firing. Extracted fragments fly in varied directions from the rock, remain unavailable for pickup for 0.55 seconds, and are then collected by miners. The HQ and Outer Outpost share ring-shaped docking geometry: returning miners reserve the nearest free, rock-clear berth and release it when departing. Six miners can still dock at either station.
- After 45 seconds surviving drones are recalled; return can take longer. Pause and 2× speed are available. Backgrounding pauses the simulation.
- When every miner is destroyed, the wreckage remains visible briefly. All completed shifts show an on-map debrief with delivered and extracted minerals, rich ore, losses, discoveries and salvage before the player returns to the workshop.
- Mission Control has Workshop and Hangar tabs. Workshop purchases still use the same progression, prices and effects. Hangar displays one stable record for each purchased unit. Editing opens a focused Tinkering view with name, role, frame and two optional modules; Back discards the draft, Apply saves it. The first Extra Drone purchase unlocks frame and module engineering. The first Bodyguard purchase unlocks Escort reconfiguration and one simultaneously equipped Escort slot; purchased miner and Bodyguard counts continue to define roster size. At least one Miner must remain. Mission Plan beside Deploy holds objective, launch point and Scanner Intel.
- Mission Plan stays compact until an objective, Scanner, or Outpost is available. HQ and Free Mining are the starting defaults; purchased Scanner shows active deposit intel and exploration objectives, while the built Outpost allows HQ or Outer Reach launch and unloading. Completed or unavailable legacy objectives safely return to Free Mining. Careful Prospectors still weighs threats while surveying.
- Standard is the exact old frame baseline. Light has −1 hull and 18% quicker acceleration and turning; Heavy has +2 hull and 15% slower acceleration and turning. Miner modules: Impact Prow extracts up to five integrity points per ram (turning ×0.85); Kinetic Regulator shortens recoil and impact cooldown (cruise ×0.88); Extended Optics requires a purchased Mining Laser, extends standoff and firing range (pulse cooldown ×1.23); Emergency Thrusters accelerate real threat disengagement (cargo −3). Shared Reinforced Plating grants +1 hull (cruise ×0.89). Escort Targeting Computer favors threats near miners (blaster cooldown ×1.18); Long Barrel extends blaster range by 23% (cooldown ×1.20). The existing laser remains lower yield than ramming, and modules add no currencies or ownership rights.
- Fleet Doctrine is a free quick selection above Deploy. Standard Protocol follows the previous targeting and escort behavior. Full Contact Mining favors accessible, productive impacts and may ram despite owning lasers. Careful Prospectors weighs hostile positions, retreats when seriously threatened and uses a wider laser standoff. Convoy Protocol favors shared mining regions and focuses escorts on threats near miners. The selected doctrine is stored with the company, captured at deployment, and shown in the mission and report. No doctrine adds equipment or direct control.
- Save version 6 uses browser localStorage. Existing v1–v5 companies retain their money, names, roster, purchases and persistent deposit depletion; their equipment starts at Standard with empty slots. IDs remain tied to purchased entitlements even when roles switch. There is no backend account sync.

## Structure

- `src/sim.ts`: deterministic fixed-step simulation and progression.
- `src/doctrines.ts`: stable doctrine IDs, player-facing descriptions and centralized AI priorities.
- `src/mission-plan.ts`: progression-aware objectives and safe normalization of older survey directives.
- `src/engineering.ts`: typed frame and module registry, eligibility checks and per-drone capability resolver. Workshop ownership is applied first, then role, frame and modules; doctrine priorities are read by the existing AI at runtime. Multipliers combine deterministically; Standard with empty slots uses the previous values. There is no module inventory.
- `src/navigation.ts`: obstacle-aware routing and visibility checks.
- `src/render.ts`: Canvas sprites, map and effects.
- `src/fleet.ts`: individual identity normalization, stable IDs, loadout validation and name validation. Purchased counts remain the source of ownership and Escort capacity.
- `src/lobby.ts` and `src/mission-plan.ts`: Mission Control Workshop, Hangar editor, doctrine, mission objective and deploy summary.
- `src/main.ts`: lobby interactions, mission UI and camera controls.
- `src/storage.ts`: save validation and migration.
- `tests/`: simulation, persistence, economy, navigation and camera checks.

Artwork is original code-generated geometry. Bundled Barlow and Barlow Condensed fonts use the SIL Open Font License.

Each Pages build runs the automated tests before publication.
