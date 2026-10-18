# Rock Bottom Robotics · Alpha 0.25.0

A mobile-first autonomous mining game. The asteroid-field main menu lets you Continue an existing company, start a new one with an explicit world seed, or adjust reduced motion. In Mission Control, choose upgrades and fleet composition, then Deploy into a 30-second active shift, upgradeable to 45, 60 and 90 seconds, followed by physical recall and delivery. The asteroid field fills the mission screen: drag to pan, pinch to zoom, tap anywhere to set persistent Mining or Scout focus, and use the contextual Follow Fleet control to return to your drones. Discovered signals can still be inspected and assigned to Fighters. The HUD shows time left and Credits delivered; the 1×/2× button changes simulation speed. Friendly sensors reveal a persistent chart across a seeded 6000 × 5200 world. Rock depletion, charted cells, discovered signals, loose ore and focus pins persist after completed shifts.

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

Impact Miners have 15 HP and lose 1 per valid ram; they stop deliberately ramming at 1 HP. Laser Miners have 10 HP. Enemy Scout hits take 4 HP from either Miner. Baseline cooldown is 1.0 seconds for rams and 2.0 seconds for laser shots. Each fragment uses one cargo space. Ferrite, Nickel, Aurite, Cryonite and Voidite deliver 1, 3, 8, 20 and 60 Credits respectively. An Impact Miner releases up to two fragments per ram, a Laser Miner releases one per pulse; both always carry three. The first physical delivery of Nickel or higher awards the original once-only sample discovery; legacy rich salvage keeps its eligibility. Destroyed cargo drops individual persistent salvage.

A shared transient ore-claim registry spreads Miners across distinct fragments; each may queue only as many claims as its free cargo and a Hauler cannot steal a Miner claim. Claims release on pickup, retasking, recall or loss. Hauler Operation (1 Tech Point) unlocks a Hauler in the Hangar. Each Hauler consumes one purchased Fleet Slot, carries 10 fragments, collects loose ore, takes nearby Miner cargo at a physical rendezvous and unloads at the selected station. Expanded Hauler (2 Tech Points, requires Hauler Operation) raises its capacity to 14. It does not mine or fight. Miners can still deliver independently; a full Miner only waits briefly for a nearby available Hauler and otherwise returns normally. Cargo ownership changes atomically; only station delivery credits the company. Haulers have hull, can be attacked, and drop their entire cargo as unit salvage on destruction. Shared berths prevent miners and Haulers double-booking a docking spot.

Workshop sells physical Fleet Slots (28, 58, 155, 340, 480 Credits), HQ Turret (18), Outer Outpost (450), and sequential Shift Endurance upgrades (75, 180, 400 Credits). Only upgrades whose prerequisites are met appear; an unaffordable but unlocked upgrade still shows its real cost. Hangar adjusts Impact Miner, researched Laser Miner, researched Hauler, researched Fighter and unarmed Scout counts up to purchased capacity. Only unlocked types appear. At least one Miner is always required; the Scout consumes a purchased slot, cruises at 85 units/second, avoids danger at 105, senses within 165, and carries no ore or weapon. Mobile Mining Rig remains unavailable. Workshop, Hangar and Research share three stable tabs. The status row shows Credits and the next objective on every tab; each tab also shows its relevant balance.

Pass G parks the doctrine selector without changing saved doctrine or engine behavior. The universal launch-site picker is also parked. A company with a built Outpost sees a small launch-site switch above Deploy, preserving and allowing changes to its saved HQ/Outpost choice. Other companies continue from HQ; neither their saved infrastructure nor the world is rewritten. See [the Pass G UI notes](docs/pass-g-ui.md).

## Discoveries and Research

Nine unique events award exactly one Tech Point each and settle once on completion, including completed losses. New findings appear in the final report. Four milestones are Scrap Fields Charted, First Rich Sample (on delivery), First Rival Contact and Outpost Site Surveyed. The five physical investigation sites are the Derelict Research Station, Experimental Probe, **Abandoned Cargo Relay**, **Derelict Freight Shuttle** and **Automated Sorting Archive**. Discovery alone earns no Tech. Scouts discover and investigate unfinished sites automatically without Escort research. Investigation takes four simulated seconds, pauses on interruption and persists across completed shifts. Manual Escort Lock Target and autonomous Scout investigation share one exclusive progress ledger; targets never carry over to the next mission. Mining and Hauler logistics continue in parallel.

