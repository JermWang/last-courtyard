@tool
class_name BlockLawn
extends BlockEnv
## A lawn from the feel lab's water garden: lawn soil with the wind-blown grass blades (EnvBuilder blades,
## env/grass.gdshader), `size` metres centred on this node, laid on the floor under it (visual only: the
## greybox floor below does the collision). `density` is blades per square metre (the garden uses 130).
## `within`: a plan outline (local X, Z) the lawn is clipped to, so it follows a curved roof edge instead of
## overhanging it. `blades` off = smooth golf-like turf only (the Aero planted surface).

@export var size := Vector2(8, 6):
	set(v):
		size = v.max(Vector2(0.5, 0.5))
		rebuild()
@export_range(10.0, 200.0, 5.0) var density := 110.0:
	set(v):
		density = v
		rebuild()
## Grass blades fade out beyond this distance (the soil stays): big roof lawns stay affordable.
@export_range(20.0, 400.0, 5.0) var blade_range := 170.0:
	set(v):
		blade_range = v
		rebuild()
## Clip to this outline (local X, Z; empty = the whole `size` rectangle).
@export var within := PackedVector2Array():
	set(v):
		within = v
		rebuild()
## Grass blades on the turf (off: turf only, close-cropped like a golf green).
@export var blades := true:
	set(v):
		blades = v
		rebuild()

const PLANTED := preload("res://materials/aero/aero_planted.tres")

## The ground under the blades: a grass-green turf (the lab's dark lawn soil reads as a hole from afar,
## where the blades have faded out). Shared by every lawn.
static var _turf: ShaderMaterial


func _build() -> void:
	if _turf == null:
		_turf = _surface(3, Color(0.2, 0.4, 0.11), Color(0.25, 0.47, 0.14), Color(0.2, 0.4, 0.11), Vector2(7.0, 7.0), 0.001, 0.95)
	var h := size * 0.5
	var rect := PackedVector2Array([Vector2(-h.x, -h.y), Vector2(h.x, -h.y), Vector2(h.x, h.y), Vector2(-h.x, h.y)])
	var polys: Array[PackedVector2Array] = [rect]
	if within.size() >= 3:
		polys = []
		for p in Geometry2D.intersect_polygons(rect, within):
			polys.append(p)
	_soil(polys, _turf if blades else PLANTED)
	if blades:
		_blades(polys)


## The soil: the outline(s) as a flat 3 cm slab (top + edge band). Every face is written both ways round, so
## it shows whatever the outline's winding (cheap: a lawn is a few hundred triangles).
func _soil(polys: Array[PackedVector2Array], mat: Material) -> void:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var top := 0.02
	var bot := -0.01
	for poly in polys:
		var idx := Geometry2D.triangulate_polygon(poly)
		for i in range(0, idx.size(), 3):
			var tri := [poly[idx[i]], poly[idx[i + 1]], poly[idx[i + 2]]]
			for k in [0, 1, 2, 0, 2, 1]:
				st.set_normal(Vector3.UP)
				st.set_uv(tri[k] / 7.0)
				st.add_vertex(Vector3(tri[k].x, top, tri[k].y))
		for i in poly.size():
			var a := poly[i]
			var b := poly[(i + 1) % poly.size()]
			var n := Vector3(b.y - a.y, 0, a.x - b.x).normalized()
			var q := [Vector3(a.x, top, a.y), Vector3(b.x, bot, b.y), Vector3(b.x, top, b.y), Vector3(a.x, top, a.y), Vector3(a.x, bot, a.y), Vector3(b.x, bot, b.y)]
			var both := q.duplicate()
			both.reverse()
			for v in q + both:
				st.set_normal(n)
				st.set_uv(Vector2(v.x + v.z, v.y) / 7.0)
				st.add_vertex(v)
	var mi := MeshInstance3D.new()
	mi.name = "LawnSoil"
	mi.mesh = st.commit()
	mi.material_override = mat
	add_child(mi)


## Blades scattered over the outline(s) (EnvBuilder's blade mesh and grass shader, the garden's scatter).
func _blades(polys: Array[PackedVector2Array]) -> void:
	var area := 0.0
	var bounds := Rect2()
	for k in polys.size():
		var poly := polys[k]
		var a := 0.0
		for i in poly.size():
			a += poly[i].cross(poly[(i + 1) % poly.size()])
		area += absf(a) * 0.5
		var r := Rect2(poly[0], Vector2.ZERO)
		for p in poly:
			r = r.expand(p)
		bounds = r if k == 0 else bounds.merge(r)
	var count := int(area * density)
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = _blade_mesh()
	# (the blades as a lawn with this generator state, outline and density scattered them before: LawnBlades, pod LOAD2)
	var key := LawnBlades.key(_rng.state, polys, density) if LawnBlades.enabled and is_inside_tree() and not Engine.is_editor_hint() else ""
	var kept := LawnBlades.lookup(key) if not key.is_empty() else PackedFloat32Array()
	if not kept.is_empty():
		mm.instance_count = kept.size() / 12
		mm.buffer = kept
		_grass_node(mm)
		return
	var xforms: Array[Transform3D] = []
	var tries := 0
	while xforms.size() < count and tries < count * 4:
		tries += 1
		var p := bounds.position + Vector2(_rng.randf() * bounds.size.x, _rng.randf() * bounds.size.y)
		var inside := false
		for poly in polys:
			if Geometry2D.is_point_in_polygon(p, poly):
				inside = true
				break
		if not inside:
			continue
		var w := _rng.randf_range(0.8, 1.3)
		var basis := Basis(Vector3.UP, _rng.randf() * TAU) * Basis.from_scale(Vector3(w, _rng.randf_range(0.16, 0.4), w))
		xforms.append(Transform3D(basis, Vector3(p.x, 0.02, p.y)))
	mm.instance_count = xforms.size()
	if key.is_empty() or xforms.is_empty():
		for i in xforms.size():
			mm.set_instance_transform(i, xforms[i])
	else:
		var buf := LawnBlades.buffer_of(xforms)
		mm.buffer = buf
		LawnBlades.record(key, buf)
	_grass_node(mm)


func _grass_node(mm: MultiMesh) -> void:
	var mmi := MultiMeshInstance3D.new()
	mmi.name = "Grass"
	mmi.multimesh = mm
	var mat := ShaderMaterial.new()
	mat.shader = GRASS_SHADER
	mmi.material_override = mat
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	mmi.extra_cull_margin = 0.5
	mmi.visibility_range_end = blade_range
	mmi.visibility_range_end_margin = 15.0
	mmi.visibility_range_fade_mode = GeometryInstance3D.VISIBILITY_RANGE_FADE_SELF
	add_child(mmi)
