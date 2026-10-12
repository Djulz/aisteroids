# AIsteroid Mining · Alpha 0.5.0
Mobile-first autonomous mining game. Persistent company, 45-second shifts, up to six miners, richer outer deposits, rival scouts, bodyguards and an optional remote outpost. Strict overhead industrial art rendered in Canvas 2D. English UI.

## Run
Node 24 recommended.
```
npm ci
npm run dev
npm test
npm run build
```
Open the Vite URL ending in `/aisteroids/`.

## Current rules
- Unresearched drones wander, oversteer and ram rocks. Baseline collection and return navigation remain reliable.
- A mining impact requires an armed drone approaching faster than 30 world units/second. Impact causes a 145-unit/second outward impulse and 0.55 seconds without motor control. Another impact requires leaving the contact area and a new approach; stationary contact never ticks damage.
- Basic hull survives 3 impacts and breaks on the 4th. Reinforced hull survives 6 and breaks on the 7th.
- Ordinary hits release 4 minerals; rich outer deposits release 8. Standard cargo holds 12, or 18 with Expanded Cargo. Full drones return, unload, then resume mining.
- Cargo and recall use grid routes with line-of-sight smoothing. Physical asteroid collisions apply in every active state. Only mining impacts damage the hull.
- At 45 seconds all survivors return with cargo; this can take a few extra seconds. Missions finish early when all drones are destroyed or docked.
- Only delivered minerals are banked. Destroyed drones lose carried cargo. Repairs are free and the roster persists.
- Additional drones cost 10, 20, 30, 40, 50. Reinforced Hull: 10. Asteroid Scanner: 30. Mining Laser: 40. Technology applies to the entire fleet.
- Scanner chooses nearby asteroids. Mining Laser is asteroid-only extraction, not a combat weapon.
- Pause and 2× speed supported. Backgrounding pauses the mission.
- Versioned localStorage preserves existing v1 and v2 companies and migrates Blaster ownership to Mining Laser. Old mineral balances are preserved, not rebased. Reset Company allows testing the new early progression.
- The opening remains unopposed. Far belt resources and later competition unlock through mission milestones.

## Structure
`src/sim.ts`: seeded fixed-step simulation, no browser dependencies.
`src/navigation.ts`: obstacle-aware route planning and exact segment checks.
`src/render.ts`: Canvas industrial sprites and effects.
`src/main.ts`: UI, mission lifecycle and input.
`src/storage.ts`: save validation and v1/v2 → v3 migration.
`tests/`: impact, hull, routing, recall, economy, migration and fleet simulation regressions.

## Publishing
GitHub Actions tests/builds `main` and deploys `dist` to GitHub Pages.
https://djulz.github.io/aisteroids/

Art is original code-generated geometry. Fonts: bundled Barlow / Barlow Condensed (SIL Open Font License). No external gameplay assets or backend.

## Larger-map camera test (0.3.0)
800 × 930 world (three original screen areas), with home and outer asteroid clusters. Fleet follow pans smoothly; drag with touch or mouse for manual exploration, use Overview for the whole field and +/− for zoom. Follow fleet resumes tracking. A small radar shows drones, home and the current viewport. Controls and selection use camera-transformed coordinates. The camera never changes simulation state. The 45-second shift, economy, saves and upgrades remain; return travel can take longer with greater distances. No outposts, combat, persistent depletion or new sectors yet.

## Mining feedback and docking (0.4.0)
The field fills the mission width with an aspect-correct responsive camera. Drones brake at individual berths beside HQ, hold still while cargo particles travel into the station, and resume from the same position and heading. Minerals are credited on arrival; recall waits for unloading to finish. Mining adds a brief asteroid flash, impact displacement, expanding rings and debris. Ore visuals fan out from the rock center with exponential deceleration toward their collectible positions; presentation does not consume simulation randomness.

## Expanding company (0.5.0)
Mission 4 opens richer deposits across the far belt. Their teal cores yield 8 minerals per impact rather than 4; the player can buy Expanded Cargo (18 units, 60 minerals), Deep Prospecting (prioritizes rich rocks, requires Scanner, 90), and later Ion Drive (fleet travel +35%, 110). Mission 6 introduces a rival scout that fires at miners; mining lasers remain mining equipment. After this first encounter the company can purchase up to two autonomous Bodyguard Drones (100, then 160), which follow threatened miners and fire at scouts. A second scout arrives later in advanced missions. After mission 8 the Outer Outpost (220) unlocks; the player selects HQ or the remote outpost as the next launch and unloading site. Milestones and incoming rivals appear in the workshop and mission status. Existing v1 and v2 saves migrate to v3 without losing purchases, credits, or rounds.
