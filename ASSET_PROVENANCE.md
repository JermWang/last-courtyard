# Asset provenance

Recorded November 6, 2026. This register covers the movement, camera, art and action animation increments.

| Material | Origin and status |
| --- | --- |
| Gameplay, level layout, UI and sound synthesis | Created in this workspace with Codex assistance after kickoff. No copied game assets. The restoration puzzle sequence remains incomplete. |
| `assets/runtime/flat-white.png` | Locally generated 1×1 opaque white PNG for solid native 3D materials. No external artwork. |
| Sounds and sparse musical tones | Actual Web Audio oscillator synthesis in `src/runtime.js`; no sampled or licensed recordings. These are preliminary sounds, not the complete requested palette. |
| Illustrated art | Generated with built-in OpenAI image generation; retained sources, prompts and derivatives are described below. |
| Engine | Official GDevelop 5.6.287 Windows portable release: https://github.com/4ian/GDevelop/releases/tag/v5.6.287. Runtime MIT license and third-party notices are retained in the exported `LICENSE.GDevelop.txt` and bundled libraries. |
| Fonts | Browser/system font stack; no downloaded font assets. |
| Screenshot | `deliverables/first-playable.jpg`, captured directly from the working local GDevelop HTML5 export. |

Jam rules checked at https://itch.io/jam/gdevelop-big-game-jam-10. Theme supplied by the user: “Keep it Alive.” The user selected restoring the courtyard tree. The published window was November 6–15, 2026; implementation began after kickoff. AI assistance/assets must remain consistent with the host's rules and all underlying asset rights. Recheck the official rules before any eventual submission. Registration, publication and submission have not been performed.

The official GDevelop announcement at https://www.youtube.com/watch?v=IiBQ1sk5ouc was checked through its English auto-generated transcript on November 6. It confirms “Keep it Alive” at 0:10. At 0:25–0:55 the host advises quick access to gameplay, avoiding unskippable introductions and slow text, and keeping scope small enough to reserve substantial time for polish. These are design recommendations, not additional entry rules.

## Art-direction selection — November 6

The user selected a combination of the generated arcade and water-garden concepts, then clarified that the existing map was not the problem: the camera and art style need changing. These newly selected references supersede the missing original attachment for the current design exploration. The selected combination has now been integrated into the playable study.

Built-in OpenAI image generation produced the concepts. Selected reference copies are `assets/source/concepts/selected-arcade-style.png` and `selected-water-garden-style.png`. `existing-room-camera-concept-v1.png` is a new concept using those two style references and the actual first-playable screenshot as its spatial reference. Its exact prompt is stored beside it as `.prompt.txt`. It preserves the room's broad topology while exploring a lower perspective camera and combined style. It is awaiting review and is not an engine screenshot or runtime background.

No concept image is loaded during gameplay.

## Integrated generated assets — November 6

Built-in OpenAI image generation created the illustrated adventurer, shrub and thirsty tree using the selected concept images as style references. Their exact prompts are in `assets/source/cutouts/prompts.json`; retained originals have `-source.png` suffixes. `tools/prepare-art.ps1` performs bounding-box normalization, alpha-preserving resizing and six-pixel foot padding. It does not paint new artwork. Character and shrub alpha were inspected against ivory and navy backgrounds before integration.

The user then requested all needed views and a closer third-person camera. Seven additional character directions plus the original front-right view form the eight-view set. `directional-prompts.json` records the prompts. The first back view incorrectly showed the front arrow sheath; it was rejected and corrected with imagegen. The first brass texture contained unwanted hardware motifs and was also rejected. Neither rejected image is used at runtime. `direction-review.png` is a contact sheet of the retained views, not animation frames. No runtime sprite is horizontally mirrored. Trees and shrubs use upright billboarding; 3D structures use geometry and do not require view-specific painted sprites.

