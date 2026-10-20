# Territorial patrols · Alpha 0.28.0

## Implemented pass: visible, inhabited space

Black unexplored space remains. Once charted, cells always show live enemies,
salvage, deposits and effects. Actual friendly sensor coverage remains separate:
it expands the chart, identifies minerals, discovers POIs and confirms First
Contact. A distant previously charted patrol does not automatically unlock a
Fighter. Investigation remains physical and permanent Tech rewards remain once-only.

All enemies are created during world construction, independently of fleet size,
upgrades and contact history. The universe seed determines 11 sites with clear
three-point patrol routes. The shift index changes the starting phase along
those routes. Four solo Patrol Drones occupy Scrap Fields; four groups of two
occupy Contested Territory; three groups of three occupy Ion Storm. Total: 21.
Home Belt and Dead Zone have no patrol ships. Timed waves, replacement spawns,
capacity scaling, proximity spawning and automatic raid expiry are removed.
Killed enemies remain dead through recall; the next shift restores the population.
No kill-credit reward or permanent enemy-clearing ledger is introduced.

Patrol geometry uses a separate cached content overlay. It does not regenerate
or renumber deposits, POIs, mineral reserves or existing salvage. Site routes
remain inside their biome and outside station footprints. Idle patrols follow
clear segments even off screen, without repeatedly pathfinding across the world.

## Combat rules

| Role | Hull | Pursuit speed | Sensors | Weapon range | Damage to Miner | Shot cooldown | Acquisition warning |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Patrol Drone | 3 | 64 | 150 | 125 | 2 | 2.1 s | 1.5 s |
| Interceptor | 6 | 94 | 190 | 135 | 2.5 | 1.8 s | 1.2 s |

Damage to logistics/rig targets is 75% of the Miner figure. Damage to Fighters
and Scouts is 1 for Patrol Drones, 1.5 for Interceptors. Existing Deflectors,
temporary shields, suppression, disabling shots, decoys, cart armor and salvage
ownership continue to apply. Scouts retain a smaller acquisition signature and
Low Signature/Ghost Survey still reduce it.

Each enemy uses patrol, alert, pursue, search and return states. Acquisition
requires its own sensors and a clear line of sight, never the player's chart.
It preserves a valid current target; Fighters can draw attention and Interceptors
favor cargo targets. Loss of contact searches the last observed position for up
to three seconds, then returns. Targets outside the territory, in Home Belt,
in Dead Zone or inside an owned Outpost harbor cannot be acquired. Generated
patrol ships cannot cross into those protected areas. Return movement prevents
indefinite kiting back to HQ. The alert state displays an amber exclamation mark
before enemy weapons can fire.

Workers price known threat proximity and the straight transport corridor.
Unprotected Miners skip actively occupied work patches and disengage from nearby
hostiles under the standard AI as well as the old Careful doctrine. Haulers
reject very dangerous jobs and withdraw from close unescorted threats. Scouts
avoid close known hostiles and release unsafe POI investigations. Fighters
consider threats near themselves/the local workforce and stop long pursuits;
chart visibility is not a map-wide attack order. These are local risk heuristics,
not a proof of an entirely threat-free path around moving enemies.

Tap a visible enemy, then Details, for its role, state, hull, sensor/territory
ranges and route overlay. Overlay segments are drawn only in charted cells,
preventing a selected ship from revealing its entire hidden route.

With Home Belt safe, the former HQ Turret becomes Station Turret: offered after
the Outpost is built, still 24 Credits, 260 range, defending the current launch
station. Existing turret purchases remain owned; no balance, save or talent reset.

## Next pass: fortified territories

Add an Enforcer and a stationary Sentry, each with a distinct silhouette and
combat behavior. Place guarded POI/mineral pockets and readable approach gaps.
Tune group composition against bought Fighter branches and transport builds.
Use a fixed regional population rather than hidden scaling or timer waves.

## Following pass: Dead Zone conclusion

Keep ordinary enemy ships out. Add radiation-fed creatures, clear telegraphs,
physical counterplay and one territorial boss that concludes the campaign.
The encounter must require the final environment equipment and a prepared fleet.
Boss rewards, persistent defeat and campaign ending belong to that pass; none
are silently granted by this release.

## Verification

Bounded behavioral checks cover launch population, stable territories, varying
starting phase, no respawn/expiry, clear biome routes across seeds, live chart
visibility without remote First Contact, sensor/line-of-sight acquisition,
warning before damage, last-position search, disengagement, Fighter protection,
local escort behavior and worker/freight risk decisions. The earlier quiet
salvage fixtures explicitly remove enemies now that patrols exist at launch.

Local verification passed the complete 65-test suite, plus the added early-contact
seed regression (0, 17 and 42) and Station Turret check. The TypeScript/Vite release
build and whitespace check passed. The bought seed-7 campaign comparison over six
shifts delivered 23 Nickel / 78 Credits with Miner + Fighter, versus 15 Nickel /
68 Credits with two unprotected Miners; both had zero Miner deaths because standard
AI can now disengage. The regression requires better physical production with
protection, rather than requiring unprotected workers to die.

The 900-step six-ship/240-fragment Node diagnostic measured p95 3.17 ms, p99 4.91 ms
and worst 16.05 ms on this host. This is a bounded simulation diagnostic, not a
mobile-rendering frame-rate guarantee. A separate three-seed long campaign was
bounded at 120 seconds and completed only seed 7 before its time limit; it is not
reported as three completed campaigns.

A further generator sweep checked 256 distributed 32-bit seeds: each produced all
11 patrol sites without a generation failure.
