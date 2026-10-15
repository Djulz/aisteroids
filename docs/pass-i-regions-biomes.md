# Pass I · regions, environment, and autonomous scouting

Alpha 0.19.0 keeps the 2600 × 2400 world, its 168 stable rock IDs, five investigation sites, Pass H art, and the Pass G compact mission interface. `src/biomes.ts` is the single deterministic spatial registry. Gently warped anchor boundaries cover every coordinate; distance is not a rank. A cached 130 × 120 Canvas background blends color across about 100 world units, and sparse inert marks sit behind entities. The existing charted-cell Fog mask covers all region color and texture in unknown territory. Charted rocks and loose ore remain fully drawn; hostiles still need live sensor contact. Biome tiers do not change asteroid value or enable the future T3–T5 art tiers.

| Region | Area effect | Equipment |
| --- | --- | --- |
| Home Belt | Safe starter territory | None |
| Scrap Fields | Muted salvage ambience and existing logistics sites | None |
| Contested Territory | One local rival Scout patrol; senses nearby units and returns toward its territory | Escorts can defend |
| Ion Storm | Mobile sensors ×0.60 and speed ×0.82 | Navigation Stabilizers: ×0.90 and ×0.95 |
| Dead Zone | 0.5 HP per simulated second | Radiation Shielding: 0.06 HP per second |

HQ and purchased Outpost have 155/165-unit safe harbor radii. The unbuilt Outpost site lies close to the Ion frontier and remains surveyable. The regional patrol replaces the older rich-sample-triggered wave, rather than adding a second spawn source. It is deliberately absent from an ordinary first Home Belt shift. First Rival Contact is still reachable by an autonomously exploring Scout; it awards its original one-time Tech Point.

Scouts periodically score uncharted frontiers by coverage, travel, peer duplication, observed region risk and optional player focus. They consult only charted biome information and currently visible hostiles. A Scout entering the Dead Zone without shielding retreats on low hull; this cannot guarantee survival from deep exposure. Miners prefer comparable safer known rocks and Haulers with low hull avoid knowingly dangerous ore. All ships derive Ion effects from their base stats on each step, without permanent speed changes. Mining, physical hauling, cargo claims, one-chip Minerals, docking, damage and research rules are unchanged.

A tap on a charted empty area or its immediate unknown edge opens a small **Focus Scouting** sheet. POI tap has priority and still opens **Lock Target** for an Escort. The small focus chip appears only while a focus is active and clears it; clicking a new area replaces it. Pan and pinch gestures do not issue orders. Scout focus and Escort target are independent World fields, reset on Deploy and cleared at recall or loss. Neither is saved.

Workshop shows each upgrade only after its existing POI has been physically investigated. Advanced Sensors costs 125 Minerals after Abandoned Cargo Relay and increases Scout scan radius by 20%. Navigation Stabilizers costs 240 after Experimental Probe. Radiation Shielding costs 350 after Derelict Freight Shuttle. Blueprint discovery grants no extra Tech and no free installation. Existing nine Tech sources still fund the original Research tree.

The v12 save adds a validated unique `environmentUpgrades` list. Migration from valid v11 retains the 104 × 96 bitset unchanged, Endurance, Outpost selection, all world resources, fleet, Tech ledger and legacy doctrine. Investigated prerequisites unlock their respective Workshop rows even when carried from v11. Invalid upgrade IDs, duplicates or ownership without investigation reject a malformed v12 company through existing safe recovery. Unrelated localStorage keys remain untouched. The existing v7–v10 conversion remains available.

## Reproducible checks

`npm test` includes geometry, Fog eligibility, simulation exposure, equipment, blueprint purchases, mission-order independence, local patrol safety and v11 migration. `npm run biomes` reports fixed-step coverage by region, matched Scout autonomy/focus, a fresh Home Belt shift, remote Outpost fixture and controlled radiation exposures. `npm run frontier` separately exercises a purchase-driven Outpost campaign. Fixture grants are for isolated measurement, never game progression.

The seed-7 biome fixture delivers 11 Minerals from a fresh 30-second Miner shift with zero hostile shots; a Miner plus Scout charts 1,325 cells and delivers 11. Matched 90-second autonomous/focused Scouts chart 2,354/2,308 cells, with 984/1,035 Scrap cells respectively; focus changes priorities rather than promising a greater global total. A remote Outpost fixture delivers 18 and docks without recall failures. A controlled Scout placed deep in the Dead Zone finishes 20 simulated seconds with 0.5 HP after retreat versus 4.8 HP with Shielding. These are scenario observations, not economic grants.

The separate purchase-driven seed-7 campaign investigates the Abandoned Cargo Relay on round 20 and buys Advanced Sensors with earned Minerals on round 24. The Pass F frontier policy surveys the Outpost on round 20, buys it on round 59 and physically unloads 12 Minerals on a following 90-second launch with no recall failures. Its old Pass F remote-launch measurement was 42 Minerals after round 78; this is a meaningful regional travel/selection cost, and the campaign did not buy Navigation Stabilizers. The first-shift ten-seed Impact mean from `npm run balance` remains 9.9 Minerals. The 30/45/60/90-second fixed-step scenarios and other legacy benchmark values are reported by their scripts.
