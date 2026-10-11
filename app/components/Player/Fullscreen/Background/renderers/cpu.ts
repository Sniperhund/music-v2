import { fromOkLab, toOkLab } from "../palette"
import type { BackgroundFrame, BackgroundRenderer } from "./types"

function gradientHash(x: number, y: number): [number, number] {
	const hash = (a: number, b: number, xScale: number, yScale: number) => {
		const value = Math.sin(a * xScale + b * yScale) * 43758.5453
		return (value - Math.floor(value)) * 2 - 1
	}
	return [hash(x, y, 127.1, 311.7), hash(x, y, 269.5, 183.3)]
}

function gradientNoise(x: number, y: number) {
	const cellX = Math.floor(x)
	const cellY = Math.floor(y)
	const offsetX = x - cellX
	const offsetY = y - cellY
	const easeX = offsetX * offsetX * (3 - 2 * offsetX)
	const easeY = offsetY * offsetY * (3 - 2 * offsetY)
	const dot = (cx: number, cy: number, ox: number, oy: number) => {
		const [gx, gy] = gradientHash(cx, cy)
		return gx * ox + gy * oy
	}
	const lower =
		dot(cellX, cellY, offsetX, offsetY) * (1 - easeX) +
		dot(cellX + 1, cellY, offsetX - 1, offsetY) * easeX
	const upper =
		dot(cellX, cellY + 1, offsetX, offsetY - 1) * (1 - easeX) +
		dot(cellX + 1, cellY + 1, offsetX - 1, offsetY - 1) * easeX
	return 0.5 + 0.5 * (lower * (1 - easeY) + upper * easeY)
}

function smoothstep(edge0: number, edge1: number, value: number) {
	const amount = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)))
	return amount * amount * (3 - 2 * amount)
}

function ditherNoise(x: number, y: number, channel: number) {
	const value = Math.sin(
		(x + channel * 17) * 127.1 + (y + channel * 59) * 311.7,
	) * 43758.5453
	return value - Math.floor(value) - 0.5
}

function flowPoint(
	x: number,
	y: number,
	frame: BackgroundFrame,
): [number, number] {
	const { random, angleJitter, flowParams, time } = frame
	const degree = gradientNoise(
		time * 0.1 + random[0] * 0.07,
		x * y + random[1] * 0.07,
	)
	const angle = (((degree - 0.5) * 720 + 180) * Math.PI) / 180 + angleJitter
	const sine = Math.sin(angle)
	const cosine = Math.cos(angle)
	let flowX = x * cosine - y * sine
	let flowY = x * sine + y * cosine
	const speed = time * flowParams[2]
	flowX += Math.sin(flowY * flowParams[0] + speed) / flowParams[1]
	flowY +=
		Math.sin(flowX * flowParams[0] * 1.5 + speed) / (flowParams[1] * 0.5)
	const tiltSine = Math.sin(flowParams[3])
	const tiltCosine = Math.cos(flowParams[3])
	return [
		flowX * tiltCosine - flowY * tiltSine,
		flowX * tiltSine + flowY * tiltCosine,
	]
}

export function createCpuRenderer(
	canvas: HTMLCanvasElement,
): BackgroundRenderer | null {
	const context = canvas.getContext("2d")
	if (!context) return null

	return {
		render(frame) {
			if (canvas.width !== frame.width || canvas.height !== frame.height) {
				canvas.width = frame.width
				canvas.height = frame.height
			}
			const image = context.createImageData(frame.width, frame.height)
			const dominant = toOkLab(frame.palette.dominant)
			const accent = toOkLab(frame.palette.accent)
			const maxPaletteLightness = Math.max(dominant[0], accent[0])
			for (let y = 0; y < frame.height; y++) {
				for (let x = 0; x < frame.width; x++) {
					const px = x / (frame.width - 1)
					const py = y / (frame.height - 1)
					const point = flowPoint(px - 0.5, py - 0.5, frame)
					const blend = smoothstep(-0.34, 0.16, point[0])
					const transition = 1 - Math.abs(blend * 2 - 1)
					const lab: [number, number, number] = [
						dominant[0] * (1 - blend) + accent[0] * blend,
						dominant[1] * (1 - blend) + accent[1] * blend,
						dominant[2] * (1 - blend) + accent[2] * blend,
					]
					lab[0] = Math.min(maxPaletteLightness, lab[0] + frame.beat * 0.01)
					lab[1] *= 1 + frame.beat * 0.02
					lab[2] *= 1 + frame.beat * 0.02
					const color = fromOkLab(lab)
					const offset = (y * frame.width + x) * 4
					image.data[offset] = color[0] + ditherNoise(x, y, 0) * transition * 3
					image.data[offset + 1] =
						color[1] + ditherNoise(x, y, 1) * transition * 3
					image.data[offset + 2] =
						color[2] + ditherNoise(x, y, 2) * transition * 3
					image.data[offset + 3] = 255
				}
			}
			context.putImageData(image, 0, 0)
		},
		dispose() {},
	}
}
