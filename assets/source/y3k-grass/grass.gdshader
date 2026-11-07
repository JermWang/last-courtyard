shader_type spatial;
render_mode cull_disabled, diffuse_lambert_wrap, specular_schlick_ggx, skip_vertex_transform;
// Grass blades from a MultiMesh (blade mesh: UV.y 0 at the root, 1 at the tip). Blades bend with
// the shared wind field and shade with a mostly-up normal so a lawn reads as one soft surface.

#include "res://env/noise.gdshaderinc"
#include "res://env/wind.gdshaderinc"

uniform vec3 root_color : source_color = vec3(0.05, 0.14, 0.03);
uniform vec3 tip_color : source_color = vec3(0.42, 0.66, 0.16);
uniform vec3 dry_color : source_color = vec3(0.66, 0.66, 0.30);
uniform float patchiness = 0.35;
uniform float wind_strength = 1.6;
uniform float translucency = 0.35;
// Every blade shrunk about its root (pod SCALE1, 2026-10-21: the blades stood 0.16-0.4 m, 5-7 cm wide, so city lawns
// came up the body's shins like a meadow; at 0.6 they're 0.10-0.24 m: a lush lawn, still a toon one). The scatter's own
// transforms (and the lawn bake keeping them) are unchanged.
uniform float blade_scale = 0.6;

varying float v_h;
varying vec3 v_root;

void vertex() {
	vec3 world = (MODEL_MATRIX * vec4(VERTEX * blade_scale, 1.0)).xyz;
	vec3 root = MODEL_MATRIX[3].xyz;
	float h = UV.y;
	world += wind_offset(root.xz, world.y - root.y, wind_strength, TIME);
	world += vec3(0.4, 0.0, 0.25) * sin(TIME * 4.0 + root.x * 3.0 + root.z * 2.0) * 0.02 * h * h;
	VERTEX = (VIEW_MATRIX * vec4(world, 1.0)).xyz;
	vec3 n_world = normalize(mix(normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz), vec3(0.0, 1.0, 0.0), 0.75));
	NORMAL = normalize((VIEW_MATRIX * vec4(n_world, 0.0)).xyz);
	v_h = h;
	v_root = root;
}

void fragment() {
	float dry = smoothstep(0.35, 0.8, fbm(v_root.xz * 0.35));
	vec3 tip = mix(tip_color, dry_color, dry * patchiness);
	vec3 col = mix(root_color, tip, smoothstep(0.0, 1.0, v_h));
	col *= 0.85 + 0.3 * hash12(v_root.xz * 91.0);
	ALBEDO = col;
	BACKLIGHT = col * translucency * v_h;
	ROUGHNESS = 0.7;
	SPECULAR = 0.3;
	AO = mix(0.35, 1.0, v_h);
	AO_LIGHT_AFFECT = 0.4;
}
