// Shared wind so every plant sways from the same field. `root` is the plant's ground point (XZ),
// `h` the height above it; displacement grows with h² so stems stay planted.
// `weather_wind` (env/weather.gd, pod WEATHER1): the weather's wind, x the sway (1 = as authored), y the gusts' extra
// share (0 = as authored); left at its defaults wherever no weather runs.
global uniform vec2 weather_wind;

vec3 wind_offset(vec2 root, float h, float strength, float t) {
	float phase = root.x * 0.13 + root.y * 0.09;
	float gust = 0.55 + 0.45 * sin(t * 0.31 + phase * 0.7);
	gust += weather_wind.y * max(sin(t * 0.53 + phase * 0.21), 0.0);
	float sway = sin(t * 1.35 + phase * 4.0) + 0.3 * sin(t * 2.9 + phase * 9.0);
	return vec3(0.83, 0.0, 0.55) * sway * gust * strength * weather_wind.x * h * h;
}
