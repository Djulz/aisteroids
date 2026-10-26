# Balance Lab · alpha 0.30

This framework uses the actual fixed-step game simulation. It is a development tool, not an alternative income model or a second set of balance constants. Nothing changes prices automatically.

## Questions to answer

1. What does each fleet actually deliver at equal slot capacity, common equipment, shift length, seed and patrol phase?
2. What changes when the same Tech budget is spent on mining, logistics, protection or a mixed build?
3. Is a Rig/Hauler/Fighter chain better than the same number of ordinary ships in dense fields, and what is the travel and setup cost?
4. When does a Hauler, Cart, Jump, second Hauler or extra Fighter improve delivered income rather than only extraction?
5. Can the company buy that configuration through real progression, and how much earned cash is left after purchases?
6. Does a proposed balance change alter those same scenarios, or create new stalls, losses or conservation errors?

## Two experiment families

### Controlled fixtures

All fixtures declare their grants: blueprint/research access, full map and mineral identification, capacity, selected talents, duration, regional equipment and a frontier base for outer regions. The same generated geometry, depletion, launch conditions and patrol phase are used within a paired comparison. Each repeated shift settles into the same persistent company; resources do not refill between shifts.

These fixtures measure production/logistics/combat under specified conditions. They do not prove that the equipment is affordable at a campaign stage. In particular, a fully developed talent working in Home Belt is a controlled experiment, not a claim about the starting Miner.

Basic uses 0 Tech. The curated specialist and mixed builds use 3 Tech. Complete single-category paths use 6 Tech. The report filters and prints actual Tech expenditure. Do not call a 0-versus-6 comparison equal-spend; use it to measure the improvement bought by that investment.

### Paid campaigns

Campaign jobs start with a fresh company at 0 Credits and 0 Tech. Purchases go through the real Workshop offers and prices; research goes through real prerequisites and permanent choices. Fleet assignments respect purchased capacity and physical blueprint unlocks. Only known identified Nickel and discovered POIs influence expedition targets; the initial exploration direction is an explicit scripted policy input.

Five policies cover Ram, Laser, Bulk/Cart, Express/Jump and Rig logistics. These are reference policies, not an optimal solver or a model of human decisions. A failed policy is a diagnostic result, not proof that no player can progress. The implemented paid policy targets B1/B2 and Rig access. It does not claim a bought B3–B5 campaign.

## Coverage ladder

| Profile | Purpose | Matrix |
|---|---|---|
| smoke | Short correctness/regression check | Two three-slot logistics fleets, Basic/Cart/Jump, Nickel, one seed, one shift. |
| screen | First income comparison | Four three-slot fleets; relevant curated builds; dense Home Belt and Nickel; three seeds; three persistent 45-second shifts. |
| standard | Role-path and regional coverage | Thirteen representative fleets through six slots, all 48 complete single-role paths plus curated mixed builds, and all configured terrain fixtures. |
| exhaustive | Full cross-product of the defined dimensions | All 376 legal compositions at 2–6 slots, the 48 role paths and curated builds, configured terrain fixtures, eight seeds, three patrol phases, 30/60/90-second shifts, with/without patrols. |

The exhaustive grid has millions of possible jobs. That is a **plan**, not a completed simulation. It is deliberately not launched by the default command. Run `balance:plan` for the current exact count before narrowing the grid. The full grid covers the listed single-role paths and curated mixed builds; it is not an enumeration of every possible multi-category permanent talent combination.

Build definitions live in `scripts/balance-lab/catalog.ts`. Add a real mixed path there to study a particular interaction; its actual cost is calculated from the game talent registry. Relevant builds are selected only for fleets containing the affected role. Every proposed path is checked by the live research rules before simulation.

## Commands

```sh
# Inspect the large grid without launching it or materializing millions of jobs.
npm run balance:plan -- --out balance-results/plan

# First bounded income screen. Output directories are immutable unless resumed.
npm run balance:lab -- --profile screen --out balance-results/current --workers 2 --job-timeout 60 --wall-limit 900 --assert

# Real purchases, five policies, three seeds; target the early paid frontier.
npm run balance:campaign -- --shifts 32 --out balance-results/campaign --workers 1 --job-timeout 180 --wall-limit 1800

# Reproduce the same matrix after a balance change and compare the old JSON.
npm run balance:lab -- --profile screen --out balance-results/changed --compare balance-results/current/results.json --assert

# Same Aurite pocket, equipment and fleet from HQ versus the owned Outpost.
npm run balance:lab -- --profile screen --terrains aurite_hq,aurite --only-builds basic --only-fleet miner --duration 90 --shifts 2 --seeds 7,17,42 --out balance-results/aurite-frontier --assert

# Paired Ion Storm stabilizers and Dead Zone shielding, holding the rest fixed.
npm run balance:lab -- --profile screen --terrains storm_raw,storm,void_raw,void --only-builds basic --only-fleet miner --seeds 7,17,42 --duration 90 --shifts 2 --out balance-results/ion-dead-frontier --assert

# Purchased reference route from zero resources through Voidite; checkpointable.
npm run campaign:outer -- 7 85

# Continue the same fingerprint/config; retry bounded failures explicitly.
npm run balance:lab -- --profile screen --out balance-results/current --resume --retry-failed --job-timeout 120 --wall-limit 900

# Render a report again without rerunning the simulation.
npm run balance:report -- balance-results/changed/results.json balance-results/comparison.html balance-results/current/results.json

# Run the same protocol against a separate checkout of an earlier revision.
npm run balance:lab -- --profile smoke --engine /absolute/path/to/old-checkout --out balance-results/before

# Narrow a large sweep by region, seeds, duration, number of shifts and shard.
npm run balance:lab -- --profile exhaustive --terrains nickel --seeds 7,17,42 --duration 60 --shard 0/64 --max-jobs 10000 --plan-only --out balance-results/shard-plan
```

