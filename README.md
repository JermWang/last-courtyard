# The Last Courtyard — garden and swing prototype

Editable **GDevelop 5.6.287** browser adventure for BIG Game Jam #10, theme **Keep it Alive**. Restore water to a courtyard tree using a bow, a real 3D chain, a guided block and a pressure plate. This is one connected courtyard with a raised garden, an aqueduct and a lower maintenance route. A GitHub Pages deployment is included; no jam entry has been submitted.

## Play and edit

Browser play link: https://jermwang.github.io/last-courtyard/ . Desktop keyboard and mouse recommended. The public build is served from the committed `build` folder by `.github/workflows/pages.yml`; changes to `main` run the gameplay checks and verify export freshness before deployment.

Run `python tools/serve.py` and open http://localhost:8174. The loopback server serves `build` without caching; stop it with Ctrl+C. Serve a downloaded HTML5 export over HTTP rather than opening `index.html` directly.

Open `courtyard.json` in GDevelop. The 167 native 3D terrain/mechanism objects remain editable. Gameplay runs in a documented JavaScript event on GDevelop's own scene, renderer and loop. Maintained source is in `src`; `puzzle.js` owns the guided block and latched restoration, while `physics.js` owns the common movement/tether solver.

Rebuild with `node tools/build-project.cjs`, then `powershell -File tools/export.ps1`. The latter uses the official engine installed under `.tooling`, stages the export, verifies source/resource freshness, then publishes changed files to `build`. **Regenerating the project overwrites editor changes**: transfer editor edits to the maintained source first. Ordinary GDevelop preview/export does not need the builder or the local `.tooling` folder.

## Controls

| Input | Action |
| --- | --- |
| WASD / Space | Camera-relative movement / jump |
| Hold / release left mouse | Draw / fire; aim at another valid ring while attached to transfer |
| Left-click while attached | Toggle reeling when aiming at the current ring or over open space |
| E / Q | Hold to reel / pay out (Q cancels mouse reeling). E also calls or operates the unlocked garden lift. |
| Right mouse | Release tether / cancel draw |
| R | Recover at the current checkpoint |
| Escape | Pause, audio settings, restart courtyard |
| C / F3 | Compare camera / diagnostics |

Audio starts after entering. Master, effects, music and mute settings persist locally. Restart courtyard resets all puzzle progress; ordinary recovery preserves completed restoration but resets an unfinished block pull.

## Courtyard route

1. Practise with the nearby ring, then swing across the water to the checkpoint terrace.
2. Walk around the south side of the tree planter and follow the east gallery to the waterworks.
3. Stand on the brass standing mark beyond the pressure plate, catch the ring on the wooden sluice block, and hold E. The weighted block follows its marked lane; slack chain winds in before pulling. It stops safely before the player. If fully reeled before docking, step backward and continue E; the hint explains this.
4. Docking the block depresses and latches the plate. The sluice rises, water travels along the aqueduct to the tree, the guide/plate marks turn green, and a short completion cue plays.
5. Climb the eastern stairs to the upper garden. Walk beneath the stone lintel and toward the brass operating mark. Shoot the hanging counterweight and hold E. If fully reeled, step sideways away from the weight to maintain tension. The ratchet preserves partial travel; full travel locks the bridge at garden height. Restored water is required to power this mechanism.
6. Cross the bridge north and turn right to the brass launch mark. Catch the high tower ring, hold E and move north, then release above the ledge. This ascent has no stairs: the chain brings you to the Z=400 checkpoint. Move toward the west side of the tower.
7. Catch the moving ring while it passes nearby. A valid target stays locked during the draw; the arrow leads its motion. Reel upward, ride west over the gap and release above the broad Z=460 canopy landing. Each high terrace has a recovery checkpoint.
8. Descend the canopy steps to the brass launch mark. Catch the numbered sky relay rings in order. Reel for height and transfer to the next ring while still attached. The third ring slides sideways over the higher cistern terrace. Ease off forward before releasing to land. The lower shelf catches an early drop and has stairs back to the ledge. R returns to the launch checkpoint.
9. Stand on the brass seal to open the sky cistern. The second feed runs down to the tree and raises the garden lift. After the Level 1 Complete screen, choose Enjoy the restored garden, then press E on the wooden deck to ride to the garden. E at a marked landing calls the deck back. Play again starts a fresh run.