Generated stone, wood and corrected brass material images are retained under `assets/source/materials`, with their prompts. Their 512×512 runtime derivatives are actual UV textures applied to 3D meshes. These are stylized materials, not photographs. Exact seamlessness and strict three-color palette quantization are not claimed. Source concepts and full-resolution assets are excluded from the HTML5 export. Puzzle artwork beyond the current area remains unfinished.

## Action sprites — November 6

Built-in OpenAI image generation created eight 16-frame directional action sheets and one 16-frame grounded reeling sheet: **144 new action poses**, using the retained character views as references. `assets/source/animation/manifest.json` records each exact prompt and original generation filename. `reel.prompt.txt` records the reel prompt; its original was `exec-16094268-8423-4328-b260-76feb55f6e00.png`. All nine originals are copied into this project. No stock character assets or mirrored equipment were used.

`tools/prepare-animation.ps1` crops grid cells, normalizes hood width and root position, and assembles runtime atlases using .NET. It preserves genuine generated alpha and does not draw replacement poses. Runtime uses eight 4×4 action atlases, eight two-cell reel strips and eight aligned idle images. Contact sheets retain light/navy edge inspection; sources and QA sheets are excluded from the web export. Some generated costume/bow detail variation remains; these are a first integrated animation pass, not hand-cleaned final animation.

## Dimensional bow-and-chain feel pass

The low-poly arrow, head/barbs, fletching, alternating chain links and impact cue were constructed from simple geometry in `src/chain-view.js`; they were created in this workspace, not downloaded or image-generated. They reuse the established ivory/brass/navy/wood palette. The illustrated bow remains in the generated character frames. Flight/recall is implemented in `src/shot.js`. Layered effects in `src/runtime.js` use deterministic locally synthesized noise and oscillators; no external sound samples, paid libraries or stock models are used. `deliverables/bow-chain-feel.jpg` is an actual browser screenshot of the GDevelop build.

## Aiming and ambience polish — November 6

Built-in OpenAI imagegen edited the existing front/back full-draw frames to correct arrow perspective. Selected originals are `assets/source/animation/aim-front-v3.png` and `aim-back-v3.png`; exact prompts and generation filenames are in `aim-v3-prompts.json`. The earlier v2 four-pose variants were rejected for inconsistent proportions and are retained only among source/QA files. They are not runtime assets.

`prepare-animation.ps1` crops and normalizes the selected cutouts to the established hood width, standing height and foot baseline, then replaces only the half/full draw cells in versioned `motion-front-v3.png` and `motion-back-v3.png` atlases. These two charge states deliberately share a stable held-draw pose; original raise/release and all other action frames remain intact. The artwork is generated; the normalization and atlas assembly do not paint new art. Light/navy QA strips are stored beside the source images.

The water bed is locally synthesized filtered noise with gentle finite envelopes, at most two overlapping water voices, and the same pause/reset/mute cleanup as effects. `tools/prepare-audio-review.cjs` extracts the game's actual sound function into a local OfflineAudioContext audition page. The resulting `deliverables/courtyard-sound-palette.wav` is genuine rendered audio, not a placeholder; `tests/audio-levels.json` records default-level measurements. No external audio or licenses were added.

## Directional reel correction — November 6

A static review of all eight directional action sheets, corrected front/back draw strips and the runtime reeling strip found that the front-left reel poses placed equipment on different screen sides from that direction's approved reference. Built-in OpenAI imagegen produced the replacement two-pose strip `assets/source/animation/reel-front-left-v2.png`, using `assets/runtime/adventurer-front-left.png` as the identity and equipment-placement reference. The exact prompt is retained as `reel-front-left-v2.prompt.txt`; the original generation filename was `exec-e7eb390c-997a-4170-8c5d-78b5b3692b49.png`.