For actual execution of a large selected shard, remove `--plan-only`. If the selected grid still exceeds `--max-jobs`, execution refuses rather than silently sampling. `--allow-partial` is an explicit capped exploration and is marked incomplete in the report. `--shifts` applies to both fixture and campaign jobs if both are requested in one command; use separate commands to give campaigns a longer horizon.

## Measurements and figures

- Credits per completed shift: what the player actually sells.
- Credits per simulated minute including physical return: actual transport cost.
- Credits per nominal shift-budget minute: a common horizon that does not reward premature fleet death with a shorter denominator.
- Cumulative revenue and, in paid campaigns, cash after actual purchases.
- Mineral delivery manifests in the raw two-second timeline.
- Extraction, loose ore left behind, losses, remaining reserves, Hauler delivery and once-only milestones.
- Cart loading, field deployment, retrieval and station delivery. Historical engines without native counters use observed per-step manifest/state transitions.
- Hauler and Cart duty cycles measured as unit-seconds, including return and waiting.
- Resource conservation: remaining reserves + loose ore + physical holds/buffers + in-flight station transfers + delivered fragments must equal initial stock. A violation is an error, not an income result.

The standalone HTML report has filters, cumulative/per-shift curves, seed-spread bands, rankings, Hauler/Cart duty bars, campaign logs and JSON/CSV export. It needs no network or backend once saved. All raw timeline points remain available even though overview curves aggregate by shift.

Seeds are the independent units in uncertainty summaries. Patrol phases of the same seed are averaged first. The plotted 10th–90th percentile band is descriptive variation. A paired before/after comparison uses matched job IDs and a deterministic 1,000-resample bootstrap of **seed-mean deltas**. It requires at least three distinct seeds for a confidence interval; repeated shifts are not treated as independent observations.

## Safety and reproducibility

Each worker is a separate process. Default limits: 30 seconds per job, 600 seconds per invocation, 270 simulated seconds/16,200 fixed steps per shift. Longer paid campaigns usually need a larger per-job wall limit. The controller can kill a stuck worker even if the simulation loop itself does not yield.

Results are appended to `results.jsonl` after each finished job; completed shifts are also sent to the parent so a killed worker retains partial observations. A timeout is censored and explicitly labelled. It is never a zero-income sample. A global deadline leaves pending jobs visible. SIGINT/SIGTERM stop new work, kill active children and write a partial report.

Resume checks schema, engine-source fingerprint, harness fingerprint and semantic configuration. A code/config mismatch requires a new output directory. A baseline comparison intentionally permits a different engine fingerprint but pairs only identical experiment IDs. Different configurations and incomplete pairs are printed as unmatched/excluded.

`--assert` fails on pending jobs, errors, stalls, timeouts, unmatched comparison rows or invalid pairs. A financial regression also fails when the drop exceeds `--max-drop-percent` (default 10), at least three seeds are available and the paired 95% interval is entirely below zero. This is a review gate, not automatic price tuning. A wide interval or small sample remains uncertainty rather than a pass proving balance.

JSON data records the source revision, dirty state, engine hash, harness hash, configuration, dates and declared grants. Keep baselines under version control or in a saved report; generated working outputs under `balance-results/` are ignored. This release does not automatically run a multi-hour sweep on every Pages build. The ordinary test suite checks the runner contract, pairing, sharding, deadlines, conservation and cart behavior.

The first complete Nickel screen and the paired old/new Cart measurements are committed in [balance-baselines](../balance-baselines/README.md), with exact reproduction commands and sample limitations.

The full three-shift screen is now complete; see [round 2](balance-lab-round-2.md) for all counts, selected results and the isolated Rig navigation defect. `scripts/balance-lab/diagnose-rig.ts` records bounded geometric and state diagnostics without steering or modifying the simulated engine.

The [paired Rig repair](balance-lab-rig-repair.md) reruns the two Rig builds across both regions after the route/working-position fix. It removes Nickel's zero-income seeds while exposing a Bulk/Cart servicing loss on seed 17. Use its versioned before/after data before changing prices.

The [Hauler service follow-up](balance-lab-hauler-service.md) fixes that seed 17 pickup failure and compares the same 12 jobs again, including real field Cart retrieval. The first repair's lower-income result remains part of the published history.

## Recommended investigation order

1. Complete the smoke checks, including the Cart lifecycle, against the current code.
2. Run the common three-slot screen and compare only like-for-like Tech budgets.
3. Run paid B1/B2 paths, recording shifts to purchases, first contact, Nickel and Rig.
4. Extend to four through six slots, then all full role paths. Use quiet/patrol pairs to separate transport limitations from combat limitations.
5. Compare 30/45/60/90-second horizons and sparse/dense work. Add targeted mixed-build cases where the single-role results imply an interaction.
6. Validate B3–B5 as controlled production first; later implement paid regional policies before claiming economic reachability.
7. Freeze a complete multi-seed baseline and rerun the same protocol after each balance change.

Do not change prices merely to make an income target appear. First inspect extraction versus delivery, travel, danger, idle time, buffers, cargo ownership and seed variation.
