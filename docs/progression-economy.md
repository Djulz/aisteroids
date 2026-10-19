# Progression and economy · alpha 0.27.0

This implements the 19 October 2026 progression proposal on top of Pass P's stable world and six research trees. Existing mineral payouts (Ferrite/Nickel/Aurite/Cryonite/Voidite: 1/3/8/20/60), finite deposits, travel, physical delivery, enemy spawns, map locations and research nodes are unchanged.

## First company

The first shift has a maximum 22-second active period, but recalls as soon as its one Miner fills three places after ten seconds. In 80 seeded simulations its actual active period was 11.75–19.7 seconds (median 14.2); every one physically delivered three Ferrite by recall. The basic Miner stops productive work safely when full. Without Cargo Awareness it does not unload mid-shift. With it, a full Miner returns, unloads and may work again. Navigation Assist raises its acceleration and turn response from 0.78/0.72 to 1.2/1.0. Work Planner keeps a local pocket/target more steadily and cuts avoidable reassessment. Correct pathfinding, claim cleanup and recall remain available to every Miner.

The first delivery enables Cargo Awareness. The subsequent sequence is Navigation Assist, Work Planner, then Fleet Slot 2. Purchases are paid with Credits, and the next offer is computed after the following shift, not immediately after clicking Buy. During introduction Research is hidden, but already earned Tech is kept. Once complete, Research opens with two exclusive choices at each level; confirmed choices cannot be reset or refunded. Level two requires Nickel delivery, level three the investigated Probe and Aurite delivery. A new company can be created through the existing confirmed New Game flow to try another path.

## Workshop

At most two current offers are shown, including unaffordable ones. Main progression takes priority over optional protection and sensor projects. Optional purchases remain eligible on later shifts. Actual purchase handling checks the phase's offers and prevents multiple purchases of the same offer before the next shift.

| Credits | Purchase | Unlock |
|---:|---|---|
| 3 / 6 / 12 | Cargo Awareness / Navigation Assist / Work Planner | Sequential introduction |
| 24 / 48 / 120 / 320 / 800 | Fleet Slots 2–6 | Intro / two slots / Nickel / Aurite / Cryonite |
| 32 / 120 / 400 | Endurance 45 / 60 / 90 seconds | Two slots / Nickel / Aurite |
| 24 / 80 | HQ Turret / Wide-Area Scanner | HQ intrusion / Cargo Relay |
| 180 / 240 | Deflector Shields / Extraction Class II | Research Station and Nickel |
| 600 / 600 | Outer Outpost / Navigation Stabilizers | Surveyed site and Aurite delivered during a Deflector-equipped shift / Probe and Aurite |
| 1,600 / 2,400 | Radiation Shielding / Resonance Extraction | Archive and Cryonite / Archive and Class II |

The Deflector reduces actual hostile weapon damage to the fleet by 40%; it does not cancel collisions or radiation. The Outpost offer requires a real Aurite delivery from a shift launched with Deflectors, plus the site survey. Existing storm and radiation gear keeps its environmental effects. A Rig consumes one slot; its physical buffer, slow setup, Hauler handoff and finite-reserve drilling remain. It is unlocked only by physical investigation of the B2 Excavation Platform.

## Measured purchased route

The bounded deterministic campaign in `scripts/pass-p-campaign.ts` starts at zero Credits/Tech, uses real shifts and physical deliveries, buys the basic sequence and Endurance I, and deploys Scout, Fighter, Hauler and Rig only after their unlocks and capacity purchases. No starting balance or discovery is granted. Sample outcomes:

| Seed | First 3 Ferrite | Slot 2 | Contact | Slot 3 + first Nickel | Slot 4 + Rig/Hauler | Established protected B2 delivery |
|---:|---:|---:|---:|---:|---:|---:|
| 7 | Shift 1 | 7 | 7 | 15 | 17 | 42–69 Credits in shifts 15–17 |
| 17 | Shift 1 | 7 | 7 | 15 | 18 | 28–67 Credits in shifts 15–18 |
| 42 | Shift 1 | 7 | 7 | 15 | 19 | 18–43 Credits in shifts 15–19 |

The comparison script uses equal fleet slots and a controlled 90-second endurance fixture, so it measures Rig versus a second Miner under matched capacity, not the paid campaign's economic feasibility. At seed 7, two Haulers and five slots over four shifts, the dense Nickel fixture delivered **615 Credits with Rig versus 445** with two Miners; a sparse B1 fixture delivered **406 versus 442**, favoring ordinary Miners. Actual elapsed simulated time differs because fleets can finish or die before the nominal shift ends (dense: 471 versus 303 seconds including recall over four runs). This is one seeded scenario, not a normalized production-rate claim. The comparison's 90-second Endurance and capacity are fixture settings after a genuine purchased baseline, not purchases claimed by that route.

B3–B5 price pacing and the Silent Core completion target are not proven by this B1/B2 route. Their requirements and protection effects are present, but claims of 70–1,000 Credits per regional shift need further real-play measurement. No payout multiplier was added to force those targets.

## Save compatibility

The save key is v17. Valid v16 saves preserve current and future miner function by owning all three basic upgrades immediately; no Credits are charged, Tech choices are untouched and there is no respec. `shopOffers` is initialized from the current progress. `deflectorShields` and the new HQ intrusion observation begin false, while built Outposts and chosen launch sites persist. Previously built Outposts are grandfathered through the new protected Aurite milestone. The v15 refund migration remains available for pre-P companies, now writing v17 directly. Existing rock IDs, fog and world ledger are copied unchanged. If writing a migrated save fails, the old key is retained.
