# Asset credits

Rideable solids pass (November 10, 2026): convex boulder geometry, shared face collision, tire support and contact-based sliding are original code/geometry authored with AI coding assistance in `src/solids.js`, `src/bike.js`, `src/bail.js` and `src/view.js`. The existing gravel texture is reused. No external downloads or raster assets were added.

Close camera and gentle shoulders (November 10, 2026): camera follow, bounded banking/landing response and shared terrain grading are original code authored with AI coding assistance in `src/view.js`, `src/track.js`, `src/expedition.js` and `src/landscape.js`. No new external assets or raster artwork were added.

Flank exploration pass (November 10, 2026): the 14 erosion pockets, 12 rolling mounds, eight small gaps, six rest shelves and grouped collidable rocks/groves are original code/geometry authored with AI coding assistance in `src/landscape.js`. `src/view.js` adds finer small-gap geometry and instanced boulder rendering. This pass reuses the existing credited materials and adds no external downloads or raster assets.

Wide landscape pass (November 10, 2026): the winding heightfield transform, rideable bowls, watersheds and dimensional distant ranges are original code/geometry authored with AI coding assistance in `src/landscape.js`, `src/scenery.js`, and `src/view.js`. The sky uses Poly Haven's CC0 **Kloppenheim 06 (Pure Sky)**, original photography by **Greg Zaal**, sky edits by **Jarod Guest**: [asset page](https://polyhaven.com/a/kloppenheim_06_puresky), [license](https://polyhaven.com/license). The downloaded 8K tonemapped JPG is preserved at `assets/source/kloppenheim_06_puresky.jpg`; FFmpeg resizes it to the 2048×1024, 105,478-byte `assets/runtime/mountain-sky.jpg`. The browser uses this LDR panorama as its sky with matched directional/hemisphere lights; it does not load the full HDR file or perform HDR image-based lighting. Source download: `https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/kloppenheim_06_puresky.jpg`.

Extended journey additions (November 10, 2026): the 2.64 km terrain, root ribbons, collidable forest placement, erosion cuts, optional catches, outer mountain faces and suspension compression synthesis are original code/geometry authored with AI assistance in src/expedition.js, src/scenery.js, src/view.js and src/runtime.js. Existing free textures and recordings are reused; this extension adds no external downloads or new raster assets.

Survival descent additions (November 10, 2026): layered pine crowns, instanced grass, cliff silhouettes, refuge huts, and the animated waterfall are original procedural geometry/shaders authored with AI coding assistance in `src/scenery.js` and `src/view.js`. Water, wind, and tire ambience use procedural Web Audio noise synthesis. No new downloaded models, music, or generated raster artwork were added in this pass. Existing CC0 textures and recordings remain credited below. Record AI assistance accurately when publishing; the jam host permits generated assets when the entrant has the rights to use them.

Rocky freeride pass (November 10, 2026): continuous descent grading, seven rock slabs, side recovery shelves and reshaped catch slopes are original procedural geometry authored with AI coding assistance. Bedrock reuses the credited gravel detail tile with a different material tint, grip, dust and tire-noise response. No new external assets were downloaded for this pass.

Mountain relief and grounded-flight pass (November 10, 2026): eight ridgelines, four bowls, collidable rock crowns, height-based strata, sharper background peaks and revised takeoff/contact code are original procedural work authored with AI coding assistance. Existing texture tiles and audio are reused; no additional external assets were downloaded.

Ridge Run uses a small selection of CC0 assets. Source downloads are in `assets/source` and the files loaded by GDevelop are in `assets/runtime`.

| Asset | Creator and license | Use |
| --- | --- | --- |
| [Park Dirt](https://polyhaven.com/a/park_dirt) | Christopher Melani, Poly Haven, [CC0](https://polyhaven.com/license) | Packed trail. Converted from the 1K diffuse JPEG to a 256 px grayscale detail tile. |
| [Gravel Floor 04](https://polyhaven.com/a/gravel_floor_04) | Charlotte Baglioni, Poly Haven, CC0 | Rock chute. Converted from the 1K diffuse JPEG to a 256 px grayscale detail tile. |
| [Forest Floor](https://polyhaven.com/a/forest_floor) | eye-candy.xyz, Poly Haven, CC0 | Shoulders and forest ground. Converted from the 1K diffuse JPEG to a 256 px grayscale detail tile. |
| [Bicycle Sounds](https://opengameart.org/content/bicycle-sounds) | AntumDeluge, OpenGameArt, CC0 | The original mono Vorbis spokes and bell clips. The demo uses a short spoke burst when coasting and the bell on a clear. |

The track, bike and rider geometry, pine meshes, gates, icons, wind and tire noise were made for this demo. The editor landmark material uses the workspace's plain white texture. GDevelop's FPS example was the original graphics reference. The [Dave Mirra Freestyle BMX reel](https://www.facebook.com/reel/1659721015604606) guided the weathered terrain, low chase framing, and original sign and jersey designs.

The [GDevelop BIG Game Jam #10 rules](https://itch.io/jam/gdevelop-big-game-jam-10), checked November 7, 2026, allow premade assets when the team has the rights and gives proper credit. The rules separately restrict when the game is made, require browser play, and allow one submission per person or team. The credits above cover asset provenance.

Additional sources for later passes are listed here for review. They do not ship in Ridge Run.

- [Ultimate Stylized Nature Pack](https://quaternius.com/packs/ultimatestylizednature.html), Quaternius, CC0. Select individual pines or rocks and instance them for future biomes.
- [Forest Ground 01](https://polyhaven.com/a/forrest_ground_01), Rob Tuytel, CC0. A possible mossy surface for a later trail.
- [Bicycle Pedalling Rolling Braking](https://freesound.org/people/Rudmer_Rotteveel/sounds/719482/), Rudmer_Rotteveel, CC0. Useful for separating pedal and brake cues. The source download requires a Freesound account.
- [Freewheel](https://freesound.org/people/stib/sounds/494328/), stib, CC0. A recorded hub sound for a longer loop. The source download requires a Freesound account.
- [Cycling on gravel](https://freesound.org/people/clivew/sounds/491123/), clivew, CC0. A recording to sample for future loose-surface audio. The source download requires a Freesound account.
