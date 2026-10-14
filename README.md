# AIsteroid Mining · Alpha 0.15.0

A mobile-first autonomous mining game. Configure fleet counts, doctrine and launch site, then Deploy into a 30-second active shift followed by physical recall and delivery. Every mission starts **Mine Freely**. Friendly sensors reveal a persistent chart; the Scout maps new territory and detects signals. Tap a discovered signal during the live mission to assign an available Escort, or ignore it while mining continues. Rock depletion, charted cells, discovered signals and loose ore persist after completed shifts; Abort rolls the active shift back.

## Run

```
npm ci
npm test
npm run build
npm run balance
npm run explore
npm run dev
```

GitHub Pages publishes [the game](https://djulz.github.io/aisteroids/) after tests and build on `main`.

## Fleet and logistics

Impact Miners have 15 HP and lose 1 per valid ram; they stop deliberately ramming at 1 HP. Laser Miners have 10 HP. Enemy Scout hits take 4 HP from either Miner. Baseline cooldown is 1.0 seconds for rams and 2.0 seconds for laser shots. One loose fragment is worth exactly one Mineral. An Impact Miner releases up to two fragments per ram, a Laser Miner releases one per pulse; both always carry three. Rich origin affects the first sample discovery, never value. Destroyed cargo drops individual persistent salvage.

A shared transient ore-claim registry spreads Miners across distinct fragments; each may queue only as many claims as its free cargo and a Hauler cannot steal a Miner claim. Claims release on pickup, retasking, recall or loss. Hauler Operation (1 Tech Point) unlocks a Hauler in the Hangar. Each Hauler consumes one purchased Fleet Slot, carries 10 fragments, collects loose ore, takes nearby Miner cargo at a physical rendezvous and unloads at the selected station. Expanded Hauler (2 Tech Points, requires Hauler Operation) raises its capacity to 14. It does not mine or fight. Miners can still deliver independently; a full Miner only waits briefly for a nearby available Hauler and otherwise returns normally. Cargo ownership changes atomically; only station delivery credits Minerals. Haulers have hull, can be attacked, and drop their entire cargo as unit salvage on destruction. Shared berths prevent miners and Haulers double-booking a docking spot.

Workshop sells only physical Fleet Slots (28, 58, 155, 340, 480 Minerals), HQ Turret (18) and Outer Outpost (38). Hangar adjusts Impact Miner, researched Laser Miner, researched Hauler, researched Escort and unarmed Scout counts up to purchased capacity. At least one Miner is always required; the Scout consumes a purchased slot, maps a wide area and carries no ore or weapon. Mobile Mining Rig remains unavailable. Research is an optional focused panel; Workshop and Hangar remain the two main tabs. Doctrine and the HQ/Outpost launch-site control stay beside Deploy. The old objective picker and omniscient scanner have been removed.

## Discoveries and Research

Nine unique events award exactly one Tech Point each. They appear as a pending toast during the shift and settle once on completion, including completed losses. Abort rolls them back. Four milestones are Far Belt Charted, First Rich Sample (on delivery), First Rival Contact and Outpost Site Surveyed. The five physical investigation sites are the Derelict Research Station, Experimental Probe, **Abandoned Cargo Relay**, **Derelict Freight Shuttle** and **Automated Sorting Archive**. Discovery alone earns no Tech. A living Escort must travel to a discovered site and investigate for 1.25 simulated seconds after a live **Lock Target** command. Clear Target or completed investigation restores Mine Freely; targets never carry over to the next mission. Mining and Hauler logistics continue in parallel.

| Research | Tech Points | Effect |
| --- | ---: | --- |
| Laser Mining | 1 | Unlock Laser Miner |
| Impact Recovery | 1 | Ram cooldown 1.0 → 0.65 seconds and recoil 0.55 → 0.40 seconds |
| Rapid Cooling | 2 | Laser interval 2.0 → 1.6 seconds; requires Laser Mining |
| Escort Program | 1 | Unlock Escort after rival contact |
| Threat Tracking | 1 | Escorts favor threats near productive units |
| Hauler Operation | 1 | Unlock 10-cargo Hauler without adding a slot |
| Expanded Hauler | 2 | All Haulers carry 14; requires Hauler Operation |

The nine one-time Tech sources fund the nine total node costs; Minerals and Tech Points remain separate. Miners retain cargo three. Fleet Doctrines govern targeting and risk, while research changes the relevant type's capabilities.

## Saves

Valid v9, v8 and v7 companies migrate to v10 without a progression reset. Credits, rounds, slots and fleet mix, spent/earned Tech, prior investigated sites, minerals, doctrine, infrastructure and depleted world remain. Legacy pre-Deploy objectives are discarded. Existing fleets receive **zero** Scouts, and explored map memory is seeded only around known sites and milestones. v10 saves validate the compact 1,216-cell map, POI IDs, fleet and Tech ledger. Live targets and live visibility are never saved; unrelated browser storage is untouched.

## Validation and balance

`npm run balance` reproduces the Pass D fixed-step ten-seed baseline, equal-slot fleet comparisons and multi-mission persistent-field price calibration. `npm run explore` measures matched two-slot mining versus Scout exploration, midgame progression and an actual Escort investigation. Results and limitations are in [the Pass E report](docs/pass-e-fog-scout-targets.md) and [the Pass D balance report](docs/pass-d-balance.md). `npm test` includes deterministic fog, Scout, target, research, migration, ore conservation, last-Miner loss and four-doctrine regressions. Normal shift completion waits for loaded surviving Haulers and returning Scouts.

Mobile Mining Rig and individual drone customization remain out of scope. Drones cannot be steered, fired or micromanaged in mission.