| Research | Tech Points | Effect |
| --- | ---: | --- |
| Laser Mining | 1 | Unlock Laser Miner |
| Impact Recovery | 1 | Ram cooldown 1.0 → 0.65 seconds and recoil 0.55 → 0.40 seconds |
| Rapid Cooling | 2 | Laser interval 2.0 → 1.6 seconds; requires Laser Mining |
| Fighter Program | 1 | Unlock Fighter after rival contact |
| Threat Tracking | 1 | Fighters favor threats near productive units |
| Hauler Operation | 1 | Unlock 10-cargo Hauler without adding a slot |
| Expanded Hauler | 2 | All Haulers carry 14; requires Hauler Operation |

The nine one-time Tech sources fund the nine total node costs; Credits and Tech Points remain separate. Miners retain cargo three. Fleet Doctrines govern targeting and risk, while research changes the relevant type's capabilities.

## Saves

Pass O begins an incompatible v15 universe epoch. The first boot with a v1–v14 company creates and persists a new random-seeded company before deleting old company keys; an existing valid v15 save always takes precedence. If the write fails, older data remains in storage. Motion preference and unrelated local settings survive. New v15 saves persist the seed, depleted deposits, chart, loose ore, signals, research, infrastructure, fleet, doctrine and focus pins. See [Pass O notes](docs/pass-o-universe.md).

## Validation and balance

`npm test` runs the active world-epoch suite plus retained camera, art, doctrine, impact and planning regressions. `npm run balance` / `npm run progression` run the bounded purchased-fleet campaign; `npm run explore` / `npm run frontier` compare protected and unprotected Nickel work; `npm run biomes` checks five real regions. Historical Pass D–K benchmarks remain available under `npm run legacy:balance`, `legacy:explore`, `legacy:frontier`, `legacy:biomes` and `legacy:progression`, with their former map assumptions documented in [Pass O notes](docs/pass-o-universe.md).

The new [Pass K progression report](docs/pass-k-progression.md) covers prices, prerequisites, migration and measured campaigns. Mobile Mining Rig and individual drone customization remain out of scope. Drones cannot be steered, fired or micromanaged in mission.

Pass N improves navigation caching and A* routing, throttles Miner work planning to 3–4 decisions per simulated second, and caches unreachable salvage briefly. Mining favors coherent local patches and finishing the last one/two fragments. Mineral prices are now 1 / 3 / 8 / 20 / 60 Credits; existing bank balances are unchanged. The existing Advanced Sensors purchase becomes Wide-Area Scanner with twice the Scout scan radius (165 → 330), at the same price and blueprint. Run `npm run performance` for bounded route/salvage timing fixtures.

Alpha 0.24.1 fixes prolonged late-shift base idling: dispatch only requires outbound work to fit before recall, since physical return has its own time. Mining and Impact recovery choose clear approach points; units with no useful work dock and periodically check for new jobs. Run `npm run dispatch` for bounded five/six-miner depleted-field fixtures. See [dispatch notes](docs/late-game-dispatch.md).

## Pass O frontier

The generator now defines every biome, POI, deposit and territorial contact from one saved world seed. A safe Home Belt leads into Scrap Fields Nickel (3 Credits) and a sensor-discovered rival. Buying a second slot for a Scout reveals the frontier; first contact unlocks the existing Fighter Program, and a third purchased slot supports a protected mining expedition. A manual Mining pin is a strong commitment to known Scrap Fields work. Later regions remain bounded future progression. Run `npm run campaign:o` and `npm run frontier:o` for bounded deterministic measurements. The archived earlier map tests are retained in `tests/legacy/` and the active Pass O tests cover the new world and save epoch. See [implementation and measurements](docs/pass-o-universe.md).
