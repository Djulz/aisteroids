# Pass D balance: 30-second shifts and shared ore claims

Reproduce with `npm ci`, `npm test`, `npm run build`, and `npm run balance`. The latter runs the actual fixed-step `step()` simulation and writes JSON to stdout; the checked-in snapshot is `docs/pass-d-benchmark.json`. All missions have a 15,000-step deadlock bound, assert mineral mass conservation and end with no live ore claims. Numbers below use 1/60-second simulation steps. Initial single-unit seeds are 1–10, including default seed 7. Fleet comparisons use matching seeds 1, 3 and 7; progression uses 1, 7 and 10 on one persistent field per run. Benchmark research entitlements, far outpost and seeded salvage are **controlled fixtures**, never free grants in progression.

## Rules before and after

| Rule | Pass C | Pass D |
| --- | ---: | ---: |
| Active mining shift | 45 s | 30 s, then physical recall/unload |
| Impact Miner hull | 4 HP | 15 HP; each valid ram still costs 1 HP; stops at 1 |
| Laser Miner hull | 4 HP | 10 HP; firing costs no HP |
| Impact minimum ram cooldown | 8 s | 1.0 s |
| Laser interval | 9 s | 2.0 s |
| Scout damage to Miner | 1.5 HP | 4 HP per hit |
| Impact Recovery | 5.5 s | 0.65 s cooldown plus 0.40 s recoil (baseline recoil 0.55 s) |
| Rapid Cooling | 6.8 s | 1.6 s interval |
| Impact / Laser fragments | up to 2 / 1 | unchanged, each 1 Mineral and 1 cargo slot |
| Miner / Hauler cargo | 3 / 10 or 14 | unchanged |

Fresh Laser Miners die on the third Scout hit, fresh Impact Miners on the fourth. Mining self-damage may make an Impact Miner die sooner. Hauler and Escort hull/damage are unchanged. A slow physical brush now triggers a fixed run-up, avoiding a low-speed boundary stall without causing damage or duplicate impacts. The run-up and cooldown remain real simulation motion, not a guaranteed attack rate.

## Single-unit measurements

| 30-second starting-world shift | Delivered mean / median / range | Attacks mean | Observed interval mean / median | Hull remaining mean | Recall mean | Report time mean |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Impact | 9.9 / 10 / 9–11 | 5.4 rams | 5.48 / 5.82 s | 9.6 HP | 2.29 s | 32.29 s |
| Impact Recovery fixture | 10.6 / 11 / 9–12 | 6.0 rams | 5.21 / 5.63 s | 9.0 HP | 3.09 s | 33.09 s |
| Laser fixture | 11.9 / 12 / 11–12 | 12.0 shots | 2.54 / 2.02 s | 10 HP | 2.03 s | 32.03 s |
| Rapid Cooling fixture | 12.6 / 13 / 12–14 | 14.1 shots | 2.25 / 1.62 s | 10 HP | 2.06 s | 32.06 s |

The Impact baseline spent 5.37 simulated seconds in cooldown per shift, had zero idle wander time, and collected the ore it could deliver. Impact Recovery reduced cooldown occupancy to 3.84 seconds, increased rams and raised mean delivery by 0.7. Its full observed cycle is still about 5.5 seconds because it includes physical travel, pickup and docking; the quickest local successive rams were 2.17 seconds baseline and 1.83 seconds researched. Laser ready shots take roughly 2.02 seconds due to fixed-step quantization; movement and cargo routing extend the mean interval. Rapid Cooling raises output by 0.7 delivered and 2.1 shots per shift. The active window ends at 30 seconds, while survivors finish physical recall before the report. Across seeds, first Impact report time was 30.73–34.23 seconds.

## Equal-slot comparisons

Mean delivered per 30-second shift over seeds 1, 3 and 7. Near-HQ rows use the same starting field and technology fixture. The far salvage fixture adds 32 one-value fragments and uses the same Outpost starting condition for both rows. Hostile rows start with rival activity for both fleets. Neither fixture represents free player progression.

