# Pass P · Fleet roles, branch research and industrial logistics (alpha 0.26.0)

## Purchases and access

Fleet counts are assignments, not individual purchases. A Fleet Slot costs 28 / 58 / 155 / 340 / 480 Credits as before; one Rig weighs two slots. The starter company has one basic impact Miner and Scout availability, but only one capacity slot. The first *sensed* enemy unlocks Fighter for the next preparation phase and separately awards the existing first-contact Tech. Completed four-second investigation of the Home Belt Abandoned Cargo Relay unlocks Hauler, including through bounded autonomous basic-Miner work without a Scout. Its original Tech reward and Wide-Area Scanner blueprint are unchanged. Completed investigation of the new B2 Derelict Excavation Platform unlocks Rig and one unique Tech. A Scout investigates automatically; a nearby Fighter can investigate it without a Scout. Discovery alone is insufficient. No unit unlock consumes Tech or Credits beyond its required slot capacity.

## Research contracts

Each category buys levels 1 / 2 / 3 for 1 / 2 / 3 Tech, independently. Chosen stable IDs are persisted. The first Nickel delivery gates level 2; completed Platform investigation gates level 3. The role blueprint gates a locked role's first choice. The first row below is level 1; the second level 2; the third level 3. At every reachable step exactly two alternatives are shown.

| Category | Level 1 IDs | Level 2 IDs | Level 3 IDs, following level 2 |
| --- | --- | --- | --- |
| Miner | `laserCutter` / `ramSplitter` | Laser: `heavyPulse` / `longRangeOptics`; Ram: `heavyHead` / `rapidRecovery` | Laser: `piercingBeam` / `continuousCutting`; Ram: `phaseRam` / `magneticRam` |
| Hauler | `bulkCarrier` / `expressDelivery` | `geminiCart` / `precisionJump` | Cart: `twinCartLogistics` / `armoredFreight`; Jump: `rapidCycling` / `longHaulJump` |
| Scout | `surveyArray` / `pathfinderEngines` | `surveyBeacon` / `lowSignature` | Beacon: `beaconNetwork` / `mineralSpectrometer`; Signature: `ghostSurvey` / `decoyBurst` |
| Fighter | `guardianFrame` / `interceptorEngines` | `shieldProjector` / `suppressiveFire` | Shield: `umbrellaCoverage` / `personalBodyguard`; Fire: `disablingShot` / `crossfireControl` |
| Mining Rig | `wideAreaDrilling` / `deepCoreDrill` | `loadingGantry` / `rapidDeployment` | Gantry: `dualLoadingArms` / `industrialReserve`; Deploy: `rollingRestart` / `emergencyFold` |
| Company Core | `reinforcedChassis` / `efficientThrusters` | `fieldServiceBuoy` / `overclockNetwork` | Service: `mobileRepairStation` / `oreDepot`; Overclock: `extendedCycle` / `protectedOverdrive` |

A category path costs six Tech, so six completed categories cost 36. Respec refunds the exact levels purchased for that category; a new choice recomputes capabilities from base values. The chosen Miner count remains one unified assignment when switching Laser ↔ Ram. Laser and Ram share the company's purchased extraction class for hard minerals. No branch grants free future-region tools.

## Starting values and autonomous effects

