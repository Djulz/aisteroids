# Pass K · Mineral economy and autonomous frontier

Alpha 0.21.0 uses one spendable Credit balance. A fragment always occupies one cargo space; its type determines value **only after delivery**. No new Tech sources were added.

| Mineral | Credits / fragment | Medium reserve | Normal biome | Impact | Laser |
| --- | ---: | ---: | --- | --- | --- |
| Ferrite | 1 | ~12 | Home Belt | Yes | Yes |
| Nickel | 3 | ~18 | Scrap Fields | Yes | Yes |
| Aurite | 10 | ~12 | Contested Territory | No | High-Power Optics |
| Cryonite | 30 | ~9 | Ion Storm | No | Yes |
| Voidite | 100 | ~6 | Dead Zone | No | Resonance Mining |

Mineral assignment hashes a stable rock ID and world seed within its fixed biome. Station harbors always get Ferrite. Stone tint follows biome; small identified inclusions follow mineral family. Unknown deposits use generic inclusions. The default seed 7 has 168 deposits: 66 Ferrite / 768 fragments / 768 Credits; 67 Nickel / 1,151 / 3,453; 19 Aurite / 219 / 2,190; 7 Cryonite / 63 / 1,890; 9 Voidite / 52 / 5,200. These are finite reserves, not shift respawns. Small seeded fields vary around the biome distribution targets.

| Seed 7 biome | Deposit count by mineral | Finite obtainable Credits |
| --- | --- | ---: |
| Home Belt | 25 Ferrite | 279 |
| Scrap Fields | 22 Ferrite, 34 Nickel | 2,042 |
| Contested Territory | 8 Ferrite, 19 Nickel, 19 Aurite | 3,241 |
| Ion Storm | 5 Ferrite, 5 Nickel, 7 Cryonite | 2,234 |
| Dead Zone | 6 Ferrite, 9 Nickel, 9 Voidite | 5,705 |

## Extraction and prerequisites

- Laser Mining still costs one Tech Point and enables Laser Miner. Its 2.0-second shot extracts one compatible fragment (1.6 seconds with existing Rapid Cooling).
- Impact extracts up to two compatible fragments per ram, taking its existing one self-damage and 1.0-second cooldown (0.65 with Impact Recovery).
- High-Power Optics costs **250 Credits**, requires Laser Mining and the existing once-only first rich sample milestone, now earned from a physical T2+ delivery. It enables Aurite for all Laser Miners.
- Resonance Mining costs **2,500 Credits**, requires Optics and the investigated Experimental Probe. It enables Voidite. Neither upgrade costs Tech Points.
- Advanced Sensors (125), Navigation Stabilizers (240) and Radiation Shielding (350) retain their POI prerequisites and soft environmental effects. Fleet slots remain 28 / 58 / 155 / 340 / 480, Endurance 75 / 180 / 400 and Outpost 450. No existing price changed.

Ore has a stable ID, position and mineral ID. A Miner or Hauler owns an ordered array of typed cargo fragments; its numeric `cargo` and `richCargo` accessors derive from that array for older diagnostics/fixtures. Claims use unique ore IDs and free physical spaces. Handoff moves items atomically; gradual unload moves items into pending transfer effects. Transfer expiry credits the summed integer prices and records delivered fragment counts by mineral. Wrecks drop one typed fragment per carried item. `lostValue` describes uncredited destroyed cargo and never subtracts Credits. Settlement is guarded by mission round and awards discoveries once.

Miners consider only surveyed rocks with a compatible tool. They compare known value, travel and return distance, visible hostile danger and biome risk, then retain their target until a clearly better one appears. Before a sensor identifies a deposit, scoring treats its value as uncertain. Loose ore claims favor valuable reachable fragments without violating capacity. A brush against an incompatible rock does not mine or damage it.

## Rivals, investigation and fleet capacity

One-slot companies begin without Home Belt raids. Buying the second slot permanently activates seeded Enemy Scout arrivals even if the player assigns fewer ships. The regional Contested patrol becomes active when that area is approached/charted. At most two normal rivals coexist; arrivals avoid the current sensor bubbles and ship positions, use local pursuit limits, leave after a bounded operating window and avoid Dead Zone. Company progress and capacity shorten later raid gaps. First valid sensor detection awards exactly the original one Tech Point, then Escort Program can be researched for one point. No kill is required.

