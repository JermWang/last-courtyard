class_name GreenGrass
extends Node3D
## Grass on the map's bare green ground (owner 2026-11-03: "fill out the empty green areas with some grass"): every
## upward-facing triangle the map draws in the planted material (materials/aero/aero_planted.tres: the boulevards'
## medians, the rooftop city's pocket parks and roof gardens, the river's lawn terraces, the coast's lawn lip, pier
## islands) gets wind-blown grass tufts scattered over it, the lawns' own blades (env/grass.gdshader, EnvBuilder's blade
## mesh) gathered into tufts so a big median costs a tenth of a lawn's instances. One MultiMesh per CHUNK m square,
## drawn within RANGE m and faded out (the flat green carries on past it); no shadows, no collision, no script per frame.
## Scattered once as the map builds (CityMap, before the area merge), deterministic per triangle. `--no-green-grass` off.

const PLANTED := "res://materials/aero/aero_planted.tres"
const DENSITY := 11.0 ## tufts per square metre (owner 2026-11-05: at 7, with dark roots on bright ground, a green roof read as low-poly spikes)
const TUFT_BLADES := 8 ## blades in a tuft
const TUFT_R := 0.2 ## m: a tuft's blades stand within this of its middle (before the shader's blade_scale)
const CHUNK := 32.0
const RANGE := 75.0
const UP_MIN := 0.8 ## a triangle's normal at least this far up (flat tops only, never a kerb's or a planter's side)
const MAX_TUFTS := 900000 ## a guard: past it the density is thinned to fit

var tufts := 0 ## placed (for the test)
var surfaces := 0 ## planted surfaces found
var area := 0.0 ## m2 of green ground grassed
var chunks := 0
var build_ms := 0.0
static var _tuft: ArrayMesh


static func place(root: Node) -> GreenGrass:
	if "--no-green-grass" in OS.get_cmdline_user_args():
		return null
	var g := GreenGrass.new()
	g.name = "GreenGrass"
	root.add_child(g)
	g.build(root)
	return g


func build(root: Node) -> void:
	var t0 := Time.get_ticks_usec()
	var tris: Array = [] # [a, b, c] world-space corners of every green top
	_collect(root, tris)
	var total := 0.0
	for t: Array in tris:
		total += _area(t[0], t[1], t[2])
	area = total
	var density := minf(DENSITY, MAX_TUFTS / maxf(total, 1.0))
	var cells := {} # Vector2i -> Array[Transform3D]
	for t: Array in tris:
		_scatter(t[0], t[1], t[2], density, cells)
	var mesh := tuft_mesh()
	var mat := ShaderMaterial.new()
	mat.shader = EnvBuilder.GRASS_SHADER
	mat.set_shader_parameter("root_color", Color(0.16, 0.36, 0.07)) # (rooted in the planted ground's own green, not black against it)
	mat.set_shader_parameter("tip_color", Color(0.46, 0.72, 0.2))
	for key: Vector2i in cells:
		var xforms: Array = cells[key]
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.mesh = mesh
		mm.instance_count = xforms.size()
		var buf := PackedFloat32Array()
		buf.resize(xforms.size() * 12)
		var i := 0
		var lo := Vector3.INF
		var hi := -Vector3.INF
		for x: Transform3D in xforms:
			var b := x.basis
			buf[i] = b.x.x
			buf[i + 1] = b.y.x
			buf[i + 2] = b.z.x
			buf[i + 3] = x.origin.x
			buf[i + 4] = b.x.y
			buf[i + 5] = b.y.y
			buf[i + 6] = b.z.y
			buf[i + 7] = x.origin.y
			buf[i + 8] = b.x.z
			buf[i + 9] = b.y.z
			buf[i + 10] = b.z.z
			buf[i + 11] = x.origin.z
			i += 12
			lo = lo.min(x.origin)
			hi = hi.max(x.origin)
		mm.buffer = buf
		mm.custom_aabb = AABB(lo - Vector3(0.4, 0.1, 0.4), hi - lo + Vector3(0.8, 0.6, 0.8))
		var mmi := MultiMeshInstance3D.new()
		mmi.name = "Grass_%d_%d" % [key.x, key.y]
		mmi.multimesh = mm
		mmi.material_override = mat
		mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		mmi.gi_mode = GeometryInstance3D.GI_MODE_DISABLED
		mmi.visibility_range_end = RANGE
		mmi.visibility_range_end_margin = 12.0
		mmi.visibility_range_fade_mode = GeometryInstance3D.VISIBILITY_RANGE_FADE_SELF
		add_child(mmi)
		tufts += xforms.size()
		chunks += 1
	build_ms = (Time.get_ticks_usec() - t0) / 1000.0
	print("GreenGrass: %d tufts on %.0f m2 of green (%d surfaces) in %d chunks, %.0f ms" % [tufts, area, surfaces, chunks, build_ms])