- Miner baseline: impact 15 HP, three cargo, two fragments per ordinary ram, one self-damage, 1s cooldown; Laser Cutter uses the previous 10 HP, 2s one-fragment stand-off pulse. Ram Splitter extracts up to three primary plus one eligible secondary within 125 units; Heavy Head adds one primary; Rapid Recovery reduces cooldown to 0.65s and recoil to 0.3s. Heavy Pulse yields two at 3s cadence; Optics reach is 136 versus 85. Piercing Beam extracts one finite secondary, Continuous Cutting reaches a 1.5× pulse cadence after three same-rock pulses, Phase Ram may reach two more aligned rocks within 240 with a short visual streak, and Magnetic Ram claims nearby unowned fragments within a brief charge window. All extra extraction consumes existing rock HP.
- Hauler baseline: 10 cargo. Bulk 15; Express 6 at 2.5× movement speed. Cart is one physical 12-place, six-HP entity (two with Twin; Armored raises to 12 HP and reduces towed weapon damage). Towing slows by 40%. The Hauler fetches its loaded detached cart and physically unloads its manifest at the station. Precision Jump has a 200-unit/10-second simulated cooldown, or 400 units with Long Haul and six seconds with Rapid Cycling. Both ends, intermediate 20-unit samples, chart, same biome and obstacle-free transit must pass. Recall retrieves a nearby loaded cart within 250 units when possible; unretrieved inventory becomes persistent salvage.
- Scout baseline: unarmed, no cargo, 85 speed and 165 sensor radius (330 with the separately purchased Wide-Area Scanner). Survey Array multiplies current sensor reach by 1.5, Pathfinder speed by 1.6. Beacon lasts 15 simulated seconds, has a 12-second placement cadence, at most one active per Scout or two with Network. Spectrometer identifies discovered deposits in its beacon footprint. Low Signature shortens initial enemy acquisition from 95 to 57; Ghost Survey retains it while investigating. Decoy lasts 2.5 seconds with a 20-second cooldown and a short escape impulse. An acquired Scout can still be pursued.
- Fighter baseline: 6 HP, local worker protection and attacks. Guardian hull ×1.5; Interceptor movement ×1.4 and range 135 → 169. Shield Projector covers one nearby threatened worker for up to 4 weapon damage over four seconds with a 10-second recharge. Umbrella covers up to three for 2 each, Bodyguard one for 7. Suppression slows a hit enemy's weapon recharge by 30% for three seconds; Disable blocks that weapon for two seconds on a 12-second cooldown. Crossfire shares one unit of total hit damage between two local targets and suppresses both. Multiple shields do not stack onto one target.
- Company Core: Chassis raises all friendly base hull by 25%; Thrusters raise travel speed by 15%. Service Buoy is one automatically placed local station with 12 HP of per-shift repair reserve, one docked unit at 2 HP/s, no combat healing. Mobile Repair doubles reserve and raises repair rate to 3 HP/s; Ore Depot adds 12 physical buffer places for Miner handoff and Hauler collection. Overclock provides +25% mining cadence and Hauler speed during four of each 20 simulated seconds. Extended Cycle lasts six; Protected Overdrive reduces weapon damage by 40% during the original four. No damage/yield multiplier is layered on that cadence.
- Mining Rig: 25 HP, 29 world-units/s travel (about 40% of a working Miner), two-second deploy/pack, 120-unit drill footprint, 0.65-second sustained one-fragment cycle, six-place internal buffer. The original proposed cycle was deliberately sped up after delivered-throughput measurements while leaving all mineral values and cargo accounting unchanged. Wide-Area reaches 180; Deep-Core ramps to +40% after four cycles on one rock. Gantry doubles buffer to 12 and moves up to six items per Hauler exchange; Rapid Deployment halves setup and adds 30% travel speed. Industrial Reserve has 24 buffer places; Dual Arms permits two distinct Hauler berths. Rolling Restart retains half a Deep-Core streak during a short relocation or briefly boosts a Wide-Area restart; Emergency Fold packs in 0.3s on a 16-second threat cooldown. Full buffer stops drilling. Recall packs and returns physically; abandoned inventory settles as salvage once.

All cooldowns use fixed simulated time. 2× is wall-clock acceleration only. No talent adds a permanent ship bill, recharge currency, unconditional teleport, new enemy archetype or new region access.

## Once-only Tech ledger

Each ID below gives exactly **one** Tech and is persisted in `uniqueTechDiscoveries`. Delivery and contact conditions are evaluated in the simulation; rewards are committed at settlement. Discovery without completed physical investigation never pays a site reward. Actual reachability depends on the seed and chosen expeditions; the 7-seed bought path below obtained ten of these.

| ID | Condition | Current area |
| --- | --- | --- |
| `first_shift_delivered` | First completed shift with station-delivered Credits | B1 |
| `home_belt_surveyed` | Chart over 115 map cells | B1 |
| `abandoned_cargo_relay` | Completed physical relay investigation | B1 |
| `first_fleet_expansion` | First completed shift after buying a second slot | B1 |
| `far_belt_charted` | Friendly craft reaches Scrap Fields | B2 |
| `first_rival_contact` | First enemy within friendly sensor radius | B2 |
| `first_rich_sample` | First delivered valuable fragment | B2 |
| `first_nickel_delivery` | First delivered Nickel fragment | B2 |
| `abandoned_research_station` | Completed physical research-station investigation | B2 |
| `experimental_probe_salvaged` | Completed physical probe investigation | B2 |
| `derelict_excavation_platform` | Completed physical platform investigation | B2 |
| `outpost_site_surveyed` | Physical Outpost survey | Outer frontier |
| `derelict_freight_shuttle` | Completed shuttle investigation | Contested region |
| `automated_sorting_archive` | Completed archive investigation | Ion Storm |

