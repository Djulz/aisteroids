# AIsteroid Mining · Alpha 0.20.0

A mobile-first autonomous mining game. Choose upgrades and fleet composition, then Deploy into a 30-second active shift, upgradeable to 45, 60 and 90 seconds, followed by physical recall and delivery. The asteroid field fills the mission screen: drag to pan, pinch to zoom, tap a discovered signal to assign an available Escort, and use the contextual Follow Fleet control to return to your drones. The HUD shows time left and minerals delivered; the 1×/2× button changes simulation speed. Friendly sensors reveal a persistent chart across a 2600 × 2400 world. Rock depletion, charted cells, discovered signals and loose ore persist after completed shifts.

## Run

```
npm ci
npm test
npm run build
npm run balance
npm run explore
npm run frontier
npm run biomes
npm run dev
```

GitHub Pages publishes [the game](https://djulz.github.io/aisteroids/) after tests and build on `main`.

Pass H redraws in-world ships, Outpost, five real POIs and asteroids as small flat Canvas shapes from the approved asset sheet. The current map has common rocks and an existing `rich` distinction, not five economic tiers. Only revealed rich rocks receive the second visual motif; tiers 3–5 and the enemy Fighter are future art shown in the direct-URL [asset gallery](https://djulz.github.io/aisteroids/?assetGallery=1), with no new spawn or payout. See [Pass H art notes](docs/pass-h-art.md).

Pass I adds five fixed, persistent regions: Home Belt, Scrap Fields, Contested Territory, Ion Storm and Dead Zone. Their subdued color and ambient marks appear only where sensors have charted the map. A regional rival patrol stays near Contested Territory; Ion Storm reduces sensor reach and movement; Dead Zone slowly damages exposed hulls. Scouts explore automatically, weigh known hazards and may receive an optional, mission-only **Focus Scouting** preference by tapping a charted area or its immediate fog edge. A discovered signal still takes precedence and **Lock Target** controls Escorts independently. The Workshop offers three one-time fleet-wide Mineral purchases after physical POI investigation: Advanced Sensors (125), Navigation Stabilizers (240), and Radiation Shielding (350). See [Pass I region notes](docs/pass-i-regions-biomes.md).

Pass J adds a few small square engine puffs behind moving ships and quiet biome-specific stone colors to charted asteroids. Mineral inclusions retain their own colors and existing reveal gate. The developer-only asset gallery compares moving ships and the same T1/T2 rock across all five regions. No simulation, economy or save schema changed. See [Pass J visual notes](docs/pass-j-visual-polish.md).

## Fleet and logistics

Impact Miners have 15 HP and lose 1 per valid ram; they stop deliberately ramming at 1 HP. Laser Miners have 10 HP. Enemy Scout hits take 4 HP from either Miner. Baseline cooldown is 1.0 seconds for rams and 2.0 seconds for laser shots. One loose fragment is worth exactly one Mineral. An Impact Miner releases up to two fragments per ram, a Laser Miner releases one per pulse; both always carry three. Rich origin affects the first sample discovery, never value. Destroyed cargo drops individual persistent salvage.

A shared transient ore-claim registry spreads Miners across distinct fragments; each may queue only as many claims as its free cargo and a Hauler cannot steal a Miner claim. Claims release on pickup, retasking, recall or loss. Hauler Operation (1 Tech Point) unlocks a Hauler in the Hangar. Each Hauler consumes one purchased Fleet Slot, carries 10 fragments, collects loose ore, takes nearby Miner cargo at a physical rendezvous and unloads at the selected station. Expanded Hauler (2 Tech Points, requires Hauler Operation) raises its capacity to 14. It does not mine or fight. Miners can still deliver independently; a full Miner only waits briefly for a nearby available Hauler and otherwise returns normally. Cargo ownership changes atomically; only station delivery credits Minerals. Haulers have hull, can be attacked, and drop their entire cargo as unit salvage on destruction. Shared berths prevent miners and Haulers double-booking a docking spot.

Workshop sells physical Fleet Slots (28, 58, 155, 340, 480 Minerals), HQ Turret (18), Outer Outpost (450), and sequential Shift Endurance upgrades (75, 180, 400 Minerals). Only upgrades whose prerequisites are met appear; an unaffordable but unlocked upgrade still shows its real cost. Hangar adjusts Impact Miner, researched Laser Miner, researched Hauler, researched Escort and unarmed Scout counts up to purchased capacity. Only unlocked types appear. At least one Miner is always required; the Scout consumes a purchased slot, cruises at 85 units/second, avoids danger at 105, senses within 165, and carries no ore or weapon. Mobile Mining Rig remains unavailable. Workshop and Hangar are tabs; Research opens a focused secondary view when relevant.

Pass G parks the doctrine selector without changing saved doctrine or engine behavior. The universal launch-site picker is also parked. A company with a built Outpost sees a small launch-site switch above Deploy, preserving and allowing changes to its saved HQ/Outpost choice. Other companies continue from HQ; neither their saved infrastructure nor the world is rewritten. See [the Pass G UI notes](docs/pass-g-ui.md).

## Discoveries and Research

Nine unique events award exactly one Tech Point each and settle once on completion, including completed losses. New findings appear in the final report. Four milestones are Far Belt Charted, First Rich Sample (on delivery), First Rival Contact and Outpost Site Surveyed. The five physical investigation sites are the Derelict Research Station, Experimental Probe, **Abandoned Cargo Relay**, **Derelict Freight Shuttle** and **Automated Sorting Archive**. Discovery alone earns no Tech. A living Escort must travel to a discovered site and investigate for 1.25 simulated seconds after a live **Lock Target** command. Clear Target or completed investigation restores Mine Freely; targets never carry over to the next mission. Mining and Hauler logistics continue in parallel.

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

Pass I stores installed environment upgrades in v12. Valid v11 and historical v7–v10 companies migrate without a reset; v11's 104 × 96 chart is copied unchanged. Credits, rounds, fleet, spent/earned Tech, investigated sites, doctrine, infrastructure, endurance, depleted rocks and loose ore persist. Prior investigations count as blueprint unlocks, while installed upgrades start empty. Legacy v10's 32 × 38 bitset is converted cell by cell. Live Scout focus and Escort targets are never saved; unrelated browser storage is untouched.

## Validation and balance

`npm run balance` reproduces the Pass D fixed-step ten-seed baseline, equal-slot fleet comparisons and multi-mission price calibration. `npm run explore` measures matched two-slot mining versus Scout exploration and live Escort investigation in the expanded world. `npm run frontier` measures all shift tiers and a purchase-driven campaign through an Outpost launch. Results and limitations are in [the Pass F report](docs/pass-f-frontier.md), [the Pass E report](docs/pass-e-fog-scout-targets.md) and [the Pass D report](docs/pass-d-balance.md). `npm test` includes camera gesture and compact lobby tests alongside deterministic fog, Scout, target, research, v10 map migration, ore conservation, last-Miner loss and four-doctrine regressions. Normal shift completion waits for loaded surviving Haulers and returning Scouts.

Mobile Mining Rig and individual drone customization remain out of scope. Drones cannot be steered, fired or micromanaged in mission.
