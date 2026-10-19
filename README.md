# Rock Bottom Robotics · Alpha 0.27.1

A mobile-first autonomous mining game. [Play the current release](https://djulz.github.io/aisteroids/). Continue a saved company or start a seeded one, prepare a fleet in Mission Control, and deploy into a timed shift with physical recall. Drag and pinch the full-screen asteroid field, set Mining or Scout focus by tapping, and use Follow Fleet when detached. Only delivered cargo earns Credits. The persistent 6000 × 5200 world remembers fog, exhausted rocks, salvage, discoveries, infrastructure and focus pins.

## Run

```sh
npm ci
npm test
npm run build
npm run balance
npm run compare:p
npm run explore
npm run performance
npm run dispatch
npm run dev
```

The GitHub Pages workflow tests and builds each commit to `main` before publishing.

## Fleet and research

A new company starts with one deliberately basic impact **Miner** in one Fleet Slot. Its three-place hold waits for the first shift's recall when full. Real delivered Ferrite buys **Cargo Awareness** (3 Credits), then **Navigation Assist** (6), then **Work Planner** (12), one offer per preparation phase. A first real rival observation unlocks **Fighter**; physically investigating the nearby Home Belt **Abandoned Cargo Relay** unlocks **Hauler**; investigating the B2 **Derelict Excavation Platform** unlocks the one-slot **Mining Rig**. Blueprints and fleet assignments cost no separate Credits or Tech. Scout can be assigned once capacity exists.

Each of Miner, Hauler, Scout, Fighter, Mining Rig and Company Core has three Tech levels costing **1, 2 and 3**. Each level has two choices. Research opens after the basic workshop introduction; level two requires delivered Nickel, and level three requires an investigated Probe and delivered Aurite. A choice sheet previews both effects and requires confirmation. Confirmed choices are permanent for this company; a different build requires a New Game. Valid earlier companies retain their chosen paths.

The Rig deploys at a known rock cluster, drills finite reserves into a six-place local buffer, and receives physical Hauler collections. It now uses **one slot**; Haulers and Fighters also use one each. It packs before relocation or recall, returns with cargo, and leaves undelivered contents as persistent physical salvage. Without a Hauler, a full buffer waits until recall. Shared extraction-class Workshop purchases work for Laser, Ram and Rig.

Workshop shows at most two contextual offers each preparation phase. Fleet Slots cost **24 / 48 / 120 / 320 / 800**, Endurance **32 / 120 / 400**, and shared Extraction Class II and Resonance **240 / 2,400**. Additional protection and infrastructure are gated by discoveries. Five minerals still deliver **1 / 3 / 8 / 20 / 60 Credits**. No replacement-ship fees or new currency were added. The mission HUD, focus pins, POI interaction, report, 1×/2× speed, fog and flat sprite language remain.

The Tech ledger remains once-only. First Aurite, Cryonite and Voidite deliveries now have their own milestone Tech. See [current progression, prices, save handling and measured campaign](docs/progression-economy.md). [Pass P](docs/pass-p-fleet-research.md) records the previous release's research design and benchmarks.

## Saves

Valid v16 companies migrate **once** to v17 with all three basic Miner capabilities grandfathered, their selected Tech, Credits, slots, infrastructure, world geometry, depletion, fog, pickups, discoveries, POI progress, focus and mission count intact. Older valid v15 companies still use the previous research refund migration and then enter v17. The new save is written before its predecessor is removed. The existing v1–v14 universe reset remains limited to those older saves; this release adds no blanket reset.

## Earlier passes

The current visual assets follow the [approved flat art notes](docs/pass-h-art.md). The [Pass G interface](docs/pass-g-ui.md), [Pass I biomes](docs/pass-i-regions-biomes.md), [Pass L focus and recall](docs/pass-l-focus-recall.md), [Pass N mining performance](docs/pass-n-performance-mining.md) and [Pass O seeded universe](docs/pass-o-universe.md) remain relevant. Older research tables in historical documents describe their respective releases; the current tree and unlocks are in the Pass P notes. Enemy Fighter artwork is future-only in the [development asset gallery](https://djulz.github.io/aisteroids/?assetGallery=1); it does not create a new hostile class.

Alpha 0.27.1 fixes the two-slot offer deadlock, gives explicit acknowledged drone-unlock cards, moves the safe Cargo Relay away from HQ, closes focused Miner pickup/delivery loops, and replaces Hauler worker-following with real freight jobs. See [work-loop fixes](docs/work-loop-fixes.md). Existing companies remain loadable.
