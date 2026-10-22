# Aurite chapter · Contested Territory and Outer Outpost

## Player route

1. Deliver Nickel and physically investigate the Derelict Research Station in Scrap Fields. Buy Deflector Shields and Extraction Class II. A Fighter, sufficient shift endurance and freight capacity are useful preparation, rather than invisible mission-number gates.
2. Scout Contested Territory, identify an accessible Aurite deposit and focus a protected work group there. Extraction alone is not a delivery. The fragment must reach HQ; the first such delivery awards its existing Tech milestone.
3. Bring home Aurite on a shift launched with Deflectors, physically survey the Outpost site, and buy the 600-Credit station. The shielded-delivery flag means precisely that the equipped shift docked real Aurite, not that an enemy was required to fire at it. The flag is never awarded for cargo left behind or destroyed.
4. Construction selects the Outpost for the next launch and replaces a stale HQ mining focus with the nearest *identified*, undepleted Aurite deposit, if one is known. The player can still select HQ. A subsequent real Aurite delivery to the Outpost harbor completes the local operation and leads into the Probe and Ion Storm objectives.

## Fortified territory

The previous 11 seeded patrol sites and their IDs remain stable. Two of the Contested patrol groups replace their Interceptor with a slow, durable Enforcer. Two additional stationary Sentries guard actual Aurite pockets deeper inside Contested Territory. The two closest Aurite deposits to the Outpost retain an approach without a Sentry parked beside them. No new enemy is spawned mid-shift or scaled to the player's fleet. The Enforcer, Sentry, old Patrol Drone and Interceptor use the same sensor, line-of-sight, warning, territory and recall rules, with distinct silhouette, hull, speed, range and damage. A Sentry does not pursue outside its position; it can be suppressed or disabled by Fighter research. Enemies remain outside HQ, Dead Zone and a built Outpost's harbor.

The generated Sentry positions use a separate overlay. They do not alter saved asteroid IDs, reserves, POIs or explored cells. A 256-seed generation sweep and the dedicated chapter tests guard this geometry.

A diagnosed progression stall was that an explicit mining focus received expedition priority in Scrap Fields only. Known, extractable deposits under a player's focus now receive the same priority in Contested Territory and later regions. Unidentified resources, inaccessible deposits, threat avoidance, finite reserves and physical return still apply.

## Measuring Outpost value

Balance Lab's `aurite_hq` fixture uses the same purchased-Outpost entitlement, fully charted field, chosen Aurite pocket, seed, fleet, equipment and finite depletion as `aurite`. Its only operational difference is launching and unloading at HQ rather than at the Outpost. The report's curves compare *actual delivered Credits* over repeated shifts, and the raw traces expose delivered Aurite. These are declared controlled fixtures; they do not claim the company could already afford the equipment.

[Open the interactive comparison](aurite-balance-report.html) or inspect the [complete 18-case baseline](../balance-baselines/alpha-0.31-aurite-frontier.json). Each case runs two 90-second shifts on seeds 7, 17 and 42 with the Basic build and three fleet slots. The fleet families are one Miner with one Fighter and one Hauler, two Miners with one Fighter, and three Miners without escort. Mean delivered Credits per shift:

| Fleet | HQ launch | Outpost launch | Seed-level Outpost totals (two shifts) |
| --- | ---: | ---: | --- |
| 1 Miner + Fighter + Hauler | 55.5 | 52.0 | 0 / 224 / 88 |
| 2 Miners + Fighter | 67.2 | 127.7 | 308 / 346 / 112 |
| 3 Miners, no escort | 76.8 | 66.0 | 0 / 396 / 0 |

The escorted composition gains 60.5 Credits per shift in this short paired comparison. The unescorted composition fails outright at the frontier on two seeds, so the Outpost alone does not guarantee income. These are all delivered Credits, including other minerals; they do not isolate Aurite sales. Three seeds, two shifts and finite local deposits do not prove a stable long-run rate or recovery of the 600-Credit construction cost. The separate paid campaign below checks whether the route is attainable from zero resources.

```sh
npm run balance:lab -- --profile screen --terrains aurite_hq,aurite --only-builds basic --only-fleet miner --seeds 7,17,42 --duration 90 --shifts 2 --out balance-results/aurite-frontier --assert
```

`scripts/aurite-campaign.ts` continues the existing paid B1/B2 campaign at zero starting Credits and Tech. It buys the relevant upgrades through real offers and attempts the physical Aurite, site survey, construction and first Outpost delivery. This is a bounded reference policy, not an optimal player or an entitlement fixture.

The [seed 7 paid run](../balance-baselines/alpha-0.31-aurite-paid-seed7.json) begins from zero at shift 1, completes the previous campaign segment at shift 19, physically delivers six shielded Aurite at HQ on shift 33, buys the 600-Credit Outpost before shift 48, and docks 14 Aurite there during shift 48. It finishes with 123 Credits and the next Navigation Stabilizers objective. No ships are lost in that first Outpost shift. The record contains every continuation shift; it establishes one feasible purchase path, not the typical number of shifts for other seeds or player strategies.

```sh
npm run campaign:aurite -- 7 70
```

## Compatibility and limits

Existing v17 companies retain Credits, Tech, world geometry and built Outposts. Saves without `outpostOperated` load with that flag false. Previous Outposts keep the grandfathered protected-delivery milestone. A new milestone is awarded only by real Aurite cargo returned from the Outpost. The Outpost cost and ore payouts are unchanged. The next Ion Storm and Dead Zone chapters remain separate work.