The currently accessible B1/B2 slice offers **up to eleven** one-time Tech: four safe B1 sources and seven B2 sources. The three existing outer rewards remain once-only and physically gated. Finishing all six paths eventually requires 36. The future advanced-region campaign must supply at least 22 additional Tech beyond these fourteen IDs; the intended source budget is eight in Contested, seven in Ion Storm and seven in Dead Zone, attached to future real sites or industry milestones. Those planned rewards have no runtime IDs and cannot be collected yet.

## Save/content patch

A valid v15 company is validated first, then written as v16 before deleting `aisteroids-company-v15`. Historical recognized nodes refund their actual 1/1/2/1/1/1/2 Tech prices, excluding any grandfathered free Fighter Program. Paths start unselected; earned discovery IDs and available balances reconcile exactly. Impact + Laser assignment counts merge into one Miner count, and contact grants the Fighter blueprint. Paid old Hauler access is recorded as `legacyHaulerAccess` even if the old relay was never investigated. The saved seed, dimensions, credits, rounds, finite depletion, ore inventory, chart, discovered POIs, investigation progress, focus, infrastructure and user settings are copied without a new universe epoch.

Generator version and existing deposit ID/RNG stream stay stable. A deterministic content overlay picks an unobstructed relay footprint roughly 95 units from HQ in safe B1, and places the new stable-ID Platform at a clear B2 expedition site. It does not delete nearby loose ore or alter the original rock field; a loose fragment occupying a site remains collectible. The company content version prevents another patch/refund on reload. Pre-O company keys retain Pass O's existing one-time reset behavior; valid v16 wins over stale keys. Failure to write the new key leaves v15 untouched.

## Bounded measurements

`npm run campaign:p` runs a purchase-only policy on seed 7 with a 42-shift ceiling, 12,600 fixed steps per shift. It starts with basic mining, buys slot two and assigns Scout, chooses Ram Splitter from earned Tech, observes first contact, swaps Scout to Fighter, physically delivers Nickel, buys slot three and resumes Scout, investigates the B2 Platform, and buys slot four to assign Rig + Hauler + Fighter. No Credits, slots, Tech, POI states or rocks are granted. The route reached a legal industrial composition on **round 29–30**, with ten unique Tech sources. This is a deterministic policy measurement, not a prescribed optimal play order.

`npm run compare:p` starts from that purchased four-slot campaign state, spends one earned Tech on Express Delivery, and uses a **controlled 90-second Endurance fixture** for equal-capacity comparisons; it does not claim that Endurance or the optional fifth slot was purchased by the 30-round campaign. Each cell is four shifts, independent copies of the same seed, depletion, technology and protection. `npm run compare:p -- 7 1` uses one Hauler and four capacity slots; the default uses two Haulers and five fixture slots.

| 90s fixture, seed 7 | Two Miners + Fighter | Rig + Fighter | Rig minus Miners |
| --- | ---: | ---: | ---: |
| Sparse, 2 Haulers: delivered Credits | 384 | 266 | −118 |
| Dense protected Nickel, 2 Haulers: delivered Credits | 447 | 475 | +28 |
| Dense: Nickel fragments delivered | 92 | 113 | +21 |
| Dense: losses | 3 | 0 | −3 |

A single Express Hauler at four capacity slots still favors two Miners in total Credits in this test (dense 380 vs 341), although the Rig delivered more Nickel (75 vs 65) and lost no ships. The measured Rig advantage requires sustained clustered deposits and enough protected haul capacity. Two Miners stay better on sparse work and fast retasking. No theory-only extraction metric was substituted for station delivery.

The Pass O protected frontier script and active camera/art/impact tests remain bounded. Future-region boss/lifeform/campaign content, new enemies, and advanced Tech awards remain unfinished by design.
