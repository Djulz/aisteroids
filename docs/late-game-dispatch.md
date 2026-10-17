# Alpha 0.24.1 · late-game Miner dispatch

Reported symptom: five/six drones can spend 20–30 seconds stationary at base
after nearby asteroids have been depleted. Baseline: alpha 0.24.0, `33e89ee`.

## Cause and behavior

Work selection required both the outbound journey and the home journey to fit
inside the active work timer. The simulation already has a separate physical
recall period, so useful distant jobs were rejected too early. A Miner with no
accepted work or unexplored frontier would then target the base while remaining
in its mining state.

- Check whether outbound travel and the initial action fit before recall.
  Continue charging return distance in economic scoring, preserving locality.
  Return, unloading, cargo claims and station-only Credit delivery remain physical.
- With no accepted work or reachable frontier, return and dock. While another
  unit keeps the shift active, parked Miners reassess work twice per simulated
  second, including newly identified deposits, matured salvage and released
  claims. A shift with all required units docked can finish early as before.
- At 1 HP, an Impact Miner stops considering further rams and parks after its
  allowed nearby salvage work. No in-shift repair or replacement is granted.
- Select a fixed clear standoff/recovery point around the target rather than
  putting that point inside an adjacent asteroid. Laser routes respect their
  target asteroid as a physical obstacle. Impact run-ups remain anchored.

No save migration, refill, Credit grant, upgrade or fleet-capacity change.

## Bounded reproduction

`npm run dispatch` runs three controlled 90-second-shift fixtures with fully
charted/identified geography, combat disabled, extraction/protection upgrades
and depleted near-base deposits. These isolate dispatch; they are not naturally
played campaign saves or phone FPS measurements. Each runs at most 5,401 steps.

The reported metric is the longest uninterrupted period with an empty Miner in
`mine` state, within 190 units of base and moving below 3 units/second. Normal
unloading and honest docking do not count as unexplained mining idling.

| Seed | Miners | Depleted radius | Baseline wait | Fixed wait |
| --- | ---: | ---: | ---: | ---: |
| 7 | 5 | 900 | 17.70 s | 0.07 s |
| 7 | 6 | 900 | 18.17 s | 0.07 s |
| 19 | 6 | 1,300 | 30.22 s | 0.07 s |

The fixed fleets physically traveled, extracted and delivered cargo. Results
vary with work choice; this is not an assertion of equal income across versions.

Regression tests cover late outbound mining/pickup with subsequent physical
recall, rejecting impossible outbound jobs, early no-work docking, redispatch
after salvage matures, a blocked Laser approach, minimum-hull parking and the
six-Miner depleted-field fixture. Existing conservation, claims, four-doctrine
Impact recovery, saves and deterministic mission tests remain part of `npm test`.

Validation: `npm test` passed **121/121** in about 14 seconds; `npm run build`
passed. The bounded dispatch fixtures reproduced the table above after the final
changes. The route/salvage performance diagnostic also completed.