Scouts automatically choose discovered unfinished POIs that are safe and reachable before recall. Each site has one exclusive investigator and four simulated seconds of persistent work. Danger, death, recall or route changes pause progress; normal settlement persists it, Abort does not. The thin world-space bar appears only while a ship works. Optional Scout priority, Survey Focus and Escort Lock Target are separate mission-only preferences. An Escort manually sent to a POI shares the same progress ledger; it is never required to unlock investigation.

The Hangar badge and `Fleet X/Y` use current composition. A new slot purchase leaves composition unchanged. The next eligible Deploy with unused new capacity opens one dialog; Open Hangar does not acknowledge it, Deploy Anyway acknowledges that capacity level, filling all slots also resolves it. Old underfilled companies receive the count but no retroactive dialog. A later purchase creates a new reminder.

## Save migration and conservation

Save key **`aisteroids-company-v13`** accepts v7–v12. Old Credits, totals, rounds, fleet, Tech, discoveries, chart, Outpost, launch preference, doctrine and equipment survive. Migration snapshots all 168 old rock maxima, including untouched rocks omitted from the sparse `rockHp` map; depleted and partial values stay exact. This prevents a new reserve density from refilling a legacy field. Old loose ore becomes one-credit Ferrite at its saved position with `rich` sample eligibility intact. v13 validates typed minerals, upgrade prerequisites, partial POI progress, identified rocks and capacity reminder level. New fields remain empty/default for valid old saves. The new save is written before old game keys are removed; a second parse/migration does not inflate reserves or currency.

## Validation and limitations

Run `npm test`, `npm run build`, `npm run balance`, `npm run explore`, `npm run frontier`, `npm run biomes` and `npm run progression`. The routine progression command simulates 20 shifts for each of seeds 7, 19 and 41. For the entire T5 route, run `npm run progression -- 7 100` explicitly; this fixed-step campaign can take several minutes. Long runs report each completed shift with its frame count and elapsed time. The harness uses normal purchases and research, settlement and a legal Scout Survey Focus at the next charted edge. It caps each mission at 18,000 frames and each campaign at 100 shifts. It logs the resource inventory and the first actual delivery of each mineral, first contact, bought upgrades and POI discoveries. Controlled mixed-cargo tests prove 1+3+100=104 and 14 Voidite=1,400 on arrival, with no credit at handoff. Legacy migration, early contacts across seeds 7/19/41 and paused/resumed Scout investigation are tested directly.

The long seed 7 route reaches High-Power Optics, the Outpost, Resonance Mining and a delivered Voidite through finite resources. Later fleets may lose ships often; reassigning a valid composition remains free. The current Escort materially cuts losses, while replacing one Miner can reduce gross income in quieter early shifts. The no-grants progression harness is a measured route, not a promise that every autonomous composition will reach T5 quickly. The Dead Zone radiation lifeform and final boss belong to Pass L.

With the measured growth composition and legal edge Survey Focus, seed 7 bought slot 2 after shift 4, met a rival and researched Escort after shift 5, delivered Nickel at 10, Cryonite at 39, bought Optics at 47, delivered Aurite and bought Outpost at 80, bought Resonance at 97 and delivered Voidite at **99**. It earned 5,056 Credits through shift 99 and still had 50 Voidite fragments in the field. Seed 19 reached Optics by shift 41 and seed 41 reached Nickel by shift 13 in bounded 50-shift runs; seed 41's Scout-heavy composition suffered 68 Miner losses by shift 50 and had not yet bought Optics. It retained abundant finite Ferrite/Nickel, and the Escort swap is available after contact. These are actual fixed-step outputs, not a guarantee for every seed or spend order.

In a matched 18-shift comparison (seeds 7/19/41, six ordinary shifts each after contact), two Miners delivered 198 Credits with 31 Miner losses; one Miner + Escort delivered 147 with **zero** Miner losses. At three slots, three Miners delivered 277 with 43 Miner losses; two Miners + Escort delivered 276 with **zero** Miner losses. The protective value is clear, but the two-slot protected fleet does not yet exceed the unprotected fleet's gross Credits in this sample. This is a measured balance limitation, not a claim of higher income.
