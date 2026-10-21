# Alpha 0.30 pilot baselines

Round 2 is complete: [findings and reproduction commands](../docs/balance-lab-round-2.md). `alpha-0.30-screen-3shifts.json` contains all 114 jobs/342 conserved shifts. `alpha-0.30-rig-navigation.json` preserves the quiet investigation demonstrating a route-clearance defect on seed 42. The defect is retained in these baselines and is not hidden by dropping its zero-income observations.

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

Recommended next step: finish the persistent three-shift screen, then widen seeds and four-to-six-slot compositions before judging long-term earnings. Use the paid campaign policies separately to check when each fleet can actually be bought. See [the full protocol](../docs/balance-lab.md).

`alpha-0.30-paid-24shifts.json` adds a complete 15-job campaign baseline: five purchase/research policies, three seeds, 24 persistent shifts starting from zero. The initial bounded attempt hit its global deadline; resuming with the same fingerprints retried censored jobs and completed all 15. No incomplete observations enter this baseline. These policies validate early B1/B2 progression, not optimal player behavior or a bought B3–B5 fleet.

```sh
npm run balance:campaign -- --seeds 7,17,42 --shifts 24 --out balance-results/campaign-changed --workers 2 --job-timeout 180 --wall-limit 1800 --compare balance-baselines/alpha-0.30-paid-24shifts.json --assert
```