| Slots | Impact-only near HQ | Laser-only near HQ | Mixed near HQ | Impact-only far salvage | Impact + Hauler far salvage | Impact-only hostile | Impact + Escort hostile |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2 | 20.7 | 22.3 | 21.0 | 30.3 | 35.7 | 11.3 | 10.0 |
| 3 | 31.3 | 33.7 | 31.0 | 40.3 | 43.7 | 20.0 | 20.7 |
| 4 | 42.0 | 45.7 | 38.3 | 46.7 | 50.3 | 31.0 | 31.3 |
| 5 | 49.0 | 53.7 | 46.0 | 55.7 | 57.0 | 43.3 | 42.0 |
| 6 | 55.7 | 63.7 | 53.3 | 62.7 | 61.0 | 49.7 | 49.0 |

Hauler usefulness is conditional: it adds 5.4 delivery at two slots in the far salvage fixture but at six slots uses a slot and yields slightly less than another Miner. Physical handoffs totaled 35, 52, 62, 76 and 71 units across the three Hauler runs at 2–6 slots, respectively; all require station delivery for credit. Hostile six-slot Impact-only runs took 36 Scout shots across three seeds and lost 7 cargo units; Escort runs took 6 shots and lost zero cargo. Escort's slot cost can still outweigh its benefit for pure short-run income. Fleet runs tracked deaths, floating ore, claims assigned/released, idle and return time. For example, three near-HQ Impact Miners delivered 31.3 on average with 98 claims and 98 releases across three seeds, no ghost claims, and 2.0 floating fragments on average. Some far salvage fleets lost units; the full per-fleet metrics are in the JSON snapshot.

## Fleet Slot pricing and persistent progression

These are actual Workshop purchase prices. Progression uses `buy()` and `changeFleet()` after completion; an empty purchased slot does not spawn a unit. Rock HP and loose ore settle into the **same** company after every mission. Discoveries earn Tech only from actual events; mixed and logistics paths research when earned. No resource reset or extra income was introduced.

| Purchase | New price | Target completed round / addition | Impact expansion seeds 1, 7, 10 | Mixed seeds 1, 7, 10 | Logistics seeds 1, 7, 10 |
| --- | ---: | --- | --- | --- | --- |
| Slot 2 | 28 | round 2–5 | 3, 3, 3 | 3, 3, 3 | 3, 3, 3 |
| Slot 3 | 58 | +5, round 7–10 | 8, 8, 8 | 8, 8, 7 | 8, 8, 8 |
| Slot 4 | 155 | +10, round 17–20 | 17, 17, 17 | 16, 15, 15 | 17, 18, 17 |
| Slot 5 | 340 | +15, round 32–35 | 32, 32, 32 | 31, 30, 29 | 32, 33, 32 |
| Slot 6 | 480 | +20, round 52–55 | 52, 52, 52 | 51, 50, 49 | 50, 52, 50 |

The Impact expansion path achieves additions **3, +5, +9, +15, +20**; slot 4 comes one round earlier than the nominal +10, but within the cumulative 17–20 target. Faster mixed and logistics paths reach later slots slightly earlier. At round 52 the three Impact worlds still had 838–858 rock HP plus 6–11 loose fragments; the field can finance the observed six-slot progression without reset. It remains finite, so progress beyond this measured window should be tested in play. Other spending, especially the 38-Mineral Outpost or 18-Mineral Turret, delays slot purchases. The benchmark prioritizes slots and does not assume those optional purchases.

## Reservations and limitations

Each active world owns a deterministic `oreId → {ownerKind, ownerId}` map. Miners retain an ordered queue up to their current free cargo (0–3) and navigate only to its head. Haulers claim one target through the same map. Claims are released on pickup, capacity changes, recall, unloading, destruction, retasking, missing targets or unreachable approach. Units can still pick up unreserved ore opportunistically, but cannot take another unit's claimed fragment. Stable ID breaks equal travel-cost ties. The registry is transient; persisted ore receives new deterministic IDs next mission. Focused tests cover a three-Miner/ten-fragment assignment, Miner/Hauler exclusion, cargo 2/3, opportunistic release, physical handoff, lifecycle cleanup, replay and v9 reload.

Remaining uncertainties: Impact's full mean cycle exceeds the 2–4-second *local* aspiration because collection and travel consume time; some far hostile fleets lose units; Hauler value depends strongly on available salvage and distance. Mobile playtesting should guide any later changes to navigation, enemy pressure or field topology.
