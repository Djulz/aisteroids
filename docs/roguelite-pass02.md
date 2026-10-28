# Aisteroids Roguelite · Progression and defense pass 02

This experimental pass builds on the Pass 01 feature branch. Classic and its save remain unchanged. A new run uses `aisteroids-roguelite-pass02-v1`; previous prototype saves stay under their old key.

## What changed

- Near HQ, asteroids have roughly 5–10 HP instead of a minimum of 20; the outer ring holds harder Nickel worth three Credits per fragment. The local belt extends to 1450 world units. Miners move 20% faster. Fleet Slots 3–6 cost 35/60/100/160, down from 50/125/300/700.
- A Scout costs 25 Credits and uses one dedicated recon bay, not a fleet Slot. Its autonomous survey route charts the outer Nickel ring and lets Miners prioritize identified distant Nickel. It can still retrieve a physical Tech cache. The first outer discovery is announced.
- HQ has 40 HP. Pirates can choose it as a target and a destroyed HQ ends the run. A 35 Credit HQ Turret offers fixed-base defense before or alongside Fighters. Rogue ships avoid firing closer than 75 world units (95 for the Captain) and back away from targets that approach too closely. Classic patrol behavior and turret purchasing are unchanged.
- The Captain arrives after 12:00 once ten physical fragments originating more than 700 units from HQ are delivered, or at 14:00 as a fallback. Cargo keeps its source distance through transit and unload; nearby Nickel does not advance this milestone. The existing raid grace and finite enemy cap still apply.
- In Roguelite, unknown terrain is pure black, previously charted but unobserved terrain and rocks are gray, and currently visible terrain is full color. Classic retains its existing fog rendering.

## Playtest focus

Start a **New Run** on the [private phone preview](https://aisteroids-roguelite-pass01-2026.etteventuppsala.chatgpt.site/?roguelite). Try seed 7 with Scout then Turret, followed by Miners or Fighters. Compare it with Fighter-first. Watch for the first shattered rock, outer discovery, Nickel delivery and HQ damage. The old Pass 01 save is preserved but is not loaded into this run because the world economy changed.

## Validation and limits

`npm test` passes 133 tests, including the Classic regressions and new HQ, source-cargo, Scout and combat-distance checks. `npm run build -- --base ./` passes. Run `npm run roguelite:playtest -- 7 42 1337`; for alternative routes, use `--scout-turret 7 42`, `--turret-only 7`, or `--reckless 7`. All use physical purchases and no grants. Raw summaries are in `roguelite-pass02-playtests.json`.

| Seed / route | Outcome | First outer cargo | Lowest HQ HP |
| --- | --- | --- | ---: |
| 7 / Miners + Fighters | Victory 14:30 | none | 26 |
| 42 / Miners + Fighters | Victory 14:31 | none | 18 |
| 1337 / Miners + Fighters | Victory 14:30 | none | 23 |
| 7 / Scout + Turret + Fighters | Victory 12:33 | 6:55 | 14 |
| 42 / Scout + Turret + Fighters | Victory 14:33 | none | 10 |
| 7 / Turret + Miners | Victory 14:22 | 11:01 | 24 |
| 7 / unprotected Miners | HQ Lost 8:00 | none | 0 |

On seed 7 the Scout route charts the outer ring, delivers enough distant cargo to bring the Captain at 12:00, and wins at 12:33. The unprotected route loses HQ. Seed 42 shows that a Scout can still spend a long time surveying without causing an outer delivery; that is the next progression issue to tune. The HQ Turret can hold seed 7 by itself; a mobile Fighter is more useful beyond turret range.

Hauler and Mining Rig remain future work. The local world is still one authored belt with distance-based resource rings; a later pass can add distinct sites, hazards and forward logistics after the outer loop feels good on a phone. Manual Android/iOS playtesting is still needed for fog contrast, touch targets and foreground/background saving.
