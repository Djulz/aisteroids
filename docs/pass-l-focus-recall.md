# Pass L · Work selection, shared focus and recall

Alpha 0.22.0 changes autonomous choice and presentation without altering mineral prices, cargo capacity, extraction tools, damage, the world map or station settlement.

## Work and mineral art

`src/work.ts` estimates **delivered Credits per second** from known fragment price, useful cargo room, travel, extraction and pickup, return distance, known danger, nearby competing workers and a moderate Mining focus preference. A closer Ferrite fragment can beat a distant valuable deposit. Higher grades can beat low grades when the expected delivered value warrants the trip. No fixed rarity ceiling or periodic override dictates selection. Unknown rocks are provisionally priced as Ferrite and remain ineligible for an incompatible tool only after sensor identification. Mining a rock releases physical fragments; collection and return are part of the estimated job. Laser shots and impact targets use the selected rock, while miners may pick up unclaimed fragments directly under their hull without stealing another unit's claim.

`src/art.ts` draws five small deterministic silhouettes: Ferrite shard, notched Nickel, faceted Aurite, slender Cryonite and dark-centered Voidite. The same shapes and canonical colors appear on known rocks, loose ore and cargo motion. The previously approved ship, POI, background and biome art remains intact. The direct `?assetGallery=1` gallery continues to show each mineral and five stone palettes.

## Map focus

Tap an arbitrary in-bounds map point, including deep fog, for **Mining** or **Scout**. Each role has one independent marker. Selecting a marker removes only that role; a new selection replaces its prior position. Overlapping pins get separate screen-space hit areas. Drag and pinch do not trigger the tap action. A discovered signal or identified rock can still open its details from the same small popup; Escort Lock/Clear Target and physical Scout investigation remain available.

The Scout preference biases reachable frontier choices toward the chosen direction using only charted hazards and visible threats. The Mining preference biases expected work near its position; it does not reveal deposits or make a Miner cross the whole map regardless of risk or remaining shift time. A marker's animated arc appears only when an active miner has selected work nearby or a Scout currently has a target moving toward its focus. Otherwise it stays quiet. Focus pins are company preferences in v14 and survive mission completion, full fleet loss, reload and cancellation of an uncommitted mission. Escort targeting and active path/claim state remain mission-only.

## Recall and saves

On shift timeout, physical return remains visible for at most four seconds of foreground wall time. `src/recall.ts` then advances the **same** fixed-step simulation in short, yielding browser slices. Background time is never simulated as elapsed mission time. The normal `done` state still waits for actual delivery, docking and surviving Scouts; the report settles once. A bounded resolver failure shows a retry control rather than losing the result.

The v14 save keeps the v13 company intact and adds `{mining, scout}` coordinate or null preferences. Older valid saves migrate with empty preferences; the old key is removed only after writing the new key. New Game is a separate confirmed action. It validates decimal uint32 seeds from 0 to 4294967295, can choose a fresh random seed, and replaces the current company only after the new save succeeds. The active seed is visible and copyable in Mission Control. Cancelling the dialog changes nothing.

No Dead Zone creature, boss, research node, balance price, mission length or new POI is included in this pass.

## Verification

`npm test` covers expected-value ordering, independently tappable and persisted pins, v13 migration, seed boundaries and fixed-step recall settlement alongside the existing economic, fog, fleet, logistics and research suites. `npm run build` type-checks and bundles the production entry. The balance, exploration, frontier, biome and progression scripts retain bounded runs; their measured results are reported in the delivery note.
