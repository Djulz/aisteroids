# AIsteroid Mining · Alpha 0.13.0

A mobile-first autonomous mining game. Configure fleet counts, choose a doctrine and optional mission objective, then watch a 45-second shift. Rock depletion, discoveries and loose ore persist after completed shifts; Abort rolls the active shift back.

## Run

```
npm ci
npm test
npm run build
npm run dev
```

GitHub Pages publishes [the game](https://djulz.github.io/aisteroids/) after tests and build on `main`.

## Fleet and logistics

One loose fragment is worth exactly one Mineral. An Impact Miner releases up to two fragments per ram, a Laser Miner releases one per pulse; both always carry three. Rich origin affects the first sample discovery, never value. Destroyed cargo drops individual persistent salvage.

Hauler Operation (1 Tech Point) unlocks a Hauler in the Hangar. Each Hauler consumes one purchased Fleet Slot, carries 10 fragments, collects loose ore, takes nearby Miner cargo at a physical rendezvous and unloads at the selected station. Expanded Hauler (2 Tech Points, requires Hauler Operation) raises its capacity to 14. It does not mine or fight. Miners can still deliver independently; a full Miner only waits briefly for a nearby available Hauler and otherwise returns normally. Cargo ownership changes atomically; only station delivery credits Minerals. Haulers have hull, can be attacked, and drop their entire cargo as unit salvage on destruction. Shared berths prevent miners and Haulers double-booking a docking spot.

Workshop sells only physical Fleet Slots (6, 12, 21, 33, 48 Minerals), HQ Turret (18) and Outer Outpost (38). Hangar adjusts Impact Miner, researched Laser Miner, researched Hauler and researched Escort counts up to purchased capacity. Mobile Mining Rig remains unavailable. Research is an optional focused panel; Workshop and Hangar remain the two main tabs. Doctrine and Mission Plan stay beside Deploy.

## Discoveries and Research

Nine unique events award exactly one Tech Point each. They appear as a pending toast during the shift and settle once on completion, including completed losses. Abort rolls them back. The original six sources are Far Belt Charted, First Rich Sample, First Rival Contact, Outpost Site Surveyed, Abandoned Research Station and Experimental Probe. Pass C adds **Abandoned Cargo Relay**, **Derelict Freight Shuttle** and **Automated Sorting Archive** as distinct visible map/radar objects. The optional *Investigate Freight Signal* objective visits the next unrecovered signal, then resumes Free Mining. The next signal must be chosen in a later shift, so these points do not arrive passively together.

| Research | Tech Points | Effect |
| --- | ---: | --- |
| Laser Mining | 1 | Unlock Laser Miner |
| Impact Recovery | 1 | Ram reset 8 → 5.5 seconds |
| Rapid Cooling | 2 | Laser interval 9 → 6.8 seconds; requires Laser Mining |
| Escort Program | 1 | Unlock Escort after rival contact |
| Threat Tracking | 1 | Escorts favor threats near productive units |
| Hauler Operation | 1 | Unlock 10-cargo Hauler without adding a slot |
| Expanded Hauler | 2 | All Haulers carry 14; requires Hauler Operation |

The nine one-time Tech sources fund the nine total node costs; Minerals and Tech Points remain separate. Miners retain cargo three. Fleet Doctrines govern targeting and risk, while research changes the relevant type's capabilities.

## Saves

Valid Pass B v8 companies migrate once to v9, preserving currency, rounds, fleet slots and mix, researched and spent Tech, discoveries, minerals, doctrine, objective, infrastructure and depleted world. Valid Pass A v7 saves continue through the existing grandfathered Escort and historical discovery path. Pre-Pass-A v1–v6 companies remain rejected. New v9 saves validate the Tech budget and type unlocks; no Hauler appears automatically in existing compositions. Unrelated browser storage is untouched.

## Validation and balance

`npm test` includes deterministic full-shift, physical handoff, ore conservation, last-Miner loss, enemy damage, research and migration checks. The anchored post-impact recovery and four-doctrine regressions remain in place. Normal shift completion waits for a loaded surviving Hauler to return; a destroyed Hauler's fragments persist for future salvage.

Five-seed comparisons with equal slot budgets found near HQ: two Impact Miners delivered 12 Minerals on average versus 6 for one Miner and one Hauler. With a far survey objective and three initial loose fragments, one Miner plus a Hauler delivered 9 versus 8.4 for one Miner alone, while two Miners delivered 13.8. Haulers reduce Miner travel and recover surplus ore, but the Impact Miner's own hull-limited return keeps them from increasing extraction every shift. In a dense far-field salvage fixture (32 loose fragments, three seeds), one Miner plus a 10-cargo Hauler delivered 33 on average; the 14-cargo upgrade delivered 37. These are scenario measurements, not guaranteed outcomes. A later balance pass should consider how to make distant logistics more useful without weakening mining, altering yields or making Haulers mandatory.

Mobile Mining Rig, individual drone customization and manual in-shift commands remain out of scope.
