# Rock Bottom Robotics · Alpha 0.26.0

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

A new company has one ordinary impact **Miner** in one purchased Fleet Slot. **Scout** can be assigned when capacity exists. A first real rival observation unlocks **Fighter** automatically; physically investigating the nearby Home Belt **Abandoned Cargo Relay** unlocks **Hauler**; investigating the B2 **Derelict Excavation Platform** unlocks the two-slot **Mining Rig**. The Hauler and Fighter unlocks do not charge Tech or individual ship fees. A basic Miner can investigate the safe relay without a Scout. Research choices affect all units of their role, including future assignments.

Each of Miner, Hauler, Scout, Fighter, Mining Rig and Company Core has three independent Tech levels, costing **1, 2 and 3** respectively. Each level offers two authored, exclusive choices. Miner's first choice switches the single role to **Laser Cutter** or **Ram Splitter**; its later pairs stay on the selected branch. The others' third pair follows their level-two ability. A collapsed detail on each role card previews future choices. Opening a choice sheet costs nothing; selection requires explicit confirmation. Between shifts, Respec clears one category and refunds exactly its spent Tech. Research never modifies purchased slots, role blueprints or mineral inventory.

The Rig deploys at a known rock cluster, drills finite reserves into a six-place local buffer, and receives physical Hauler collections. Its two slots replace two Miners, while Haulers and Fighters still consume one slot. It packs before relocation or recall, returns with cargo, and leaves any undelivered cart, Rig or depot contents as persistent physical salvage. Without a Hauler, a full buffer waits until recall; Hangar gives a short logistics hint. Cart manifests retain each mineral type and destroyed carts drop their actual contents once. Shared extraction-class Workshop purchases work for Laser, Ram and Rig without changing the B3–B5 economy.

Workshop still charges Credits for Fleet Slots (28, 58, 155, 340, 480), Endurance (75, 180, 400), High-Power Optics (250), Resonance Mining (2,500) and existing infrastructure. Five minerals still deliver **1 / 3 / 8 / 20 / 60 Credits**. No replacement-ship fees or new currency were added. The mission HUD, focus pins, POI interaction, report, 1×/2× speed, fog and original flat sprite language remain.

The current B1/B2 slice has a once-only Tech ledger: safe delivery, Home Belt survey, relay investigation and first capacity expansion fund early choices; charting Scrap Fields, real rival contact, first valuable/Nickel deliveries and physical B2 sites fund progression. Tier two requires delivered Nickel, tier three requires the Excavation Platform. The remaining Tech budget belongs to future advanced-region content and is not claimable yet. See [Pass P rules, stable talent IDs, all Tech sources, migration and measured comparisons](docs/pass-p-fleet-research.md).

## Saves

Valid Pass O v15 companies migrate **once** to v16. The migration keeps the seed and world geometry, every depleted reserve, fog cell, ore pickup, discovery, Credits, slots, infrastructure, POI progress, focus pin and mission count. It combines assigned Impact and Laser Miner counts, returns the recognized historical Tech cost of replaced nodes, preserves paid legacy Hauler access, and retains Fighter access after contact. The existing relay moves safely into Home Belt; the new platform is overlaid deterministically without regenerating deposits. The new save is written before deleting the old key. The older v1–v14 Pass O reset still applies only to those pre-universe saves. There is no second blanket reset.

## Earlier passes

The current visual assets follow the [approved flat art notes](docs/pass-h-art.md). The [Pass G interface](docs/pass-g-ui.md), [Pass I biomes](docs/pass-i-regions-biomes.md), [Pass L focus and recall](docs/pass-l-focus-recall.md), [Pass N mining performance](docs/pass-n-performance-mining.md) and [Pass O seeded universe](docs/pass-o-universe.md) remain relevant. Older research tables in historical documents describe their respective releases; the current tree and unlocks are in the Pass P notes. Enemy Fighter artwork is future-only in the [development asset gallery](https://djulz.github.io/aisteroids/?assetGallery=1); it does not create a new hostile class.
