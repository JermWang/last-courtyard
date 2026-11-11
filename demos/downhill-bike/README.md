# Downhill Bike — Ridge Run

A third-person GDevelop mountain-bike descent about reaching shelter alive. The mountain spans 2.64 km downhill, about 1.64 km across, and drops about 1,429 m through an open summit, forest, rocky waterfall gorge, and lower valley. Its central terrain sweeps more than 300 m sideways, with rideable wooded flanks and rolling bowls that reconnect below. There are no marked routes: erosion cuts have multiple shallow crossings, obstacles can be passed on either side, and choices reconnect.

The summit retains its jump layout. The broad mountain uses gentler shoulder drops and summit edges, lower and wider rolling hills, and more distant outer rises so traversing sideways does not immediately meet a steep bank. Jumps are constructed against the same grading as the ground. The extension adds four larger optional gaps, raised root patches, collidable forest trunks and five erosion cuts. The wide flanks add 14 diagonal erosion pockets with shallow crossings and open ends, 12 rolling mounds, eight small optional gaps with downhill catches, and grouped boulders and groves. Six flank resting pockets bring the total to 15 usable rest shelves. Jump approaches, landings and rest centres stay clear of solid obstacles. All these terrain features use the same height sampler for rendering and bike contact.

Dirt, grass, roots, and loose rock have different grip and visible surface treatments. Grass and pine boughs sway. Irregular outer watersheds screen the finite safety bounds from ordinary riding views. The mesh continues beyond those bounds into distant mountain slopes. Overlapping 3D ranges and a compact HDRI-derived cloud panorama replace the old flat sky and two skyline curtains. Background ranges, waterfall and refuge buildings are decorative; the terrain inside the bounds uses the shared collision sampler. This remains a finite mountain, not an infinite world. Solid boulders share an instanced draw call to keep the extra obstacle density inexpensive.

The extension keeps a continuous fall line, with eight substantial rock spurs, four bowls, seven broad rock slabs, exposed bedrock and wooded pockets. Broken boulder crowns use real rideable collision faces; taller, sharper distant peaks complete the mountain silhouette. Open saddles and space around the spurs preserve different ways down. Recovery shelves sit to the sides. Bedrock grips more firmly than loose scree and produces less dust. Low-profile takeoffs and broad catches keep smaller jumps closer to the ground; flight uses the same unassisted bike solver.

## Play and edit

