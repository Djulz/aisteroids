# AIsteroid Mining · Alpha 0.1.0
Mobile-first autonomous mining game. Persistent company, 60-second shifts, a fleet of up to six drones, scanner and blaster research. Strict overhead industrial art rendered natively in Canvas 2D.

## Run
Node 24 recommended.
```
npm ci
npm run dev
npm test
npm run build
```
Open the Vite URL ending in `/aisteroids/`.

## Design
- Unresearched drones wander and ram rocks. All drones can collect nearby mineral chips and find home.
- 12 units cargo capacity. Loaded drones deliver and return to work.
- Every mining hit produces four units of mineral. Only delivered cargo earns currency.
- After 60 simulation seconds all drones return. Pause and 2× speed supported; backgrounding pauses.
- Hull, technology and roster persist; damaged/destroyed drones repair free after each mission.
- Extra drone: 45, then +35 per owned drone. Scanner: 60. Blaster: 160. Technology applies fleet-wide.
- Storage: versioned validated localStorage, saved on purchases and settlement. Aborted/reloaded missions award nothing. No backend or account.
- No enemies, escorts, active abilities or additional resources in this MVP.

## Structure
`src/sim.ts`: seeded fixed-step simulation, no browser dependencies.
`src/render.ts`: Canvas industrial sprites and effects.
`src/main.ts`: UI, mission lifecycle and input.
`src/storage.ts`: save validation.
`tests/`: deterministic behavioral checks and balance sampling.

## Publishing
Workflow builds/tests `main` and deploys `dist` to GitHub Pages. Repository Settings → Pages must use **GitHub Actions** if automatic enablement is unavailable. Expected URL: https://djulz.github.io/aisteroids/

Art is original code-generated geometry. Fonts: locally bundled Barlow / Barlow Condensed (SIL Open Font License), with system fallbacks. No generated-image dependency or external gameplay assets.
