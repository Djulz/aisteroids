# Rock Bottom Robotics · Alpha 0.23.1

A mobile-first autonomous mining game. The asteroid-field main menu lets you Continue an existing company, start a new one with an explicit world seed, or adjust reduced motion. In Mission Control, choose upgrades and fleet composition, then Deploy into a 30-second active shift, upgradeable to 45, 60 and 90 seconds, followed by physical recall and delivery. The asteroid field fills the mission screen: drag to pan, pinch to zoom, tap anywhere to set persistent Mining or Scout focus, and use the contextual Follow Fleet control to return to your drones. Discovered signals can still be inspected and assigned to Escorts. The HUD shows time left and Credits delivered; the 1×/2× button changes simulation speed. Friendly sensors reveal a persistent chart across a 2600 × 2400 world. Rock depletion, charted cells, discovered signals, loose ore and focus pins persist after completed shifts.

## Run

```
npm ci
npm test
npm run build
npm run balance
npm run explore
npm run frontier
npm run biomes
npm run progression
npm run dev
```

GitHub Pages publishes [the game](https://djulz.github.io/aisteroids/) after tests and build on `main`.

Pass H redraws in-world ships, Outpost, five real POIs and asteroids as small flat Canvas shapes from the approved asset sheet. Pass K activates five economic minerals on deterministic deposits. The enemy Fighter remains future art in the direct-URL [asset gallery](https://djulz.github.io/aisteroids/?assetGallery=1), without a new enemy spawn. See [Pass H art notes](docs/pass-h-art.md).

Pass I adds five fixed, persistent regions: Home Belt, Scrap Fields, Contested Territory, Ion Storm and Dead Zone. Their subdued color and ambient marks appear only where sensors have charted the map. A regional rival patrol stays near Contested Territory; Ion Storm reduces sensor reach and movement; Dead Zone slowly damages exposed hulls. Scouts explore automatically, weigh known hazards and may receive an optional, mission-only **Focus Scouting** preference by tapping a charted area or its immediate fog edge. Scouts investigate discovered unfinished signals autonomously; **Lock Target** controls Escorts independently. The Workshop offers three one-time fleet-wide Credit purchases after physical POI investigation: Advanced Sensors (125), Navigation Stabilizers (240), and Radiation Shielding (350). See [Pass I region notes](docs/pass-i-regions-biomes.md).

Pass J adds a few small square engine puffs behind moving ships and quiet biome-specific stone colors to charted asteroids. Mineral inclusions retain their own colors and existing reveal gate. The developer-only asset gallery compares moving ships and stone palettes. Pass J itself changed no simulation, economy or save schema. See [Pass J visual notes](docs/pass-j-visual-polish.md).


Pass K adds company-wide High-Power Optics (250 Credits, Laser Mining and the first valuable sample) for Aurite and Resonance Mining (2,500 Credits, Optics and investigated Experimental Probe) for Voidite. Normal Laser Miners can also extract Cryonite; Impact Miners remain limited to Ferrite and Nickel. Rivals begin raiding after purchase of the second fleet slot. Escort still unlocks only after a real sensor encounter, which awards the existing one Tech Point. Hangar shows unused slots; the first Deploy after each purchase asks once if a slot remains empty.

Pass L scores known work by expected delivered Credits per second across extraction, pickup and return; unrevealed deposits receive ordinary value until identified. Five mineral silhouettes carry through rock inclusions, loose fragments and transfers. A tap on any map point opens separate Mining and Scout focus actions, including in unknown territory. Pins persist between shifts and can be removed independently. After up to four foreground seconds of visible recall, the same fixed-step simulation finishes in short browser slices and displays the final report. Mission Control shows a copyable seed and a confirmed New Game action for a random or explicit uint32 seed, including zero. See [Pass L notes](docs/pass-l-focus-recall.md).

## Fleet and logistics

Impact Miners have 15 HP and lose 1 per valid ram; they stop deliberately ramming at 1 HP. Laser Miners have 10 HP. Enemy Scout hits take 4 HP from either Miner. Baseline cooldown is 1.0 seconds for rams and 2.0 seconds for laser shots. Each fragment uses one cargo space. Ferrite, Nickel, Aurite, Cryonite and Voidite deliver 1, 3, 10, 30 and 100 Credits respectively. An Impact Miner releases up to two fragments per ram, a Laser Miner releases one per pulse; both always carry three. The first physical delivery of Nickel or higher awards the original once-only sample discovery; legacy rich salvage keeps its eligibility. Destroyed cargo drops individual persistent salvage.

A shared transient ore-claim registry spreads Miners across distinct fragments; each may queue only as many claims as its free cargo and a Hauler cannot steal a Miner claim. Claims release on pickup, retasking, recall or loss. Hauler Operation (1 Tech Point) unlocks a Hauler in the Hangar. Each Hauler consumes one purchased Fleet Slot, carries 10 fragments, collects loose ore, takes nearby Miner cargo at a physical rendezvous and unloads at the selected station. Expanded Hauler (2 Tech Points, requires Hauler Operation) raises its capacity to 14. It does not mine or fight. Miners can still deliver independently; a full Miner only waits briefly for a nearby available Hauler and otherwise returns normally. Cargo ownership changes atomically; only station delivery credits the company. Haulers have hull, can be attacked, and drop their entire cargo as unit salvage on destruction. Shared berths prevent miners and Haulers double-booking a docking spot.

Workshop sells physical Fleet Slots (28, 58, 155, 340, 480 Credits), HQ Turret (18), Outer Outpost (450), and sequential Shift Endurance upgrades (75, 180, 400 Credits). Only upgrades whose prerequisites are met appear; an unaffordable but unlocked upgrade still shows its real cost. Hangar adjusts Impact Miner, researched Laser Miner, researched Hauler, researched Escort and unarmed Scout counts up to purchased capacity. Only unlocked types appear. At least one Miner is always required; the Scout consumes a purchased slot, cruises at 85 units/second, avoids danger at 105, senses within 165, and carries no ore or weapon. Mobile Mining Rig remains unavailable. Workshop and Hangar are tabs; Research opens a focused secondary view when relevant.

Pass G parks the doctrine selector without changing saved doctrine or engine behavior. The universal launch-site picker is also parked. A company with a built Outpost sees a small launch-site switch above Deploy, preserving and allowing changes to its saved HQ/Outpost choice. Other companies continue from HQ; neither their saved infrastructure nor the world is rewritten. See [the Pass G UI notes](docs/pass-g-ui.md).

## Discoveries and Research

Nine unique events award exactly one Tech Point each and settle once on completion, including completed losses. New findings appear in the final report. Four milestones are Far Belt Charted, First Rich Sample (on delivery), First Rival Contact and Outpost Site Surveyed. The five physical investigation sites are the Derelict Research Station, Experimental Probe, **Abandoned Cargo Relay**, **Derelict Freight Shuttle** and **Automated Sorting Archive**. Discovery alone earns no Tech. Scouts discover and investigate unfinished sites automatically without Escort research. Investigation takes four simulated seconds, pauses on interruption and persists across completed shifts. Manual Escort Lock Target and autonomous Scout investigation share one exclusive progress ledger; targets never carry over to the next mission. Mining and Hauler logistics continue in parallel.

| Research | Tech Points | Effect |
| --- | ---: | --- |
| Laser Mining | 1 | Unlock Laser Miner |
| Impact Recovery | 1 | Ram cooldown 1.0 → 0.65 seconds and recoil 0.55 → 0.40 seconds |
| Rapid Cooling | 2 | Laser interval 2.0 → 1.6 seconds; requires Laser Mining |
| Escort Program | 1 | Unlock Escort after rival contact |
| Threat Tracking | 1 | Escorts favor threats near productive units |
| Hauler Operation | 1 | Unlock 10-cargo Hauler without adding a slot |
| Expanded Hauler | 2 | All Haulers carry 14; requires Hauler Operation |

The nine one-time Tech sources fund the nine total node costs; Credits and Tech Points remain separate. Miners retain cargo three. Fleet Doctrines govern targeting and risk, while research changes the relevant type's capabilities.

## Saves

Pass L stores Mining and Scout focus pins in v14. Valid v13 and historical v7–v12 companies migrate without a reset; older companies begin with no pins. The v11 104 × 96 chart is copied unchanged. Credits, rounds, fleet, spent/earned Tech, investigated sites, doctrine, infrastructure, endurance, depleted rocks, loose ore and typed minerals persist. Legacy rock reserves and old Ferrite fragments retain their migration behavior. Live Escort targeting remains temporary. Pass M checks for a valid save without creating one at boot. Continue enters the same company; New Game only replaces it after a valid seed and confirmed, successful save. Reduced-motion preference and unrelated browser storage survive New Game. See [Pass M notes](docs/pass-m-main-menu.md).

## Validation and balance

`npm run balance` reruns the Pass D fixed-step ten-seed comparisons using fragment conservation, equal-slot fleet comparisons and multi-mission price calibration. `npm run explore` measures matched two-slot mining versus Scout exploration and live Escort investigation in the expanded world. `npm run frontier` measures all shift tiers and a purchase-driven campaign through an Outpost launch. Results and limitations are in [the Pass F report](docs/pass-f-frontier.md), [the Pass E report](docs/pass-e-fog-scout-targets.md) and [the Pass D report](docs/pass-d-balance.md). `npm test` includes camera gesture and compact lobby tests alongside deterministic fog, Scout, target, research, v10 map migration, ore conservation, last-Miner loss and four-doctrine regressions. Normal shift completion waits for loaded surviving Haulers and returning Scouts.

The new [Pass K progression report](docs/pass-k-progression.md) covers prices, prerequisites, migration and measured campaigns. Mobile Mining Rig and individual drone customization remain out of scope. Drones cannot be steered, fired or micromanaged in mission.