[Play the published solo build](https://jermwang.github.io/last-courtyard/downhill-bike/). GitHub Pages serves this static export alongside the courtyard. Crew multiplayer requires the Node/WebSocket server described below. The publishing workflow checks both games and verifies that this export matches the maintained source.

Open `downhill-bike.json` in GDevelop 5.6.287 or newer. For browser play, run `npm ci` and `npm start` in this folder with Node.js 22 or newer, then visit [localhost:8184](http://localhost:8184/). This serves `build/` and the crew WebSocket server. For solo static hosting, serve `build/`, or run `python tools/serve.py` and visit [localhost:8182](http://localhost:8182/).

The maintained JavaScript is in `src/`; the editable GDevelop scene runs it as a scene event. GDevelop owns startup, rendering, resources, and frame scheduling. From the workspace root, rebuild with `node demos/downhill-bike/tools/build-project.cjs`, then `powershell -ExecutionPolicy Bypass -File demos/downhill-bike/tools/export.ps1` using the installed workspace tooling.

## Controls

- **W / Up:** pedal. **A/D / Left/Right:** steer and balance.
- **Shift:** brake; brake while turning for a controlled rear-wheel slide.
- **Space:** bunny hop. In the air, **W/S** adjust nose pitch and **A/D** adjust lean.
- **Hold either mouse button and drag:** look and choose a heading through the normal steering/lean solver. A/D takes steering priority while mouse-look stays active. Release to return to the chase view. No pointer lock.
- **C:** higher scouting view. Mouse movement only looks while scouting or airborne; landing clears the old look target.
- **Q/E:** kick left/right in crew races.
- **R:** fresh solo restart. **Escape:** pause/settings. **F3:** diagnostics.

Mouse enablement, sensitivity, sound volume, and solo progression persist in this browser. Zero volume mutes everything. Escape, focus loss, and resize release mouse control. A stalled frame cannot accumulate unlimited physics time.

The chase camera sits 5.8–6.7 m behind the rider depending on speed, with a higher view of the bike and approaching terrain. It retains restrained speed widening, at most 1.5 degrees of turn banking, gentle airborne lift and a small damped landing dip. Ground clearance and foliage occlusion keep the rider visible. Hold C for the wider scouting view; release it to return to normal chase framing.

## Journey and recovery

Stop for about a second on the central part of a broad outlook to save a rest point. After falling, **Return to last rest** keeps riding time, falls, saves, and clean landings. **Restart at summit** starts fresh. Rest points last only for the current run. Arrival shows a recap and offers **Ride again** or **Next descent**. Clean best times for this longer course use separate storage from the old short mountain.

Coast off a lip for a lower flight, or hop for more distance. Look for a downhill catch and match it with W/S and A/D. **Practice a landing** isolates the last attempted gap. A grounded bike follows the contact plane instead of retaining stale vertical velocity, and hopping applies a bounded impulse away from the surface. Aligned landings have the same suspension tolerance on ordinary terrain, rocks and jump catches. Moderate misalignments can be saved; severe impacts bail with a specific cause and measurement. Trunk and rock grazes preserve motion along the obstacle; direct high-speed impacts crash.

Rock faces are rideable surfaces. Their rendered geometry, tire contact and ragdoll collisions share the same convex shapes; solid trunks use matching tapered faces. Landing success depends on surface angle, impact speed and bike alignment. You can land on a boulder, ride across it, then roll or hop off. A steep face struck from below still blocks the bike. Contacts preserve sliding motion instead of pushing the rider to a circular perimeter. There is no automatic landing nudge. Crashes play out in place and the ragdoll settles naturally; only an explicit restart or recovery button moves you back to a start/rest point.

Tire noise changes with surface, speed, slip, and braking. Suspension compression drives short quiet mechanical cues; landings add impact sound. Wind eases in the forest, and waterfall audio follows distance. Browser audio starts after interaction; pause/reset clears transient voices.

## Friends

**Ride with friends** creates a private crew for two to four riders. Everyone gets the same seed and start time. A square close kick bails another rider; a glancing kick shoves them. Crashes are DNF, and the fastest clean finish wins. The round limit is ten minutes for the longer mountain. Pausing does not stop the shared clock. A finisher allows the host to advance; otherwise retry or return to the lobby.

For online hosting, deploy this folder's Dockerfile to a single HTTPS process supporting same-origin WebSocket upgrades. Rooms live in server memory. Bike physics runs in each browser; this is private-friend multiplayer, without authoritative anti-cheat. Client/server protocol version 21 rejects incompatible old builds. No deployment or jam submission is performed by building locally.

## Validation and limits

`npm test` covers the calibrated summit physics, eight calibration itineraries plus six winding/wide-flank itineraries including a mirrored stage and a faster gravity-driven descent, all 15 usable rest shelves, all four larger optional gaps at three approach speeds before and after bending, raised roots, direct/glancing tree impacts, mouse intent, recovery, kicks, and crew results including seeded finish heights. Flank checks verify shallow crevice crossings and open ends, plus each of the eight small gaps at five coast speeds and two bunny-hop speeds, continuing through the full runout on the default and a mirrored mountain (112 cases). Grading checks sample five traverses; 421 of 442 checked sections descend more steeply than 20%, excluding jumps and shelves, with no uphill sections. The regraded Quarry catch and full runout also pass at 46, 54 and 62 km/h.

Landing-feel checks cover 36 aligned contacts across three materials and twelve bank/grade combinations, four slope-hop heights, and all 19 gaps at two coast speeds. Small-gap flights stay below 0.85 seconds in those coast cases; larger drops stay below 1.4 seconds. Solid-contact tests cover nine rock-face landings, angle sensitivity, severe impacts, rolling off onto terrain, swept face collisions, the real summit outcrop's sloped edge, no circular sideways shove and no automatic relocation. Legacy landing-guide flags are checked to have no effect on the airborne trajectory.

An isolated Chrome browser at 1280×800 completed the mountain-relief export in **220.4 seconds via the wide left flank**, with no falls, pauses or console errors. The controller stopped pedaling after the summit and used steering/braking at a 15 m/s target. Median sampled performance was **59.93 fps** (10th percentile 52.83; minimum sampled 42.55). One long frame was bounded by stall protection. This was an automated run through normal physics, not a manual new-player test or proof of every possible line. The 4–6-minute exploration target still needs human playtesting. Later stages vary the seed within the same authored layout; they are not separately designed levels.

Separate browser checks cover actual mouse drags, keyboard override, a practice jump, resize, preference persistence, the synthetic blur handler, scenery viewpoints, decoded sound files, audible rolling/compression output, and silent pause. The flank pass also captures three crevice viewpoints and lands four small gaps in-browser, including a keyboard bunny hop and the final valley jump. The solid-contact browser pass lands on an actual outcrop, coasts off onto terrain, checks a hard-impact ragdoll and verifies that no restart happens automatically. The camera pass checks close framing and terrain clearance, steering, scout return, resizing and an airborne-to-grounded landing. `tools/check-browser.cjs` requires Playwright Core (or its directory in `PLAYWRIGHT_PATH`) and Chrome. QA observation/control hooks are injected only into the test session, never shipped. Browser export is **2.69 MB** (2,688,791 bytes) uncompressed across 94 files.

[Asset credits and provenance](ASSET_CREDITS.md)