The playable floor elevations are 0, 20, 100, 220, 340, 400 and 460 engine units, plus steps and the tree planter. The scene uses X/Y as the ground plane and Z as height. Platforms, stairs, walls, block and gates are real geometry with 3D collision volumes. The character and foliage are upright illustrated billboard planes. Near-camera overhead anchor hardware fades to preserve the close third-person view; aiming and collision remain intact.

## Artwork, sound and validation

Generated originals and exact prompts are in `assets/source`; optimized runtime images are in `assets/runtime`. Source concepts do not load during gameplay. Existing generated stone, wood, brass, character and foliage art is reused across the expanded area. The chain, arrow and mechanisms use simple geometry. Sound effects are procedural Web Audio synthesis, including block drag, plate click and sluice movement. Music is the locally packaged CC0 flute/piano/strings track “Children’s Game Music 3 - Home” by heartade. Master, music and mute controls apply; pause stops playback and resume continues it. Generated foliage now bends on subdivided billboard planes, with rooted feet and gentle synchronized gusts. A blue sky and drifting low-poly clouds surround the real floating geometry. Full sources and provenance are recorded in `ASSET_PROVENANCE.md`.

Run `node tests/physics.test.cjs`, `node tests/shot.test.cjs`, `node tests/animation.test.cjs`, `node tests/puzzle.test.cjs`, `node tests/elevation.test.cjs`, `node tests/journey.test.cjs`, `node tests/water.test.cjs`, and `node tests/grapple-input.test.cjs`. The eight suites pass, including the original routes and the new moving-anchor transfer. Tests cover the original crossing, collision/tether stability, shot ordering/recall, animation, block docking, player clearance, slack, reset persistence and connected upper/lower routes.

A previous build’s normal in-app-browser run completed the entire route without seeded prerequisites: arrival crossing, block/plate, counterweight bridge, chain-only tower ascent, moving carriage, wind-paddle swing bypass and sky cistern. Two early falls recovered safely; three subsequent R resets and a deliberate canopy fall retained completion and left no arrows/chains/voices. Pause/resume during a tethered ride and a 1280 x 720 resize also preserved state. `tests/garden-browser.json` records the DOM diagnostics. The run took about 263 active seconds plus observation pauses. There were no console errors; GDevelop emitted a nonblocking empty-texture warning at startup.

Recent measured frame windows during the route were about 54-60 fps, with roughly 0.5-1.2 ms of gameplay update time. The browser recorded seven stalls (maximum 2.276 seconds); those intervals were discarded by the physics stall guard. This is not a universal 60 fps guarantee. F3 now exposes measured draw calls/triangles; clouds are batched and visual mechanism updates run once per rendered frame instead of every simulation substep. Export sizes are measured in `tests/delivery-sizes.json`.

The full browser run preceded a final minor pass moving one obstructing support, adding the block's standing mark/hint and making elevated water a finite recovery volume. The final pass has targeted regression tests and a fresh browser check. Source art, runtime assets, GDevelop project and HTML5 export remain separate.

## Known limitations

This prototype contains the block/plate, counterweight bridge, moving-anchor crossing and final sky-cistern sequence; it is still subject to the broader original acceptance checks. The guided bridge uses a translating deck and a latching counterweight, rather than rotating planks or simulated joints. The chain uses a unilateral constraint and inexpensive visual links; it does not wrap around geometry. Generated animation retains some detail variation. Audio is implemented, but listening-based balance is still pending. An uninterrupted ten-minute stress run and broad hardware/browser performance coverage remain outstanding. The completed normal-route run includes pauses for observations. Out-of-bounds recovery uses the level envelope, and extreme upward speed is bounded; normal tangential release momentum is retained.

