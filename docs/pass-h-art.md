# Pass H · approved in-game art

Alpha 0.18.0 traces the approved flat top-down asset sheet in deterministic Canvas 2D paths in `src/art.ts`. No runtime image fetch, sprite atlas, UI layout rewrite or simulation/save change is required.

| Actual entity | Art motif |
| --- | --- |
| Impact Miner | Compact gold body and separate rectangular braces |
| Laser Miner | Same body family, small forward emitter |
| Escort | Open, reinforced gold triangle |
| Scout | Narrow gold arrowhead |
| Hauler | Wide central hold and two prominent side cargo pods; tiny filled-cargo bars |
| Existing enemy | Small red enemy Scout oriented by movement |
| HQ | Existing recognizable cream station, without printed sprite label |
| Built Outer Outpost | Distinct octagonal platform, paired cargo arms and circular port |
| Five discovered POIs | Research station, probe, cargo relay, freight wreck and sorting archive, mapped by registry ID |

Rock geometry, radius, HP and hit feedback still come from the simulation. `rockArtTier(rock, richRevealed)` returns T1 for common and unrevealed rocks, and T2 for an existing rich rock only after the established survey condition. T2 uses muted sage mineral flecks, leaving teal to indicate technology. T3 amber, T4 pale ice-blue and T5 violet are reusable art only. They do not appear in the world or grant different Minerals. Loose unit ore remains the separate gold pickup.

The enemy Fighter design is prepared in the art layer and gallery but has no current entity or spawn. Distress Beacon and Relic in the reference sheet do not correspond to game POIs and were not added. The direct `?assetGallery=1` test scene is absent from normal navigation; it renders every motif near its in-game size without reading or writing company state. Normal missions use the same functions.
