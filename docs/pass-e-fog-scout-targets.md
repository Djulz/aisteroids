# Pass E · Fog, Scout and live target orders

## What changed

Every deployment starts Mine Freely. Mission Control keeps doctrine, Workshop, Hangar, Research and the built HQ/Outpost launch location; the pre-Deploy objective picker and omniscient scanner are gone. During a mission, a discovered signal can be ignored or tapped to Lock Target. One living Escort diverts to it and must physically arrive and dwell for 1.25 simulation seconds. Miners and Haulers continue their usual jobs. Clear Target, recall and Escort loss cancel incomplete work; a completed interaction queues the existing one-time Tech event for settlement. Discovering a site or merely pressing Lock Target grants no Tech.

The 800 × 930 world has a 25-unit, 1,216-cell exploration bitset. HQ and a built Outpost sense 115 units; Miners 90, Haulers 78, Escorts 100 and Scouts 165. Live visibility is recalculated on fixed six-step intervals. Explored cells and identified POIs settle into Company; current visibility and active target do not. Unknown rocks, enemy ships, cargo and signals are hidden from the field, radar and target picker. Miners use visible or charted rocks, and prospect unknown frontiers during occasional shifts. Only actual sensor contact can identify a POI. Scouts have 6 HP, travel about 125 units/second, carry no cargo or weapon, consume a purchased slot, and recall physically.

## Reproducible measurements

Run `npm run explore` for the following fixed-step simulation data. The first table compares equal two-slot fleets over seeds 1, 3 and 7 on fresh persistent-field starts. Explored cells are out of 1,216; minerals are physically delivered after the 30-second work shift and recall.

| Fleet | Delivered mean | Explored cells mean | Signals found mean |
| --- | ---: | ---: | ---: |
| 2 Impact Miners | 20.3 | 182.3 | 1.3 |
| 1 Impact Miner + 1 Scout | 10.3 | 1,062.0 | 3.3 |

The Scout has a substantial opportunity cost: about ten fewer Minerals per matched shift, but approximately 5.8 times the mapped area and two additional signals. All three sampled Scouts docked by roughly 33–34 simulated seconds. A Scout can map about 87% of this initial field in one shift, which is quite fast; later playtesting may call for more territory or a narrower sensor, without changing Pass D extraction values.

In a real 35-shift Mine Freely progression from one fresh Impact Miner with no purchases, the second slot became affordable at round 3. The Far Belt, first rich delivery and first rival contact were reached at round 5, and the Outpost Site was physically surveyed by round 25. With a Scout purchased in slot 2 at round 3, the Outpost survey happened in round 4. A separate actual-purchase path unlocked Escort Program and Hauler Operation using earned Tech, then assembled Miner + Scout + Escort + Hauler in four bought slots at round 33; its next mission delivered 13 Minerals with the Scout safely docked. Choosing three support roles slows slot purchases markedly relative to all-Miner fleets.

With Miner + Scout + Escort and the research station as the live target, the Scout detected the station at simulated 3.00 seconds; the Escort completed it at 5.50 seconds, 2.50 seconds after Lock Target. This leaves ample time within a 30-second work phase for a player to react to early discoveries. Later and more distant signals may require a subsequent mission; discovered identity survives until then.

## Pass D comparison and locked values

The full `npm run balance` run used ten fresh seeds for each one-Miner doctrine. Minor yield differences follow the new exploration and target selection, without changing extraction or combat constants.

| One-Miner doctrine | Pass D delivered mean | Pass E delivered mean | Pass E median |
| --- | ---: | ---: | ---: |
| Impact | 9.9 | 10.1 | 10 |
| Impact Recovery | 10.6 | 10.4 | 11 |
| Laser | 11.9 | 11.5 | 12 |
| Rapid Cooling | 12.6 | 12.3 | 12 |

The active work phase remains 30 seconds, followed by real return and unload. Impact Miner HP 15, ram cooldown 1.0 seconds, two one-Mineral fragments per valid ram; Laser HP 10, pulse cooldown 2.0 seconds, one fragment; Rapid Cooling 1.6 seconds; Impact Recovery 0.65 seconds and 0.40 seconds recoil; rival hit damage 4 against Miners; Miner cargo 3 and Hauler cargo 10/14 are unchanged. Slots 2–6 remain priced 28, 58, 155, 340 and 480. The shared ore claim registry remains transient, exclusive and deterministic.

## Migration and boundaries

Saves use `aisteroids-company-v10`. Valid v9, v8 and v7 companies retain funds, missions, slots, existing fleet mix, research ledger, investigated sites, rock HP, loose ore, infrastructure, doctrine and world seed. Scout count starts at zero for old fleets; legacy objective is discarded. Map memory is seeded only around HQ, owned Outpost and genuinely known milestones/sites. An already investigated site never awards twice. Compact bitset length, POI identity, fleet counts and Tech budgets are validated. Abort commits no new map cells, signals, depletion, ore or Tech; a completed mission, including a completed loss, does.

No new Tech source, resource denomination, fleet slot or direct drone control was added. The first Scout is useful after buying the second slot, while a Miner-only path remains viable but explores distant locations much more slowly. The outpost survey is a real sensor scan by a physically present unit, with a 15-unit grid-edge tolerance. The published 480-pixel shell was visually checked in a browser, including the fog, radar, signal sheet and mission report. The 320-pixel CSS rules were inspected, but a real 320-pixel viewport could not be exercised in this browser environment; that visual check remains for device testing. Exact visual polish and longer-range frontier selection remain candidates for playtesting.