## Next flow direction (proposal)

Keep the courtyard as the home garden. Future pockets should repeat a clear rhythm: discover a dry water route, learn one physical use of the chain, solve a mechanism, return by a newly opened shortcut, and see permanent growth at home. No countdown or health system is needed.

- **Hanging orchard:** broad swing-only ledges, one deliberate release across depth, then a safe grassy rest point. An optional higher route rewards momentum control without blocking progress.
- **Mill passage:** water-powered moving anchors and slow paddles introduce readable timing. A block changes the water route, creating a new traversal path rather than merely opening a distant door.
- **Root terraces:** combine a counterweight ascent, a moving-anchor transfer and a final visible water feed. Earlier areas remain visible below, with shortcuts replacing repeated climbs.

Build one pocket at a time after tuning this courtyard. These are proposed extensions, not additional implemented levels.

## Y3K grass

The lawns now reuse the owner's Y3K grass: 522 instanced tufts, 4,176 curved blades and shared GPU wind. `src/grass-view.js` adapts the Godot geometry/shaders to GDevelop's existing Three renderer; `assets/source/y3k-grass` retains exact source snapshots and provenance. This supersedes the earlier generated turf pattern and sparse triangles. Grass motion uses gameplay time, so pause freezes it. No new texture download is required.

Y3K grass validation: the exported shader rendered in the browser without console errors, and walking over the lawns remained unobstructed. The hidden-preview sample measured 21.8 fps; showing the preview produced a later 50.2 fps window (0.66 ms gameplay update, p95 26.8 ms). These are session measurements, not a controlled comparison with the earlier 54-60 fps run. See `tests/y3k-grass-browser.json`.

## First-level game loop

The objective tracker shows the lower water feed, counterweight bridge, and sky cistern/tree. The first feed revives the tree partway; finishing the upper route supplies the final growth/color change, a four-note procedural cue, and a tree-focused camera reveal. Completion requires the first feed flowing, bridge locked, tower and canopy reached, and 0.8 seconds grounded on the final brass seal. Walking underneath it or swinging above it does not finish the level.

The ending clears arrows, tether, held input and motion before the reveal. Escape pauses/resumes it; Continue skips to the same completed result. The result shows active route time, shots and recoveries, without a score or failure penalty. Free exploration preserves the solved courtyard and makes R return to the overlook; it cannot retrigger the ending. Play again reloads a clean level and keeps audio preferences. No next level or cross-session game save is implied.

`src/journey.js` owns the ending state machine. Journey tests cover prerequisites, interrupted activation, pause/stalls, one-time completion, skip and free exploration, plus the final approach using actual collision geometry. The `?debug&stage=ending` URL is an explicitly seeded browser test fixture, not evidence of a full unseeded playthrough; replay removes its stage parameter.

Ending browser checks: the exported build completed its automatic reveal and skip path, froze activation/reveal during pause, returned to free exploration, survived three repeated recoveries without restarting the ending, and reset all progress from Play again. The result remained usable at 640 × 640. No console errors were captured. These were focused seeded ending tests, not a new full-route run. See `tests/journey-browser.json`; `deliverables/level-one-ending.png` is an actual screenshot from that test.

## Water and finished courtyard pass

Water now uses small three-band animated surfaces, edge foam, directional channel motion and a descending sky feed with impact rings. Arrows create a ripple and retract on basin impact. Shallow basins slow movement and produce footstep ripples/splashes; deep basins apply drag and recover the player after a short splash. Basins have finite bottoms, so water above a lower route cannot trigger recovery below it. The 20-slot ripple pool is bounded, and all motion freezes with gameplay. This is a lightweight surface/current model; swimming, buoyant blocks and volumetric fluid simulation are not implemented. The small connecting channels are visual flow, while the four main basins own player/arrow interaction.

