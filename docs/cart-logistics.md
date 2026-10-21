# Hauler Cart repair · alpha 0.30

The Cart previously remained empty in common use. Empty carts could be dropped up to 75 units from a worker, while physical loading required a separation below 24. Ordinary pickup, handoff and freight planning counted only the Hauler's internal hold. Partially loaded field carts were also retrieved immediately or abandoned because the useful retrieval window was very short.

`src/freight.ts` now owns the shared freight-room/manifest transfer rules. Only surviving physically attached carts add capacity. Loose ore, Miner handoffs, working Rig buffers and depots can fill that space with real mineral items. A detached cart cannot accept cargo remotely. Station unloading records Cart delivery in both the general hauling count and the dedicated Cart counters.

A cart is deployed locally within 18 units of a stationary working Rig or a loaded stationary Miner. It waits for a useful load, worker departure or recall before collection. When appropriate, a nearby Hauler waits for its own partially filled Rig buffer rather than immediately abandoning the cart. Retrieval accounts for travel time and known danger. The existing 250-unit recall retrieval limit remains; an unsafe or distant abandoned load remains physical salvage, not free income.

Only successfully delivered cargo earns Credits. A working Cart can still be a poor build in a short, sparse or dangerous job. Do not treat a larger buffer, a loaded Cart or greater extraction as a promised income improvement.

Regressions cover manifest identity, overflow capacity, Miner handoff, detached-capacity exclusion, partial-load waiting/recall, physical Rig deployment/loading/collection/delivery and complete resource conservation. The new Balance Lab adds before/after income and duty-cycle measurements using the same simulation.

Prices, talent costs, environmental rules and save format are unchanged. Company saves still use v17; new counters are per-shift diagnostics, not progression or persistent rewards.
