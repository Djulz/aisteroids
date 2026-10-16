# Pass M · Main menu and title

Alpha 0.23.0 adopts approved menu A, a dark asteroid field with the game's existing flat rock and Miner art. The player-facing name is **Rock Bottom Robotics**. The repository, Pages path `/aisteroids/`, package identity, and `aisteroids-company-v14` save key stay unchanged.

## Navigation

Boot checks storage before showing the title screen. A valid company gets **Continue**, which enters Mission Control without deploying. With no company, **New Game** is the primary action and no default company is written. A corrupt save gets a visible warning and is left intact unless the player explicitly confirms New Game. Storage read failure is also shown and is not treated as an empty save. A supported legacy company migrates under its existing rules; a failed migration write leaves the old key untouched and shows a saving warning in the lobby.

The lobby has a quiet Main Menu action. Normal Deploy → mission → final report → Mission Control remains direct, with no extra title stop. No menu mission runs in the background; the mission frame loop starts only on Deploy and stops at the report or departure.

## New Game and Settings

The menu and lobby open one shared seed dialog. Opening or rerolling changes only a candidate drawn from browser crypto randomness; the active company and simulation RNG do not change. Decimal uint32 seeds, including zero and 4294967295, are accepted. Invalid input leaves the old company intact. The single Start New Company action writes a fresh company before replacing in-memory state; failed writes keep the old company. Cancel, Escape, and backdrop dismissal restore focus to the opener. The active seed remains selectable and copyable in the lobby or Settings, with a text-selection fallback when clipboard access fails.

Settings contains the working Reduce motion choice and active seed when available. Until the player chooses, it follows `prefers-reduced-motion`. The explicit choice is stored separately from the company and survives New Game; if that write fails, the choice still works for the current session and the panel says it was not saved. There are no audio controls because the game has no audio system.

## Decorative scene

The title canvas draws a fixed set of rocks and Miners with the reusable art functions. It uses no company seed, `World`, gameplay stepping, or progression state. DPR is capped at 2 and moving frames are capped near 30 fps. The scene stops on background visibility and is disposed on navigation; reduced motion draws a static composition.

## Verification

`npm test` and `npm run build` cover existing mission systems plus focused save, seed and preference cases. Narrow portrait, short landscape and desktop browser layouts should be checked with actual viewport rendering. Browser viewport emulation does not substitute for a physical Android device.