The unused waterworks ring and isolated arrival steps were removed. The practice ring teaches safe reeling/release; crossing, tower and relay rings each support a specific physical challenge. Their hints now explain their purpose and release timing. The block, hanging weight and moving carriage remain puzzle targets.

The sky cistern has an open interior and real floor/walls. Basin edges, raised gate runners, wheel supports, aqueduct foundations, relay/ascent frames and floating foundation undersides finish the structure. High rails/parapets now sit on their decks. Framed lawns, shrubs, resting benches and landing marks organize the open areas. Curbs share one instanced draw.

Run `node tests/water.test.cjs` for finite-volume, swept arrow impact, shallow/deep response, stall safety and cistern/rail regressions. Existing route and tether tests cover the modified collision layout. Browser evidence is in `tests/water-browser.json`; seeded waterworks checks are labeled separately from normal arrival play.

Water browser checks confirmed an arrow ripple and recall, deep-basin recovery, sustained shallow wading without resets, pause, and the updated sky-feed ending. Recent observed windows ranged from roughly 44 to 60 fps in this session; this is not a controlled hardware comparison. No console errors were captured. The first crossing was retried with an early release and recovered safely; full route reachability remains covered by the existing deterministic collision/tether tests and prior full-route browser evidence.

## Mouse reel and chained transfers

After attachment, left-click toggles the reel; E remains available. A persistent hint shows Mouse reel ON. Q cancels the mouse latch and pays out. Pause, focus loss, recovery, detach, firing, reaching minimum chain length and completing a mechanism cancel the latch, preventing surprise motion on resume.

While attached, aim at a different valid ring and hold/release left mouse to transfer. The current tether stays active during the draw. Release fires a fast, visible arrow and releases the old chain without changing player velocity; the next hit creates the single new tether. Invalidated transfer targets cancel the shot and retain the old attachment where it still exists. The previous ring is excluded from that shot so it cannot immediately recatch the arrow. Moving targets retain the existing velocity-based shot lead. There is one active distance constraint at a time.

`tests/grapple-input.test.cjs` verifies mouse/E/Q intent, safe cancellation, pause cleanup and old-ring exclusion. A shared-solver simulation completes four airborne transfers along a 1,600-unit relay with only start/end floors, checking height, speed and momentum. The current playable relay has its own route checks in `tests/elevation.test.cjs`.

Focused browser check (normal arrival, no stage fixture): transferred from practice to crossing, reeled with the mouse toggle and landed at the first checkpoint. The final export also passed mouse toggle on/off, pause clearing the latch while retaining attachment, and recovery clearing tether/arrow/input state. No captured console errors. Evidence: `tests/grapple-browser.json`. Recent test windows were approximately 24-36 fps in the current desktop session; this change does not establish a 60 fps guarantee.


## Sky relay and rendering pass

The final crossing uses two fixed rings and a sliding ring, a recovery shelf, and a cistern terrace 60 units above the launch. Numbered markers show the route. Picking follows the projected rings with a small amount of hover stability. Blocked transfer clicks keep the current tether and do not toggle the reel. The camera faces the cistern on the canopy route, widens in a swing, and slows its changes during a draw.

Static stone, wood and outline meshes are batched by material and location at runtime. The individual native scene boxes remain editable. Green-tinted waterworks stone, pale upper stone, wooden relay frames, grass and a quiet synthesized breeze distinguish the route's pockets. In the same 1280 x 720 browser session the steady arrival sample changed from 37.2 fps and 455 draws to 60.0 fps and 263 draws. During the relay, recent windows ranged roughly 42–60 fps. The fixed-step route test covers 24 combinations of moving-ring phase and launch position, catch shelf stairs, terrace landing and seal activation.

The final browser build caught all three rings with two transfers from the seeded relay checkpoint, landed on the real terrace, activated the seal, completed the ending and rode the lift down to the garden. The normal arrival was also checked through the first checkpoint. The new browser run was focused on these segments. See `tests/sky-relay-browser.json` for the measurements and captured diagnostics.