## Every drawn planted surface's upward triangles, in world space. Lawns with their own blades (BlockLawn: its turf is its
## own material) and far stand-ins (drawn only from far off) are left out; so is anything hidden.
func _collect(n: Node, out: Array) -> void:
	if n == self or n is BlockLawn:
		return
	if n is Node3D and not (n as Node3D).visible:
		return
	if n is MeshInstance3D:
		var mi := n as MeshInstance3D
		if mi.mesh and mi.visibility_range_begin <= 0.0:
			for s in mi.mesh.get_surface_count():
				var m := mi.get_surface_override_material(s)
				if m == null:
					m = mi.mesh.surface_get_material(s)
				if mi.material_override:
					m = mi.material_override
				if m == null or m.resource_path != PLANTED:
					continue
				surfaces += 1
				_tris(mi, s, out)
	for c in n.get_children():
		_collect(c, out)


func _tris(mi: MeshInstance3D, s: int, out: Array) -> void:
	var arr := mi.mesh.surface_get_arrays(s)
	var v: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
	var idx: PackedInt32Array = arr[Mesh.ARRAY_INDEX] if arr[Mesh.ARRAY_INDEX] != null else PackedInt32Array()
	var xf := mi.global_transform
	var n := idx.size() if not idx.is_empty() else v.size()
	for i in range(0, n - 2, 3):
		var a := xf * v[idx[i] if not idx.is_empty() else i]
		var b := xf * v[idx[i + 1] if not idx.is_empty() else i + 1]
		var c := xf * v[idx[i + 2] if not idx.is_empty() else i + 2]
		var nrm := (b - a).cross(c - a)
		if nrm.length_squared() < 1e-8:
			continue
		nrm = nrm.normalized()
		if absf(nrm.y) < UP_MIN:
			continue # (a side; either winding counts as a top)
		out.append([a, b, c])


static func _area(a: Vector3, b: Vector3, c: Vector3) -> float:
	return (b - a).cross(c - a).length() * 0.5


## Tufts over one triangle, seeded by its corners (the same grass every load).
func _scatter(a: Vector3, b: Vector3, c: Vector3, density: float, cells: Dictionary) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = hash([snappedf(a.x, 0.01), snappedf(a.z, 0.01), snappedf(b.x, 0.01), snappedf(c.z, 0.01)])
	var want := _area(a, b, c) * density
	var count := int(want) + (1 if rng.randf() < want - floorf(want) else 0)
	for k in count:
		var r1 := rng.randf()
		var r2 := rng.randf()
		if r1 + r2 > 1.0:
			r1 = 1.0 - r1
			r2 = 1.0 - r2
		var p := a + (b - a) * r1 + (c - a) * r2
		p.y += 0.015
		var w := rng.randf_range(0.85, 1.25)
		var basis := Basis(Vector3.UP, rng.randf() * TAU) * Basis.from_scale(Vector3(w, rng.randf_range(0.7, 1.15), w))
		var key := Vector2i(floori(p.x / CHUNK), floori(p.z / CHUNK))
		if not cells.has(key):
			cells[key] = []
		(cells[key] as Array).append(Transform3D(basis, p))


## A tuft: TUFT_BLADES of the lawns' blades (EnvBuilder._blade_mesh's shape and UVs: UV.y 0 at the root, 1 at the tip),
## each turned, leaned and sized its own way within TUFT_R. Unit height like a lawn blade at its scatter's 0.16-0.4 scale.
static func tuft_mesh() -> ArrayMesh:
	if _tuft:
		return _tuft
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var rng := RandomNumberGenerator.new()
	rng.seed = 3003
	var segs := 4
	for k in TUFT_BLADES:
		var ang := TAU * (k + rng.randf() * 0.6) / TUFT_BLADES
		var off := Vector3(cos(ang), 0.0, sin(ang)) * TUFT_R * sqrt(rng.randf())
		var h := rng.randf_range(0.16, 0.36)
		var wscale := rng.randf_range(0.8, 1.3)
		var turn := Basis(Vector3.UP, rng.randf() * TAU)
		var rows := []
		for i in segs + 1:
			var t := float(i) / segs
			var w := 0.028 * wscale * pow(1.0 - t, 0.9)
			var z := 0.15 * t * t
			rows.append([turn * Vector3(-w, t * h, z * h * 2.5) + off, turn * Vector3(w, t * h, z * h * 2.5) + off, t])
		var nrm := turn * Vector3(0, 0.4, -1).normalized()
		for i in segs:
			var r0: Array = rows[i]
			var r1: Array = rows[i + 1]
			for vtx in [[r0[0], 0.0, r0[2]], [r0[1], 1.0, r0[2]], [r1[1], 1.0, r1[2]], [r0[0], 0.0, r0[2]], [r1[1], 1.0, r1[2]], [r1[0], 0.0, r1[2]]]:
				st.set_normal(nrm)
				st.set_uv(Vector2(vtx[1], vtx[2]))
				st.add_vertex(vtx[0])
	_tuft = st.commit()
	return _tuft
