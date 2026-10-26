# Ion Storm and Dead Zone · Alpha 0.32

## Cryonite operation

The Outpost remains the frontier harbor. Survey the Experimental Probe, buy Navigation Stabilizers for 600 Credits, extend the shift to 90 seconds and focus an identified Cryonite deposit. Storm interference now reduces unprotected movement to 70% and sensors to 45%; stabilizers restore 98% and 95%. These modifiers affect actual simulation movement and scanning, not a mission-number bonus. A Fighter protects the work group from the three existing seeded Ion Storm patrols; a Hauler or a second Miner changes how many physical fragments reach the harbor before recall.

Existing deposits keep their IDs and positions. Cryonite reserves increase from density 9 to 26 per deposit radius unit, while each physical fragment still pays 20 Credits. Seeds 7, 17 and 42 each hold at least 4,000 potential Cryonite Credits before depletion: enough in principle to buy 1,600-Credit Radiation Shielding and 2,400-Credit Resonance Extraction. Potential stock is not guaranteed income. The operation must actually mine, collect and dock that value, and fleet losses or other spending extend the payback.

## Voidite expedition

The Sorting Archive still unlocks Radiation Shielding; Extraction Class II still precedes Resonance Extraction. With both installed, either Miner path or a Mining Rig can work Voidite, and the cargo must physically return to a station. The deposit details explain both requirements. Unshielded expeditions can survey the Dead Zone but cannot harvest Voidite or collect loose Voidite. Haulers already reject unshielded Dead Zone jobs. Thus repeated disposable missions cannot assemble a free stockpile or trigger the delivery milestone while bypassing protection. Existing v17 company saves and finite resource ledgers remain intact.

Three native lifeforms appear at seeded Voidite habitats, after all existing enemy site IDs: two mobile Rift Lurkers and one fixed Radiant Spore. They do not appear in Home Belt or the Outpost harbor, do not spawn mid-shift and do not scale with the fleet. Their sensors require line of sight; they display an acquisition warning before a territorial strike. Radiation Shielding reduces their attack damage alongside ambient exposure. Fighters can suppress and defeat them; a route outside the habitat avoids them. Native lifeforms receive no kill-credit and return on the next shift, while Voidite depletion persists.

## Reproduction and scope

The paired Balance Lab terrains `storm_raw`/`storm` and `void_raw`/`void` use the same seed, chart, identified focus, base, fleet, build, duration, depletion and enemy population. The Storm pair changes only stabilizers. The Void pair changes only shielding; both sides own Resonance Extraction. These are controlled entitlements, not a paid campaign. The four terrains can be rerun with:

```sh
npm run balance:lab -- --profile screen --terrains storm_raw,storm,void_raw,void --only-builds basic --only-fleet miner --seeds 7,17,42 --duration 90 --shifts 2 --out balance-results/outer-frontier --assert
```

All **36/36 cases completed**, with two persistent 90-second shifts per seed and fleet. Delivered Credits summed across three seeds (six shifts per row):

| Three-slot fleet | Storm raw → stabilized | Dead Zone raw → shielded | Shielded Voidite delivered |
|---|---:|---:|---:|
| 3 Miners | 1,000 → 1,120 (+12%) | 909 → 2,252 | 26 fragments |
| 2 Miners + Fighter | 1,727 → 1,896 (+10%) | 933 → 2,164 | 29 fragments |
| Miner + Fighter + Hauler | 1,220 → 1,264 (+4%) | 664 → 1,420 | 19 fragments |

The raw Dead Zone cases delivered **zero Voidite** across all 18 shifts. They sometimes sold other minerals; the protected cases physically delivered Voidite. The extra Miner in the escorted pair outperformed substituting a Hauler at this three-slot capacity and shift length. A Hauler may help at higher slot counts or with different logistics builds; this matrix does not settle that question. Some Storm seed/fleet pairs had zero deliveries on both sides, so the aggregate is not a promise of a gain in every shift. Open the [interactive income curves and per-seed report](ion-dead-balance-report.html); the [versioned raw cases](../balance-baselines/alpha-0.32-ion-dead-frontier.json) include every shift, duty counter and two-second timeline.

`scripts/outer-frontier-campaign.ts` continues the paid seed-7 Aurite route from zero Credits and Tech through actual purchases, scouting and mineral deliveries. It is a bounded reference policy, not an optimal player or a guarantee for other seeds. Cryonite pockets can become dangerous or run dry; the reference policy redirects its explicit mining focus toward a known deposit outside nearby enemy patrols instead of repeatedly launching into a known loss. The 90-second endurance purchase also stays visible in Workshop after early Cryonite delivery, before the final extraction offer.

The [paid seed-7 run from a fresh company](../balance-baselines/alpha-0.32-outer-paid-seed7.json) starts at zero Credits and Tech, establishes the Outpost at shift 48, buys Resonance Extraction at shift 98 and physically docks five Voidite that same shift. The final objective is `frontier_complete`, with 469 Credits remaining and no losses in the final shift. This is one complete, feasible reference path rather than a typical completion time. The 50 shifts from Outpost operation to Voidite suggest the late campaign still needs pacing playtests; this pass proves the physical route and purchase reachability.

Focused 90-second fixtures with live patrols also exercised Rig + Hauler + Fighter and Laser Miner configurations on seeds 7, 17 and 42. A Rig's explicit mining focus can now address a distant Voidite pocket when sufficient shift time remains for physical travel and return. Haulers reject loose Voidite without Radiation Shielding even if it was dropped outside Dead Zone; tests cover repeated unshielded Miner missions and this salvage route.

Final validation: 103/103 active tests, TypeScript and production build, the 36/36 matched Storm/Dead Zone fixtures, six Rig and nine Laser fixture jobs, and the paid seed-7 campaign. The regenerated comparison matched the earlier recorded delivered Credits and losses in every fixture group. The reference policy did lose ships in many intermediate shifts; a mobile playtest and pacing adjustment remain important before release finishing.

The Silent Core boss and campaign ending remain outside these two chapters. The current endpoint is delivery of real Voidite.
