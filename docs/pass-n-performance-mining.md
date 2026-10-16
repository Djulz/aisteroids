# Pass N · smoother simulation and coherent mining

Alpha 0.24.0 addresses reported multi-second stutters and visually unsatisfying
mining decisions. Baseline: main b4bb104 (alpha 0.23.2).

## Measured expensive work

A Node CPU profile of a controlled six-role fleet with 240 loose fragments put
most samples in Miner job evaluation, nearby-fragment searches and distance
calculations. Navigation also invalidated its single whole-field mask whenever
the ignored target rock changed. Empty-work fallback could rerun frontier search
every fixed step because its already charted destination was considered stale.

- Reassess mining jobs about every 0.25–0.325 simulated seconds, staggered by unit.
  Invalidate sooner on changed capacity/health/focus, depletion, disappearance,
  claim loss, identification or a large position jump. Physics still runs at 60Hz.
- Count nearby eligible fragments only up to usable cargo capacity. Avoid
  repeatedly allocating full neighboring-fragment arrays and sorting all jobs.
  Hauler pickup comparison evaluates each candidate once instead of rescoring
  it inside a sort comparator.
- Cache up to eight ignored-rock navigation masks per live obstacle topology.
  Rasterize circle footprints instead of querying all ~19,000 grid points.
  Depletion invalidates masks; partial HP loss does not change collision topology.
- Use deterministic A* with exact segment clearance and route shortening.
  Segment tests no longer allocate a Set/list for every grid edge.
- Retry failed paths/ore approaches after short simulated-time delays rather
  than every physics step. Empty-work frontier fallback uses its retry timer.
- Keep fixed simulation steps, with a seven-millisecond foreground catch-up
  budget and a bounded 0.2-second backlog. This favors input/rendering over a
  catch-up spiral. It does not change STEP or grant missing income.

## Mining behavior and economy

Mineral prices are **1 / 3 / 8 / 20 / 60 Credits**. Actual fragment type/count,
capacity, extraction gates and station delivery remain authoritative. Banked
Credits and historical totals are not converted; unbanked typed ore now sells
at the new registry prices. No world refill or save-version change is needed.

Work scoring charges extra quadratic distance costs for travel, station range
and distance from the last selected mining patch. It still prefers valuable
work when practically comparable, but does not maximize raw income at the cost
of constantly crossing the field. Focus and safety remain part of selection.

Partially depleted asteroids with one/two pieces get a cleanup preference. A
Miner already working such a nearby deposit finishes it before switching when
safe, compatible, not claimed by a peer, and consistent with a moved focus.
Full cargo, recall and an Impact Miner's minimum-hull rule still take precedence.
This deliberately trades some short-term income for understandable completion.
The starter regression now checks the meaningful first-slot milestone within
five shifts rather than an obsolete exact two-shift income threshold.

## Scout purchase

Existing `advancedSensors` becomes **Wide-Area Scanner**: Scout sensing doubles
from 165 to 330 world units, rather than +20%. The same radius function is used
for real sensor revelation and frontier coverage planning. Ion penalties still
apply normally. Cost remains 125 Credits, blueprint remains Abandoned Cargo
Relay, and already owned upgrades receive the improved behavior automatically.

## Bounded verification

`npm test`: **115/115 passed**, approximately 11 seconds in this environment.
`npm run build`: passed. Added behavioral tests cover target-mask reuse and
depletion, local versus distant high-tier work, actual last-fragment extraction,
planner cadence/cache invalidation, and actual upgraded sensor visibility.
Existing cargo conservation, deterministic replay, claims, save, recall,
research and UI regressions also pass.

`npm run performance` is a bounded 900-step diagnostic fixture, not a no-grants
campaign or a phone FPS measurement. `npm run performance -- 1200` increases
the loose-fragment fixture; the argument is capped at 5,000.

| Same-machine fixture | Baseline | Updated |
| --- | ---: | ---: |
| 12 alternating rock routes | 85 ms | 5–9 ms |
| Six roles, 240 fragments, 900 steps | 3,071 ms | 429 ms |
| Per-step p95 in that fixture | 5.80 ms | 1.00 ms |
| Per-step p99 | 15.55 ms | 2.20 ms |
| Worst measured step | 47.90 ms | 12.00 ms |

The updated 1,200-fragment fixture took 826 ms for 900 steps (p95 2.39 ms,
p99 3.62 ms, worst 26.34 ms). Timings fluctuate with runtime warm-up/host load.
The baseline measurement was repeated from a detached baseline checkout without
the profiler, using the same fixture. Delivered counts differ slightly because
job scoring and mineral prices intentionally changed; these are CPU comparisons,
not identical-economic-output assertions.

The broad historical `npm run balance` campaign was bounded to 30 seconds and
did not finish; no claim is made that its full campaign report was regenerated.
The short complete-mission and starter-expansion regressions passed. No physical
Android device or the user's particular lagging save was available, so these
changes substantially reduce measured hotspots without proving every possible
device-specific stall is eliminated.
