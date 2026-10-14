# AIsteroid Mining · Alpha 0.14.0

A mobile-first autonomous mining game. Configure fleet counts, choose a doctrine and optional mission objective, then watch a 30-second active shift followed by physical recall and delivery. Rock depletion, discoveries and loose ore persist after completed shifts; Abort rolls the active shift back.

## Run

```
npm ci
npm test
npm run build
npm run dev
```

GitHub Pages publishes [the game](https://djulz.github.io/aisteroids/) after tests and build on `main`.

## Fleet and logistics

Impact Miners have 15 HP and lose 1 per valid ram; they stop deliberately ramming at 1 HP. Laser Miners have 10 HP. Enemy Scout hits take 4 HP from either Miner. Baseline cooldown is 1.0 seconds for rams and 2.0 seconds for laser shots. One loose fragment is worth exactly one Mineral. An Impact Miner releases up to two fragments per ram, a Laser Miner releases one per pulse; both always carry three. Rich origin affects the first sample discovery, never value. Destroyed cargo drops individual persistent salvage.

A shared transient ore-claim registry spreads Miners across distinct fragments; each may queue only as many claims as its free cargo and a Hauler cannot steal a Miner claim. Claims release on pickup, retasking, recall or loss. Hauler Operation (1 Tech Point) unlocks a Hauler in the Hangar. Each Hauler consumes one purchased Fleet Slot, carries 10 fragments, collects loose ore, takes nearby Miner cargo at a physical rendezvous and unloads at the selected station. Expanded Hauler (2 Tech Points, requires Hauler Operation) raises its capacity to 14. It does not mine or fight. Miners can still deliver independently; a full Miner only waits briefly for a nearby available Hauler and otherwise returns normally. Cargo ownership changes atomically; only station delivery credits Minerals. Haulers have hull, can be attacked, and drop their entire cargo as unit salvage on destruction. Shared berths prevent miners and Haulers double-booking a docking spot.

Workshop sells only physical Fleet Slots (28, 58, 155, 340, 480 Minerals), HQ Turret (18) and Outer Outpost (38). Hangar adjusts Impact Miner, researched Laser Miner, researched Hauler and researched Escort counts up to purchased capacity. Mobile Mining Rig remains unavailable. Research is an optional focused panel; Workshop and Hangar remain the two main tabs. Doctrine and Mission Plan stay beside Deploy.

## Discoveries and Research

Nine unique events award exactly one Tech Point each. They appear as a pending toast during the shift and settle once on completion, including completed losses. Abort rolls them back. The original six sources are Far Belt Charted, First Rich Sample, First Rival Contact, Outpost Site Surveyed, Abandoned Research Station and Experimental Probe. Pass C adds **Abandoned Cargo Relay**, **Derelict Freight Shuttle** and **Automated Sorting Archive** as distinct visible map/radar objects. The optional *Investigate Freight Signal* objective visits the next unrecovered signal, then resumes Free Mining. The next signal must be chosen in a later shift, so these points do not arrive passively together.

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

Valid Pass B v8 companies migrate once to v9, preserving currency, rounds, fleet slots and mix, researched and spent Tech, discoveries, minerals, doctrine, objective, infrastructure and depleted world. Valid Pass A v7 saves continue through the existing grandfathered Escort and historical discovery path. Pre-Pass-A v1–v6 companies remain rejected. New v9 saves validate the Tech budget and type unlocks; no Hauler appears automatically in existing compositions. Unrelated browser storage is untouched.

## Validation and balance

`npm run balance` reproduces the fixed-step ten-seed baseline, equal-slot fleet comparisons and multi-mission persistent-field price calibration. Results and limitations are in [the Pass D balance report](docs/pass-d-balance.md). `npm test` includes deterministic full-shift, physical handoff, ore conservation, last-Miner loss, enemy damage, research and migration checks. The anchored post-impact recovery and four-doctrine regressions remain in place. Normal shift completion waits for a loaded surviving Hauler to return; a destroyed Hauler's fragments persist for future salvage.

Mobile Mining Rig, individual drone customization and manual in-shift commands remain out of scope.
