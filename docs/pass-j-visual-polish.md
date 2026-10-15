# Pass J · motion and biome readability

Alpha 0.20.0 is a visual-only pass. The approved Pass H ship shapes and Pass G full-screen mission layout remain intact. `src/trails.ts` holds bounded, transient presentation state keyed by each `World` in `src/render.ts`; it never enters the simulation, saves, AI, or RNG. Active miners, working Haulers, live Escorts, flying Scouts and currently visible enemy Scouts contribute world-coordinate samples. A source disappears on docking, death or loss of enemy visibility, which removes its puffs. Mission changes use a fresh WeakMap entry. Clock rewind, a large time gap or a teleport clears stale history.

| Ship | Rear offset | Square | Spacing | Color |
| --- | ---: | ---: | ---: | --- |
| Miner / Laser Miner | 20 units | 2.8 units | 8 units | muted cool off-white |
| Scout | 17 | 2.3 | 10 | pale blue-gray |
| Escort | 18 | 2.5 | 8 | pale cyan-gray |
| Hauler | 21 | 3.4 | 9 | subdued cyan-gray |
| Enemy Scout | 16 | 2.5 | 9 | muted coral |

Only actual center movement emits a square. Sampling interpolates the rear of a turning ship; existing squares remain at their old world positions. The rear offsets clear the small existing engine flame even when the ship turns. Squares live at most 0.46 simulated seconds, with alpha fading from 0.68. Each ship retains at most four and the mission retains at most 220. Pausing also freezes the trail, while a 2× mission advances its trail at 2× simulated time. The gallery shows stationary and moving samples near world-unit scale.

`src/art.ts` keeps one drawing function for all five stone palettes. `biomeAt(rock.x, rock.y)` selects a palette once per rock object in `src/render.ts`. Craters and outlines coordinate with its fill; Home Belt keeps its original `#34434e` body. The other body colors are Scrap Fields `#46453f`, Contested Territory `#423c48`, Ion Storm `#39435a`, and Dead Zone `#3c473e`. None uses technology teal. Stable polygon, crater and inclusion geometry is independent of biome, with small inclusions cached per rock/tier. T1 remains neutral; revealed rich T2 is pale warm sage `#b4b29a`, distinct from technology teal. T3 amber, T4 ice-blue and T5 violet stay gallery-only art. Rich visibility still uses the established `farSurveyed` gate; stone tint does not change yield or survey status.

The existing impact hit ring is shortened and accompanied by three tiny square chips. Ore pickup, station transfer, laser, POI and all simulation effects remain otherwise unchanged. The direct `?assetGallery=1` route now shows moving exhaust, a same-ID five-biome T1/T2 matrix, the five mineral art motifs and original ship/POI samples. It has no navigation from the live game and neither reads nor writes company data.

## Verification

`npm test` checks palette coverage, unchanged common/rich selection and inclusion layout, trail aging, rear placement, cap, mission reset, invisible enemy removal and independent simulation RNG. `npm run biomes` repeats the seeded Pass I fixture; the fresh company still delivers 11 Minerals and a Miner plus Scout charts 1,325 cells. `npm run balance` measures the established first-shift economic baseline. `npm run build` type-checks the gallery and production bundle.

In the public gallery the original Hauler and Miner silhouettes remain distinct, the moving samples have separated rear squares, and the five stone palettes retain contrast on the dark test background. The five-column matrix fits within the gallery's 400 CSS-pixel maximum width after reducing cell width to 72 CSS pixels. In the public game a fresh Miner shift showed the small two-value HUD, a functioning 1×/2× toggle, physical motion near HQ, a final report with 11 delivered Minerals and zero losses, and the same 11 Minerals after returning and reloading. The gallery and mission were captured as QA screenshots for the delivery report. Physical Android hardware and an exact 360–400 CSS-pixel viewport were not available to this workspace; those observations are from a desktop cloud browser at 1363 CSS pixels wide.
