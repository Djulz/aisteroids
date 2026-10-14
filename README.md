# AIsteroid Mining · Alpha 0.12.0

A mobile-first autonomous mining game. Configure the fleet, choose a doctrine and optional mission objective, then watch a 45-second shift. World depletion, discoveries and loose ore persist after completed shifts; Abort rolls the active shift back.

## Run

```
npm ci
npm test
npm run build
npm run dev
```

GitHub Pages publishes [the game](https://djulz.github.io/aisteroids/) after tests and build on `main`.

## Economy and fleet

- One loose fragment is worth exactly one Mineral. Impact mining releases up to two fragments per ram; Laser mining releases one per shot. Rich origin marks the delivered first-rich-sample milestone, never increases ore value.
- Both Miner types carry exactly three fragments. Extra fragments remain in the field; destroyed cargo becomes individual persistent salvage.
- Workshop sells physical Fleet Slots (6, 12, 21, 33, 48 Minerals), HQ Turret (18), and Outer Outpost (38). Hangar allocates unlocked types by count within purchased capacity. Escort requires an encounter plus research; Laser Miner requires research. Hauler and Mobile Mining Rig are unavailable.
- Mission Control retains two tabs, Workshop and Hangar. Fleet Doctrine and the compact Mission Plan remain near one-tap Deploy. The optional **Chart Far Belt** objective deliberately reaches a navigable survey point so the first exploration milestone is attainable; later rich-sample and Outpost objectives use the same existing mission plan.
- Impact Miner now commits to a target and holds an impact-anchored recovery waypoint. The previous dynamically revolving recovery point and 20-second lockout caused visible orbiting and long stalls. Baseline cooldown is 8 seconds, reduced to 5.5 by Impact Recovery. At one hull point, an Impact Miner avoids another fatal self-inflicted ram and returns; hostile attacks still threaten it.

## Tech Points and Research

Tech Points are separate from Minerals. A unique event is recorded pending during a shift, immediately displays a cyan +1 toast, and becomes permanent only when that mission settles (including a lost fleet). Abort keeps the previous company and world intact. Duplicate events, reloads and later shifts do not repeat awards.

| Unique source | Condition |
| --- | --- |
| Far Belt Charted | A drone genuinely enters the Far Belt |
| First Rich Sample | A rich-origin fragment is delivered |
| First Contact: Rival Scout | A rival scout appears for the first time |
| Outpost Site Surveyed | A drone reaches the Outer Reach site |
| Abandoned Research Station | A drone approaches the fixed research site |
| Experimental Probe Salvaged | A drone reaches the fixed probe cache |

Station and probe are visible, navigable one-shot points of interest on the permanent field. No ordinary ore pickup awards Tech. Six reachable one-time sources fund all five current nodes (total cost six); there is no repeated per-shift Tech income.

| Node | Cost | Requirement | Real effect |
| --- | ---: | --- | --- |
| Laser Mining | 1 | None | Unlocks Laser Miner type; no free Fleet Slot |
| Impact Recovery | 1 | None | Impact Miner ram reset 8 → 5.5 seconds |
| Rapid Cooling | 2 | Laser Mining | Laser pulse interval 9 → 6.8 seconds |
| Escort Program | 1 | Rival contact | Unlocks Escort allocation in Hangar |
| Threat Tracking | 1 | Escort Program | Escorts prioritize threats closest to miners over less relevant hostiles |

The type resolver applies research fleet-wide only to the relevant type. Miner cargo remains three. Doctrines still govern targeting and risk; research affects capabilities, not manual mission control. Research is an optional focused view, not a third primary tab.

## Saves

Pass A v7 companies migrate to v8 without another reset. Minerals, fleet slots/composition, infrastructure, depleted rocks, loose ore, doctrine, mission plan and milestones are retained. Historical Far Belt, rich sample, rival contact and Outpost milestones each grant their matching Tech Point exactly once at upgrade, without an in-mission toast. A v7 fleet already fielding an Escort receives a free grandfathered Escort Program entitlement without retroactive spending; other v7 companies research it normally. Pre-Pass-A v1–v6 companies remain discarded. New v8 saves validate the unique ledger and research spend.

## Validation and limits

`tests/impact-ai.test.ts` reproduces the original long recovery stall by measuring low-motion time and ram intervals across all four doctrines. For seed 7, the earlier build waited about 21 seconds until its second impact and spent about 12 seconds near-stationary during recovery. The fixed baseline reaches the second ram in about 10.5 seconds and has about 4.2 seconds low-motion mining time; it completes recall/docking. Ten fresh seed runs delivered six Minerals each after the AI repair. This brings the first Fleet Slot within one good completed shift, a progression change to review in a future economy pass rather than silently altering its price.

Tests cover actual exploration routes, all six one-shot sources, abort and loss settlement, save migration and idempotence, research costs/prerequisites, type-specific sim effects, mineral conservation, combat, doctrine and mission endings. The existing fixed-step world and 45-second shift are preserved.

Hauler logistics (including cargo 10 → 14), Mobile Mining Rig, individual drone customization and further Research nodes remain future work.
