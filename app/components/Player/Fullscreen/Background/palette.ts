type RGB = [number, number, number]
type Lab = [number, number, number]

export interface AlbumPalette {
	dominant: RGB
	accent: RGB
}

export function toOkLab([red, green, blue]: RGB): Lab {
	const linear = (value: number) => {
		const channel = value / 255
		return channel <= 0.04045
			? channel / 12.92
			: ((channel + 0.055) / 1.055) ** 2.4
	}
	const r = linear(red)
	const g = linear(green)
	const b = linear(blue)
	const l = Math.cbrt(
		0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b,
	)
	const m = Math.cbrt(
		0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b,
	)
	const s = Math.cbrt(
		0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b,
	)
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
	]
}

export function fromOkLab([lightness, a, b]: Lab): RGB {
	const lRoot = lightness + 0.3963377774 * a + 0.2158037573 * b
	const mRoot = lightness - 0.1055613458 * a - 0.0638541728 * b
	const sRoot = lightness - 0.0894841775 * a - 1.291485548 * b
	const l = lRoot ** 3
	const m = mRoot ** 3
	const s = sRoot ** 3
	const encode = (value: number) => {
		const channel =
			value <= 0.0031308
				? 12.92 * value
				: 1.055 * Math.max(value, 0) ** (1 / 2.4) - 0.055
		return Math.max(0, Math.min(1, channel)) * 255
	}
	return [
		encode(
			4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		),
		encode(
			-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		),
		encode(
			-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
		),
	]
}

/** Sample a small CPU histogram and return the most common album colors. */
export function extractPalette(image: HTMLImageElement, size = 48): AlbumPalette {
	const canvas = document.createElement("canvas")
	canvas.width = size
	canvas.height = size
	const context = canvas.getContext("2d", { willReadFrequently: true })
	if (!context) {
		return { dominant: [30, 35, 55], accent: [105, 65, 45] }
	}

	context.drawImage(image, 0, 0, size, size)
	const pixels = context.getImageData(0, 0, size, size).data
	const bins = new Map<number, { count: number; r: number; g: number; b: number }>()
	for (let i = 0; i < pixels.length; i += 4) {
		const red = pixels[i]!
		const green = pixels[i + 1]!
		const blue = pixels[i + 2]!
		if (pixels[i + 3]! < 96) continue
		const r = red >> 3
		const g = green >> 3
		const b = blue >> 3
		const key = (r << 10) | (g << 5) | b
		const bin = bins.get(key) ?? { count: 0, r: 0, g: 0, b: 0 }
		bin.count++
		bin.r += red
		bin.g += green
		bin.b += blue
		bins.set(key, bin)
	}
	const entries = [...bins.values()].map((bin) => ({
		count: bin.count,
		color: [bin.r / bin.count, bin.g / bin.count, bin.b / bin.count] as RGB,
	}))
	if (!entries.length) {
		return { dominant: [30, 35, 55], accent: [105, 65, 45] }
	}
	const distance = (a: RGB, b: RGB) => {
		const first = toOkLab(a)
		const second = toOkLab(b)
		return (first[0] - second[0]) ** 2 + (first[1] - second[1]) ** 2 + (first[2] - second[2]) ** 2
	}
	const centers: RGB[] = [entries.reduce((best, entry) => entry.count > best.count ? entry : best).color]
	while (centers.length < 4) {
		let candidate = entries[0]!
		let bestScore = -1
		for (const entry of entries) {
			const nearestDistance = Math.min(...centers.map((center) => distance(entry.color, center)))
			const score = nearestDistance * Math.sqrt(entry.count)
			if (score > bestScore) {
				bestScore = score
				candidate = entry
			}
		}
		centers.push(candidate.color)
	}

	let clusterSupport = centers.map(() => 0)
	for (let iteration = 0; iteration < 8; iteration++) {
		const clusters = centers.map(() => ({ count: 0, red: 0, green: 0, blue: 0 }))
		for (const entry of entries) {
			let nearest = 0
			let nearestDistance = Infinity
			for (let i = 0; i < centers.length; i++) {
				const nextDistance = distance(entry.color, centers[i]!)
				if (nextDistance < nearestDistance) {
					nearest = i
					nearestDistance = nextDistance
				}
			}
			const cluster = clusters[nearest]!
			cluster.count += entry.count
			cluster.red += entry.color[0] * entry.count
			cluster.green += entry.color[1] * entry.count
			cluster.blue += entry.color[2] * entry.count
		}
		for (let i = 0; i < clusters.length; i++) {
			const cluster = clusters[i]!
			if (cluster.count) centers[i] = [cluster.red / cluster.count, cluster.green / cluster.count, cluster.blue / cluster.count]
		}
		clusterSupport = clusters.map((cluster) => cluster.count)
	}

	const dominantIndex = clusterSupport.reduce(
		(best, count, index) => count > clusterSupport[best]! ? index : best,
		0,
	)
	const dominant = centers[dominantIndex]!
	const distinctCenters = centers.filter((center) => distance(center, dominant) > 0.002)
	const candidates = distinctCenters.length ? distinctCenters : centers
	const accent = candidates.reduce((best, color) => {
		const index = centers.indexOf(color)
		const [_, a, b] = toOkLab(color)
		const chroma = Math.hypot(a, b)
		const score = chroma * Math.sqrt(clusterSupport[index] || 1)
		const [__, bestA, bestB] = toOkLab(best)
		const bestScore = Math.hypot(bestA, bestB) * Math.sqrt(clusterSupport[centers.indexOf(best)] || 1)
		return score > bestScore ? color : best
	})
	return { dominant, accent }
}
