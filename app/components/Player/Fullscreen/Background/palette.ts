type RGB = [number, number, number]

/** Sample a small CPU histogram and return the most common album colors. */
export function extractPalette(image: HTMLImageElement, size = 48): RGB[] {
	const canvas = document.createElement("canvas")
	canvas.width = size
	canvas.height = size
	const context = canvas.getContext("2d", { willReadFrequently: true })
	if (!context) return [[30, 35, 55], [70, 45, 75], [35, 75, 85], [105, 65, 45]]

	context.drawImage(image, 0, 0, size, size)
	const pixels = context.getImageData(0, 0, size, size).data
	const bins = new Map<number, { count: number; r: number; g: number; b: number }>()
	for (let i = 0; i < pixels.length; i += 4) {
		if (pixels[i + 3] < 96) continue
		const r = pixels[i] >> 3
		const g = pixels[i + 1] >> 3
		const b = pixels[i + 2] >> 3
		const key = (r << 10) | (g << 5) | b
		const bin = bins.get(key) ?? { count: 0, r: 0, g: 0, b: 0 }
		bin.count++
		bin.r += pixels[i]
		bin.g += pixels[i + 1]
		bin.b += pixels[i + 2]
		bins.set(key, bin)
	}
	const colors = [...bins.values()]
		.sort((a, b) => b.count - a.count)
		.slice(0, 8)
		.map((bin) => [bin.r / bin.count, bin.g / bin.count, bin.b / bin.count] as RGB)
	return colors.length ? colors : [[30, 35, 55], [70, 45, 75], [35, 75, 85], [105, 65, 45]]
}