`AnimationPrep.ReelPair` performs only alpha-preserving cropping, hood-width normalization and foot alignment to create `assets/runtime/motion-reel-front-left-v2.png`. Original art and the original runtime strip remain retained. The runtime selects the corrected version for front-left reeling. The correction has been inspected as artwork and in the running front-left idle/reel transition. `reel-review.png` records the earlier runtime strip comparison that identified the mismatch.

## Waterworks expansion — November 6

The guided sluice block, pressure plate, reservoir, aqueduct, elevated garden, maintenance stairs and return gate were constructed in this workspace from native GDevelop 3D boxes and small runtime primitives. They reuse the existing generated stone/wood/brass textures and foliage; no stock assets or new external licenses were added. Tree restoration changes the tint of the existing generated tree cutout and adds simple geometric water streams/glints. The block drag, plate and sluice sounds are new local procedural synthesis in `src/runtime.js`. The older sound-audition WAV predates these three effects and is not evidence of their listening review.

## Sky route, wind and licensed music (2026-11-06)

Counterweight bridge, tower, canopy decks, carriage track and low-poly clouds: original procedural geometry. Existing generated shrub/tree cutouts bend above their roots using deterministic vertex animation; no new generated sprite frames.

**Children's Game Music 3 - Home**, by **heartade**. Source: https://opengameart.org/content/childrens-game-music-3-home . Author license: **CC0**, https://creativecommons.org/publicdomain/zero/1.0/ . Piano, flute and strings; downloaded 2026-11-06. Original WAV: `assets/source/audio/children_soundtrack_3.wav`. Runtime: `assets/runtime/courtyard-flute.mp3`, stereo 96 kbps, 85.46 seconds, no compositional edits. The local track starts after interaction, pauses/resumes with gameplay, and follows master/music/mute controls.

## Grass and route polish (2026-11-06)

Built-in OpenAI imagegen created `assets/source/grass-tile-source.png` using `assets/runtime/courtyard-shrub.png` as its palette/style reference. Exact prompt: `assets/source/grass-tile.prompt.txt`. Original generation file: `exec-fe0be542-2438-4d29-bec1-81816a598019.png`. The opaque runtime tile is a 256 x 256 bicubic resize using .NET System.Drawing, with no painted edits. It is a stylized generated material, not a photographic texture; exact three-color quantization and seamlessness are not claimed. The small grass blades, slow wind paddle, tower ring and rails are original procedural geometry. Grass tips and existing foliage bend gently; clouds are batched into one vertex-colored mesh. No new external assets or licenses were introduced.

## Y3K grass replacement

At the user's explicit request, the current grass was sourced from their local `C:/Users/dejes/GameDev/y3k` project. Read-only copies of `city/green_grass.gd`, `env/grass.gdshader`, the shared wind/noise includes, `block_lawn.gd` and the planted material are retained in `assets/source/y3k-grass`; `provenance.json` records hashes, authorization and adaptation details. `src/grass-view.js` ports the eight-blade curved tuft geometry, grass colors and GPU wind to the existing GDevelop renderer. This is reused procedural artwork, not an imagegen asset or a stock photograph. No public redistribution license for Y3K is asserted. The former generated grass tile remains archived but is excluded from project resources and gameplay. Source PBR lighting/backlight is replaced by unlit root-to-tip shading; Y3K's soft blade color transitions are retained intentionally.

## First-level ending

The restoration reveal reuses the existing generated tree cutout, water geometry and courtyard materials. Growth is rooted scaling plus tint animation; no new generated or downloaded artwork. The four-note completion cue is original Web Audio oscillator synthesis in `src/runtime.js`, routed through effects/master/mute settings. The existing licensed flute track remains the music.

## Water and structural finish

Water surfaces, banded wave/foam shader, bounded ripple pool, beveled floating foundations, support beams, garden curbs, benches and landing marks are original procedural geometry/code created in this workspace. They reuse existing generated material textures and shrub art. No new downloaded or generated image/audio assets were introduced. Water footsteps reuse the original procedural splash sound.
