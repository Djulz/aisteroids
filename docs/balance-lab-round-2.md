# Balance Lab round 2 · alpha 0.30

The complete three-slot screen now has **114/114 successful jobs**, covering 19 fleet/build cases, two regions, three seeds and three persistent 45-second shifts. All 342 shift ledgers conserve physical fragments. These are controlled fixtures, not campaign affordability claims. Three seeds are an initial screen rather than a final balance verdict.

The source fingerprint is `42c5549de33c8bed3de962fef88c888bac9f2dfde51a5f70ce73037efc7b9c3f`. The source tree used during the run is identical to the published alpha 0.30 tree (`9929f49`); the original local revision and run metadata are retained.

## Selected observations

Credits/shift below are the median of each seed's mean over its three persistent shifts. All listed builds cost 3 Tech and all fleets use three slots. They are observations, not a selection of the globally best fleets.

| Fleet/build | Dense Home Belt | Nickel | Nickel zero shifts |
|---|---:|---:|---:|
| 3 Miners · Ram/Recovery | 38.7 | 43.0 | 0/9 |
| 3 Miners · Laser/Range | 32.7 | 47.0 | 0/9 |
| Miner/Hauler/Fighter · Express/Jump | 26.7 | 28.7 | 0/9 |
| Rig/Hauler/Fighter · Bulk/Cart | 35.3 | 36.7 | 3/9 |
| Rig/Hauler/Fighter · Wide Drill/Gantry | 48.3 | 52.0 | 3/9 |

Basic costs zero Tech and remains separately labelled in the full data. Adding a Hauler or Fighter replaces a producing slot; higher specialist capacity alone does not guarantee higher delivered income. Different seed geometry and persistent depletion can change which talent pays off.

## Rig navigation defect

A separate quiet diagnostic reproduces the original Nickel Cart scenario on seeds 7 and 17 at 45 seconds, plus seed 42 at 45, 60 and 90 seconds, each for three shifts. It never removes or moves obstacles or changes prices, speed or collision rules.

- Seeds 7 and 17 reach deployment and drilling. The first drill begins at approximately 15.9 and 24.8 seconds in their first shifts.
- Seed 42 never deploys or drills in any of the nine tested shifts, including the 90-second jobs. It extracts and delivers zero, with no enemies present.
- After around 25 seconds the Rig is pinned near `(1798, 2686)` while repeatedly following the same next segment. Its selected target remains rock 83.
- The segment passes obstacle 97 with about **12.85–12.96 units of clearance**. It passes the current 11-unit navigation test, but fails a 17-unit test.
- `updateRigs` calls `separateRock(..., 17)`, while shared route masks/edge checks use 11 units and route-shortening checks use 8.1. The planned route therefore does not fit the Rig's physical collision body.

This is a functional navigation defect. Increasing the shift budget or adjusting income prices cannot resolve the obstructed segment. The zero results remain in the baseline; removing the seed would hide the failure.

## Reproduce and extend

```sh
# Full paired income baseline after a proposed change.
npm run balance:lab -- --profile screen --seeds 7,17,42 --shifts 3 --out balance-results/round2-changed --workers 2 --job-timeout 120 --wall-limit 1800 --compare balance-baselines/alpha-0.30-screen-3shifts.json --assert

# Record bounded Rig state, position, route clearance and physical ledgers.
node --experimental-strip-types scripts/balance-lab/diagnose-rig.ts --out balance-results/rig-investigation
```

The income baseline retains every per-shift metric but omits the dense traces to keep it compact. The saved standalone report contains the full raw timelines. `alpha-0.30-rig-navigation.json` retains the diagnostic state/position samples and source fingerprint. The portable diagnostic was rerun and reproduced all 15 reference shift metrics and state-transition times exactly.

## Next implementation

1. Give route planning, route smoothing, waypoint skipping, goal clearance and cache keys the correct clearance for each physical unit; preserve current Miner behavior. Include a no-progress recovery/alternative-target rule for inaccessible jobs.
2. Add a seed-42 Rig regression that requires real deployment, drilling and conserved delivery, plus coverage that larger bodies cannot be routed through narrow gaps. Check recall as well as outward travel.
3. Repeat this unchanged screen and diagnostic against the repaired engine. Keep the old failing seed as a paired case and separate the functional repair from numerical balance adjustments.
4. Then widen to eight seeds, four-to-six slots, complete research paths and more shift budgets. Check paid campaign reachability separately.

This round deliberately leaves game rules and prices unchanged so the baseline records the published alpha 0.30 behavior. The report now filters by both shift duration and number of persistent shifts, and displays zero-income shift counts beside the income median.

The first functional repair and its 12-case paired rerun are documented in [the Rig follow-up](balance-lab-rig-repair.md). The original zero-income data above remains the reference.
