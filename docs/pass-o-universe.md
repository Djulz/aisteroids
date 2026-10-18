# Pass O · Universe first frontier (alpha 0.25.0)

Pass O is one incompatible world epoch, authorized by the user. On the first boot with an older company key (v1–v14), the game creates a seed once, successfully writes a fresh v15 company, then removes only those old company keys. An existing valid v15 company wins over old keys. If writing fails, old data remains untouched and the title reports unavailable storage. Motion and other unrelated local settings remain. New Game still requires its own explicit confirmation.

## World definition

`src/universe.ts` owns the seed, generator version, dimensions (6000 × 5200), Home Belt HQ, seeded Outer Outpost, Silent Core marker, five physical POIs, roughly 300 finite deposits, irregular radial biome boundaries and rival territorial homes. World generation uses separate seeded streams for places and deposits and never uses mission count. Rock IDs, shape, position and mineral assignments remain stable through depletion, round trips and completed missions. The campaign stores only depletion, explored cells, discovered POIs and company progress; it regenerates immutable geometry from the saved seed. Runtime simulation, fog, visible signals, mining and rendering consume the same generated definition. `logistics-sites.ts` remains only a derived compatibility view for old tooling.

The biome boundary has a low frequency angular warp with a guaranteed safe Home Belt around HQ. Scrap Fields is the complete first frontier: a Nickel pocket near the southwest scout approach and additional eastward clusters. The first rival contact is physical and sensor gated, reached with a purchased second slot and Scout guidance. Rivals occupy three Scrap Fields territorial anchors. They do not raid the initial one-slot company or patrol the Dead Zone. The second slot, Fighter Program, third slot, and Fighter defense are purchased/researched through the existing prices and Tech rules. A deliberate Mining pin in the known Scrap Fields commits a Miner to the frontier; unattended mining still favors the local patch. Future biomes, POIs, tech requirements, Outpost and environmental effects retain the existing rules.

The render path uses the world seed for colors, a cell-resolution fog mask rather than a 6000 × 5200 RGBA backing texture, and skips offscreen rocks. The development-only `?devmap=1&seed=7` inspection scene shows all five regions, real deposits, POIs, bases and rival anchors. It is omitted from production navigation.

## Measured progression

`npm run campaign:o` runs 16 shifts per seed with real Fleet Slot purchases, a Scout focus toward the southwest frontier, Fighter research after contact, a third purchased slot and a Mining pin in known Scrap Fields. The first 30-second one-slot mission delivered 7–9 Credits on seeds 7, 17 and 42; the first two-slot Scout shift made contact and charted Scrap Fields for all three. The third slot was purchased by mission 12. `npm run frontier:o` compares six additional missions after that purchase: one Miner + Scout + Fighter versus two Miners + Scout at the same capacity and the same Mining pin.

| Seed | Protected delivered / Nickel fragments / Miner deaths | Unprotected delivered / Nickel fragments / Miner deaths |
| --- | ---: | ---: |
| 7 | 64 / 21 / 0 | 18 / 6 / 12 |
| 17 | 54 / 17 / 0 | 30 / 9 / 9 |
| 42 | 51 / 17 / 0 | 18 / 6 / 11 |

Numbers are deterministic fixture outcomes, not a promised payout for every player choice. They establish that a purchased protective fleet can mine the B2 resource while repeated unprotected expeditions lose Miners. Mineral prices and the existing research/upgrade costs were unchanged.

## Test epoch

The original coordinate-bound Pass D–N tests in `tests/legacy/` remain in the repository as historical fixtures. They assert hard-coded coordinates, 168 rocks, a 2600 × 2400 map, v7–v14 migrations and the old `Escort` label. Those premises are intentionally false under the authorized Pass O world reset; running them unchanged produces expected failures. Their imports were adjusted for the archive location. The active suite retains camera, doctrine, art, impact recovery and mining performance tests, and adds `tests/pass-o.test.ts` for seed determinism, physical clearances, five regions, mineral assignment, atomic reset, v15 validation, finite depletion, fog, POI discovery, Hauler unloading, two-slot contact/Fighter research and the real purchased frontier campaign. Legacy fixtures must be rebased onto generated coordinates before being reactivated; this archive is explicit rather than silently changing their expected assertions.

The older benchmark commands are retained as `legacy:*` npm scripts; the ordinary balance/explore/frontier/biomes/progression commands now run bounded Pass O measurements.
