# Balance Lab baselines

## Alpha 0.32 Ion Storm and Dead Zone

`alpha-0.32-ion-dead-frontier.json` retains all 36 complete paired cases: three three-slot fleets × three seeds × raw/equipped Ion Storm and Dead Zone, with two persistent 90-second shifts. The Storm pair changes only Navigation Stabilizers; the Dead Zone pair changes only Radiation Shielding. Both Voidite cases already own Resonance Extraction. See [chapter findings](../docs/ion-dead-frontier.md) and [interactive income curves](../docs/ion-dead-balance-report.html). The final engine fingerprint is `527c7c955cc832f43123839c79e2ed2790faac02b1e217878c6e9f9fd4904c90`; harness fingerprint is `1596c7be2b0b29ad09bd3421df938f511470553e22a9aca3107371fd13f2b62e`.

`alpha-0.32-outer-paid-seed7.json` records the final run from a fresh zero-Credit, zero-Tech company to a physical Voidite delivery on shift 98, with the Outpost operational at shift 48. It is a single-seed deterministic purchase and focus policy, separate from the controlled entitlement fixtures.

```sh
npm run balance:lab -- --profile screen --terrains storm_raw,storm,void_raw,void --only-builds basic --only-fleet miner --seeds 7,17,42 --duration 90 --shifts 2 --out balance-results/ion-dead-changed --compare balance-baselines/alpha-0.32-ion-dead-frontier.json --assert
```

## Alpha 0.31 Aurite frontier

`alpha-0.31-aurite-frontier.json` records 18 complete paired HQ/Outpost cases (three fleet compositions × three seeds × two launch sites), each with two 90-second shifts. Both sides already own an Outpost; only launch and unloading differ. See [chapter design and observed income](../docs/aurite-chapter.md) and the [interactive report](../docs/aurite-balance-report.html). The release engine fingerprint is `c0794778d185fa6eb75820f4b5d02008ec4045d703cec97556a9c0b34ae524dd`; harness fingerprint is `8b7af4c27194b3104a9f71275e0e582910deb9492bdc51166ef61e97654b717e`.

`alpha-0.31-aurite-paid-seed7.json` records the independent purchased campaign from zero Credits and Tech through the first real Outpost Aurite delivery on shift 48. This is a single-seed deterministic policy, kept separate from the controlled paired income cases.

Repeat after a change, preserving the original baseline for an actual comparison:

```sh
npm run balance:lab -- --profile screen --terrains aurite_hq,aurite --only-builds basic --only-fleet miner --seeds 7,17,42 --duration 90 --shifts 2 --out balance-results/aurite-changed --compare balance-baselines/alpha-0.31-aurite-frontier.json --assert
```

## Earlier baselines

Round 2 is complete: [findings and reproduction commands](../docs/balance-lab-round-2.md). `alpha-0.30-screen-3shifts.json` contains all 114 jobs/342 conserved shifts. `alpha-0.30-rig-navigation.json` preserves the quiet investigation demonstrating a route-clearance defect on seed 42. The defect is retained in these baselines and is not hidden by dropping its zero-income observations.

The [Rig repair follow-up](../docs/balance-lab-rig-repair.md) pairs the same 12 Rig jobs/36 shifts against the original screen in `alpha-0.30-rig-repair-screen.json`. `alpha-0.30-rig-navigation-repaired.json` retains the matching quiet state traces. Keep both original and repaired data: seed 42's zero shifts disappear, while seed 17's Bulk/Cart transport becomes slower.

The [Hauler service follow-up](../docs/balance-lab-hauler-service.md) fixes the two blocked Hauler destinations and records the same 12 jobs in `alpha-0.30-rig-service-screen.json`. Nickel Bulk/Cart improves from 36.3 to 43.7 mean Credits/shift relative to the body-clearance repair; the old baselines remain unchanged for paired comparisons.

`alpha-0.30-hauler-service-full-screen.json` holds the complete 114-job rerun after the Hauler service repair, all 342 conserved shifts. It uses the same scenario IDs as the original three-shift screen so every fleet/build and seed can be compared directly; dense timeline samples are omitted in both compact baselines.

These JSON files retain their original run metadata, including the pre-commit revision and dirty flag. The engine fingerprint identifies the actual source under test; it is the same engine committed in alpha 0.30. Later report and statistics presentation changes do not alter these numerical observations.

`alpha-0.30-nickel-3slot.json` is a complete 57-job screen: 19 relevant fleet/build cases, three seeds, one 45-second Nickel shift with patrols. Basic costs 0 Tech; the other builds cost 3. This is a short controlled fixture, not proof of campaign affordability or settled long-term income.

Repeat it after a balance change:

```sh
npm run balance:lab -- --profile screen --terrains nickel --seeds 7,17,42 --shifts 1 --out balance-results/nickel-changed --workers 2 --job-timeout 90 --wall-limit 900 --compare balance-baselines/alpha-0.30-nickel-3slot.json --assert
```

`alpha-0.29-cart-rig.json` and `alpha-0.30-cart-rig.json` are a complete paired Cart regression: Rig + Hauler + Fighter, Bulk/Cart, three seeds, two 60-second shifts, quiet Nickel. The old engine is revision `4962425`; the same external harness is used on both checkouts.

```sh
npm run balance:lab -- --profile smoke --only-builds bulk-cart --only-fleet rig --combat quiet --seeds 7,17,42 --duration 60 --shifts 2 --out balance-results/cart-changed --workers 1 --job-timeout 120 --wall-limit 600 --compare balance-baselines/alpha-0.30-cart-rig.json --assert
```

Mean Credits per shift changed from 38.5 to 41.5 (+7.8%); the paired seed bootstrap interval for the absolute change is 0 to 5.5 Credits. Seed 42 delivered zero in both versions and must remain in the sample. The repaired Cart physically delivered 69 fragments across all six shifts, versus zero before. This validates useful transport in this scenario; three seeds are not enough to establish general balance.

Recommended next step: investigate the repaired Rig's seed 17 servicing regression, then widen seeds and four-to-six-slot compositions before judging long-term earnings. Use the paid campaign policies separately to check when each fleet can actually be bought. See [the full protocol](../docs/balance-lab.md).

`alpha-0.30-paid-24shifts.json` adds a complete 15-job campaign baseline: five purchase/research policies, three seeds, 24 persistent shifts starting from zero. The initial bounded attempt hit its global deadline; resuming with the same fingerprints retried censored jobs and completed all 15. No incomplete observations enter this baseline. These policies validate early B1/B2 progression, not optimal player behavior or a bought B3–B5 fleet.

```sh
npm run balance:campaign -- --seeds 7,17,42 --shifts 24 --out balance-results/campaign-changed --workers 2 --job-timeout 180 --wall-limit 1800 --compare balance-baselines/alpha-0.30-paid-24shifts.json --assert
```
