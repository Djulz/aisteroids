# Pass G · UI streamline

Alpha 0.17.0 changes presentation and camera controls. Simulation, economy, research prerequisites, map and save schema are unchanged.

## Mission

The canvas occupies the viewport at its CSS size and a capped device pixel ratio. Time left and delivered Minerals overlay it. Speed is the sole permanent button and resets to 1× for each deployment. A drag pans; two active pointers zoom around their midpoint and translate the camera. Lifting a pinch finger suppresses selection until a fresh touch. The camera's zoom limits and world bounds remain enforced.

Follow Fleet appears when the viewport-scaled distance from the camera center to the active fleet exceeds 0.42, using 0.28 to hide it again. It recenters smoothly at the current zoom and disappears during follow. With no active miners or haulers, the camera follows wrecks if all are lost, otherwise HQ. A tapped, discovered signal opens a short targeting sheet only while selected. The map has no minimap or permanently visible order controls.

The page visibility handler discards background elapsed time and resets the frame clock. There is no hidden pause state to resume. Mission settlement and saving occur once when simulation reaches `done`; the result stays until Return is tapped.

## Mission Control and report

The lobby shows available Minerals, the next objective, one Workshop or Hangar tab, contextual Research, and Deploy. The Workshop lists currently unlocked unfinished purchases at their simulation costs even when funds are insufficient; the Hangar lists only selectable types. Research shows owned and prerequisite-ready nodes. The report shows the outcome, delivered Minerals, losses, earned Tech and only genuinely new discoveries.

Doctrine remains in company saves and continues to govern the simulation, but has no selector in this pass. A built Outpost exposes a small launch-site switch, because a previously saved remote launch must remain usable and changeable. The switch changes only `launchSite`; it never rewrites infrastructure or past choices. Without an Outpost, deployment follows the existing safe HQ behavior. No save migration is introduced.
