# Company guidance and director · Alpha 0.29.0

The next objective is now derived in one read-only function, currentObjective in src/progression.ts. Mission Control's expandable NEXT row, empty Workshop help and the report use it. Goals follow actual cargo delivery, owned equipment, completed investigations, the protected Aurite milestone and the selected launch station. Playing another numbered mission does not unlock a chapter.

The guidance continues through Outpost construction, storm preparation, Cryonite, Archive investigation, radiation protection, resonance extraction and Voidite. Completed late companies are not sent back to optional early discoveries. The current endpoint explicitly states that the Silent Core encounter is not available; this release does not invent a boss or completion reward.

## First text director

src/director.ts defines 17 stable English line IDs for future pregenerated voice assets. The director is calm, dry and helpful. A deterministic eight-entry priority queue deduplicates repeated observations and remembers displayed lines.

Welcome and purchase commentary appear briefly in preparation. Mission commentary uses real simulation events and real station deliveries, shown in a non-blocking seven-second overlay above the bottom controls. Blueprint lines reuse the existing acknowledged discovery cards and consume the same line ID so an unlock does not generate a second toast. One pending high-priority line may be shown in the report; remaining session lines can appear in preparation. Text is always available without an audio service.

The mission queue is separate from the saved company's history. Live contact, investigation and delivery commentary is committed with settlement, just like the existing rewards; reload of an unfinished mission cannot save its unlock history. Purchase commentary records actual successful game purchases. No simulation pause is added for ordinary commentary. Existing blueprint cards keep their original pause and acknowledgement semantics.

## Save compatibility

The company save remains v17. New companies have an empty optional aiSeen list. Old valid companies without it remain valid and inherit commentary for already completed milestones instead of replaying an introductory backlog. Unknown, duplicate or malformed presentation-history entries are normalized without discarding the company. New Game resets the history with the rest of the new company.

There are no new resource payouts, prices, research choices, blueprint fees, enemy types or region-access rules. This is guidance and presentation only.

## Verification

tests/guidance-director.test.ts checks shared objectives, purchase availability and prices, protected Aurite/Outpost sequencing, late progression, the honest current endpoint, queue priority/deduplication/bounds, old-company catch-up, physical event eligibility, failed-shift conditions and save compatibility. The normal GitHub Pages pipeline runs the complete active suite and TypeScript/Vite build before deployment.

The local execution environment was unavailable for this implementation. Full compilation and simulation verification are therefore performed by the repository CI rather than reported as local checks. A real mobile/browser visual pass is still needed for the new text surfaces.
