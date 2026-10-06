struct Params {
	resolutionTimeBeat: vec4f,
	randomAndJitter: vec4f,
	flowParams: vec4f,
	dominant: vec4f,
	accent: vec4f,
}

@group(0) @binding(0) var<uniform> params: Params;

fn hash(a: f32, b: f32, xScale: f32, yScale: f32) -> f32 {
	let value = sin(a * xScale + b * yScale) * 43758.5453;
	return fract(value) * 2.0 - 1.0;
}

fn gradientHash(cell: vec2f) -> vec2f {
	return vec2f(
		hash(cell.x, cell.y, 127.1, 311.7),
		hash(cell.x, cell.y, 269.5, 183.3),
	);
}

fn gradientDot(cell: vec2f, offset: vec2f) -> f32 {
	return dot(gradientHash(cell), offset);
}

fn gradientNoise(point: vec2f) -> f32 {
	let cell = floor(point);
	let offset = fract(point);
	let ease = offset * offset * (3.0 - 2.0 * offset);
	let lower = mix(
		gradientDot(cell, offset),
		gradientDot(cell + vec2f(1.0, 0.0), offset - vec2f(1.0, 0.0)),
		ease.x,
	);
	let upper = mix(
		gradientDot(cell + vec2f(0.0, 1.0), offset - vec2f(0.0, 1.0)),
		gradientDot(cell + vec2f(1.0, 1.0), offset - vec2f(1.0, 1.0)),
		ease.x,
	);
	return 0.5 + 0.5 * mix(lower, upper, ease.y);
}

fn flowPoint(point: vec2f, time: f32) -> vec2f {
	let degree = gradientNoise(vec2f(
		time * 0.1 + params.randomAndJitter.x * 0.07,
		point.x * point.y + params.randomAndJitter.y * 0.07,
	));
	let angle = ((degree - 0.5) * 720.0 + 180.0) * 0.017453292519943295
		+ params.randomAndJitter.z;
	let sine = sin(angle);
	let cosine = cos(angle);
	var flow = vec2f(
		point.x * cosine - point.y * sine,
		point.x * sine + point.y * cosine,
	);
	let speed = time * params.flowParams.z;
	flow.x += sin(flow.y * params.flowParams.x + speed) / params.flowParams.y;
	flow.y += sin(flow.x * params.flowParams.x * 1.5 + speed)
		/ (params.flowParams.y * 0.5);
	let tiltSine = sin(params.flowParams.w);
	let tiltCosine = cos(params.flowParams.w);
	return vec2f(
		flow.x * tiltCosine - flow.y * tiltSine,
		flow.x * tiltSine + flow.y * tiltCosine,
	);
}

fn linearToSrgb(value: f32) -> f32 {
	if (value <= 0.0031308) {
		return 12.92 * value;
	}
	return 1.055 * pow(max(value, 0.0), 1.0 / 2.4) - 0.055;
}

fn fromOkLab(lab: vec3f) -> vec3f {
	let lRoot = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
	let mRoot = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
	let sRoot = lab.x - 0.0894841775 * lab.y - 1.291485548 * lab.z;
	let l = lRoot * lRoot * lRoot;
	let m = mRoot * mRoot * mRoot;
	let s = sRoot * sRoot * sRoot;
	let red = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
	let green = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
	let blue = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
	return clamp(vec3f(
		linearToSrgb(red),
		linearToSrgb(green),
		linearToSrgb(blue),
	), vec3f(0.0), vec3f(1.0));
}

fn ditherNoise(x: f32, y: f32, channel: f32) -> f32 {
	let value = sin(
		(x + channel * 17.0) * 127.1 + (y + channel * 59.0) * 311.7,
	) * 43758.5453;
	return fract(value) - 0.5;
}

@vertex
fn vertexMain(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
	var positions = array<vec2f, 3>(
		vec2f(-1.0, -1.0),
		vec2f(3.0, -1.0),
		vec2f(-1.0, 3.0),
	);
	return vec4f(positions[index], 0.0, 1.0);
}

@fragment
fn fragmentMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
	let dimensions = params.resolutionTimeBeat.xy;
	let time = params.resolutionTimeBeat.z;
	let beat = params.resolutionTimeBeat.w;
	let uv = position.xy / dimensions;
	let point = flowPoint(uv - vec2f(0.5), time);
	let blend = smoothstep(-0.34, 0.16, point.x);
	let transition = 1.0 - abs(blend * 2.0 - 1.0);
	var lab = mix(params.dominant.xyz, params.accent.xyz, blend);
	lab.x = min(params.dominant.w, lab.x + beat * 0.01);
	lab.y = lab.y * (1.0 + beat * 0.02);
	lab.z = lab.z * (1.0 + beat * 0.02);
	let color = fromOkLab(lab);
	let pixel = floor(position.xy);
	let noise = vec3f(
		ditherNoise(pixel.x, pixel.y, 0.0),
		ditherNoise(pixel.x, pixel.y, 1.0),
		ditherNoise(pixel.x, pixel.y, 2.0),
	);
	let dithered = clamp(color + noise * transition * (3.0 / 255.0),
		vec3f(0.0), vec3f(1.0));
	return vec4f(dithered, 1.0);
}
