# Alpha 0.27.1 · progression, discoveries and freight jobs

This fixes reports from the 0.27.0 build: a two-slot Home Belt company with
hundreds of Credits had no further offers; focused Laser Miners kept producing
ore instead of collecting it; Haulers escorted travelling empty Rigs.

## Progression

The third slot and first Endurance purchase no longer require contact or a
frontier visit. Their prices remain 48 and 32 Credits. Fighter access still
requires real sensor contact. Later slots and extraction/environment equipment
retain their actual delivery/blueprint requirements. The Workshop stays at two
offers. A loaded company with no purchases in its current preparation phase
refreshes stale offers against these rules. A legitimately gated empty Workshop
explains the next action instead of promising that any shift will unlock a buy.

## Discovery feedback

Completed Cargo Relay/Platform investigation and first contact produce an
explicit new-drone card: source, status, unit illustration, role description,
one-slot cost, Hangar instruction and GOT IT acknowledgement. The illustration
uses the existing in-game art. A live discovery pauses simulation until confirmed;
the mission does not run down behind the dialog. No time backlog is replayed.
Blueprints earned during recall are presented in Mission Control. Existing
unacknowledged unlocked roles are also presented there once.

Acknowledging a live card changes no authoritative reward ledger until the
shift settles. Settlement writes the earned role and its acknowledgement
together. Abort/reload cannot grant a role from an unfinished mission. Repeated
acknowledgement cannot create Tech, Credits or a second blueprint. Research
choices remain permanent; no respec was added.

## Cargo Relay placement and saves

The safe Home Belt relay now sits 340–460 world units from HQ, beyond starting
sensors, with a clear physical footprint. It can still be investigated by a
basic Miner after the site is actually discovered; Scout is not a prerequisite.
The deterministic post-generation site overlay changes no asteroid positions,
IDs, reserves, existing ore, Tech rewards or completed investigation ownership.
The same site ID retains its progress. Company content version advances to 2;
valid old v17 companies and their balances/fleets/research remain loadable.
There is no new company reset.

## Miner work loop

The 25-fold B2 focus preference previously applied only to rocks. Loose ore in
that same focused area now receives the same expedition preference. Once a
free, mature, known local fragment load can fill remaining cargo, pickup wins
before another mining cycle, target commitment or last-piece cleanup. Another
worker's claims are never treated as free salvage. Capacity still counts pieces,
not Credits: three Nickel pieces occupy three places and sell for nine Credits.

Unloading clears the old mining-patch anchor. Depleted rocks also stop anchoring
new work. With equal-grade nearby opportunities, the next trip from HQ is no
longer pulled toward a previous remote deposit by its patch bias. Explicit focus,
danger and genuinely different mineral value remain relevant.

## Hauler jobs

The planner scores deliverable cargo: known mature salvage clusters, loaded
stationary drilling/blocked Rigs and loaded depots. A travelling, deploying or
empty Rig is not a freight job. Known salvage can be selected beyond the old
235-unit acquisition bubble, subject to remaining work time and environment.
Existing physical Miner handoff requests and loaded-cart pickup remain supported.

Empty Haulers wait and reassess rather than escort workers or permanently dock
while future jobs can still appear. Loaded Haulers without useful further work
return. Decisions are cached for about 0.35–0.43 simulated seconds with immediate
invalidation for lost cargo/claims or changed capacity. Rig service reservations
avoid unnecessary duplicate approaches. Every pickup, handoff and station
delivery continues through the existing mineral ownership ledger.

## Bounded checks

New regressions exercise the stuck two-slot save, physical focused Nickel
delivery, salvage-before-pulse, local work after unloading, Hauler pickup/return
while a Rig is still travelling, stationary-Rig cargo eligibility, safe relay
placement across seeds, and persistent acknowledgement without duplicate rewards.
The old immediate-at-HQ relay test now checks actual discovery/physical
investigation at the relocated site rather than requiring a first-shift unlock.

These are controlled fixture results, not a claim that the user's exact saved
mission was available or that every future-region balance case is solved.

Verified with `npm test` (57/57 passing, including the physical frontier campaign),
`npm run build`, and `git diff --check`.
