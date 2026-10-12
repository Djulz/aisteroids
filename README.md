# AIsteroid Mining · Alpha 0.3.0
Mobile-first autonomous mining game. Persistent company, 45-second shifts, up to six drones, fleet-wide hull, scanner and mining laser upgrades. Strict overhead industrial art rendered in Canvas 2D. English UI.

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
- Each hit releases 4 minerals; cargo holds 12. Full drones return, unload, then resume mining.
- Cargo and recall use grid routes with line-of-sight smoothing. Physical asteroid collisions apply in every active state. Only mining impacts damage the hull.
- At 45 seconds all survivors return with cargo; this can take a few extra seconds. Missions finish early when all drones are destroyed or docked.
- Only delivered minerals are banked. Destroyed drones lose carried cargo. Repairs are free and the roster persists.
- Additional drones cost 10, 20, 30, 40, 50. Reinforced Hull: 10. Asteroid Scanner: 30. Mining Laser: 40. Technology applies to the entire fleet.
- Scanner chooses nearby asteroids. Mining Laser is asteroid-only extraction, not a combat weapon.
- Pause and 2× speed supported. Backgrounding pauses the mission.
- Versioned localStorage preserves existing v1 companies and migrates Blaster ownership to Mining Laser. Old mineral balances are preserved, not rebased. Reset Company allows testing the new early progression.
- No enemies, escorts, active abilities or additional resources in this pass.

## Structure
`src/sim.ts`: seeded fixed-step simulation, no browser dependencies.
`src/navigation.ts`: obstacle-aware route planning and exact segment checks.
`src/render.ts`: Canvas industrial sprites and effects.
`src/main.ts`: UI, mission lifecycle and input.
`src/storage.ts`: save validation and v1 → v2 migration.
`tests/`: impact, hull, routing, recall, economy, migration and fleet simulation regressions.

## Publishing
GitHub Actions tests/builds `main` and deploys `dist` to GitHub Pages.
https://djulz.github.io/aisteroids/

Art is original code-generated geometry. Fonts: bundled Barlow / Barlow Condensed (SIL Open Font License). No external gameplay assets or backend.

## Larger-map camera test (0.3.0)
800 × 930 world (three original screen areas), with home and outer asteroid clusters. Fleet follow pans smoothly; drag with touch or mouse for manual exploration, use Overview for the whole field and +/− for zoom. Follow fleet resumes tracking. A small radar shows drones, home and the current viewport. Controls and selection use camera-transformed coordinates. The camera never changes simulation state. The 45-second shift, economy, saves and upgrades remain; return travel can take longer with greater distances. No outposts, combat, persistent depletion or new sectors yet.
