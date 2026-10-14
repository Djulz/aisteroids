# Pass F · Frontier and longer expeditions

## World and progression

The field is 2600 × 2400, divided into 104 × 96 exploration cells of 25 world units. HQ remains at (200, 550). The Outer Outpost site is (1900, 1620) and costs 450 Minerals after survey. The five investigation signals are distributed from (830, 300) to (2240, 2070). The research station moved from the draft coordinate (740, 300) to (830, 300) because the former collided with a legacy rock. All five sites and the Outpost have clear physical footprints in seeds 1, 3, 7 and 10. The original rock IDs 0–29 retain their geometry, and six seeded clusters add 138 rocks with IDs 30–167.

Shift Endurance is a sequential Workshop purchase: 30 → 45 seconds for 75 Minerals, then 60 for 180, then 90 for 400. A new save or migrated old save starts at 30 seconds. The Scout cruises at 85 units/second, avoids threats at 105 and has sensor radius 165. A mined or charted rock and loose ore remain drawn in the field and radar after live sensors leave; enemy ships still require live visibility. The camera overview fits charted territory and the radar can be tapped to navigate the wide map.

## Fixed-step measurements

`npm run frontier` runs a fresh seed-7 Miner + Scout at each tier, with Miner hull raised solely in these isolated navigation trials to remove enemy deaths. Each Scout physically docks; no recall failures occur.

| Work time | Charted cells / 9,984 | Delivered | Completion including return |
| ---: | ---: | ---: | ---: |
| 30 s | 1,086 | 11 | 44.3 s |
| 45 s | 1,607 | 15 | 70.7 s |
| 60 s | 2,858 | 21 | 87.1 s |
| 90 s | 3,226 | 30 | 98.3 s |

The same script also runs an actual persistent campaign from zero credits, buying two Miners, a Scout, an Escort, the duration tiers and finally the Outpost when affordable. It locks the discovered research station only while an Escort is deployed. First distant signal: round 11; Outpost survey: round 32; investigation settled: round 34. Purchases: second Miner round 3, Scout slot 9, 45 seconds 17, Escort slot 33, 60 seconds 42, 90 seconds 60, and Outpost 78. By round 78 the chart covers 9,963 cells, with 22 Minerals left. A subsequent 90-second Outpost launch starts at (1900, 1620), delivers 42 Minerals, and has zero recall failures. This is one seeded purchase policy, not an optimal-play claim.

The Pass D ten-seed starting Impact Miner average remains 9.9 Minerals per 30-second shift after expansion. `npm run explore` retains equal-slot comparisons; on seeds 1, 3 and 7, two Miners average 20.7 delivered and 186 cells, while Miner + Scout average 10 delivered and 1,131 cells in fresh 30-second shifts. Income trades off against exploration. A Scout alone cannot keep a mission active after the last Miner is destroyed; the existing completed-loss rule applies. On ordinary completed shifts, return is physical, with no forced dock timer.

## Save and checks

v11 preserves validated v7–v10 balances, rounds, fleet, doctrine, Tech, infrastructure, old rock HP, loose ore and known signals. v10's 32 × 38 bitset maps each set coordinate into the new 104 × 96 grid, then adds current footprints for owned Outposts and known sites. The new region starts unknown. Endurance begins at level zero, and a live target never persists. Malformed bitsets, impossible rock HP and invalid fleet/Tech ledgers are rejected. Abort retains the previous company state.

`npm test` checks the 168-rock geometry, upgrade prices and serialization, exact v10 cell coordinates, persistent Scout charting and physical return at every tier, and field artwork for known versus unknown resources alongside the earlier regression suite. `npm run build`, `npm run balance`, `npm run explore`, and `npm run frontier` provide the build and simulation checks.
