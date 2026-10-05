<script setup lang="ts">
import {
	extractPalette,
	fromOkLab,
	toOkLab,
	type AlbumPalette,
} from "./palette"

const props = defineProps<{ src: string; active: boolean }>()
const ANIMATION_SPEED = 0.3
const { beatEnergy } = usePlayer()
const canvas = ref<HTMLCanvasElement | null>(null)
const palette = ref<AlbumPalette | null>(null)
let frame = 0
let startedAt = 0
let lastFrameAt = 0
let random = [0, 0]
let angleJitter = 0
let flowParams: [number, number, number, number] = [5, 25, 0.75, -0.08]

const fallback: AlbumPalette = { dominant: [30, 35, 55], accent: [105, 65, 45] }

function loadArtwork() {
	const image = new Image()
	image.crossOrigin = "anonymous"
	image.onload = () => {
		try {
			setPalette(extractPalette(image))
		} catch {
			setPalette(fallback)
		}
	}
	image.onerror = () => {
		setPalette(fallback)
	}
	image.src = props.src
}

function setPalette(next: AlbumPalette) {
	palette.value = next
}

function randomizeMotion() {
	random = Array.from({ length: 2 }, () => Math.random() * Math.PI * 2)
	angleJitter = (Math.random() - 0.5) * 0.3
	flowParams = [
		4.5 + Math.random(),
		22 + Math.random() * 7,
		(0.65 + Math.random() * 0.2) * (Math.random() < 0.5 ? -1 : 1),
		((-5 + (Math.random() - 0.5) * 12) * Math.PI) / 180,
	]
}

function startAnimation() {
	cancelAnimationFrame(frame)
	startedAt = 0
	lastFrameAt = 0
	randomizeMotion()
	frame = requestAnimationFrame(draw)
}

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

function flowPoint(x: number, y: number, time: number): [number, number] {
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

function draw(now: number) {
	const element = canvas.value
	const context = element?.getContext("2d")
	if (!element || !context) return
	if (!startedAt) startedAt = now
	if (now - lastFrameAt < 1000 / 24) {
		frame = requestAnimationFrame(draw)
		return
	}
	lastFrameAt = now
	const time = (now - startedAt) / 1000
	const width = 224
	const height = Math.max(
		72,
		Math.round(
			(width * element.clientHeight) / Math.max(1, element.clientWidth),
		),
	)
	if (element.width !== width || element.height !== height) {
		element.width = width
		element.height = height
	}
	const image = context.createImageData(width, height)
	const colors = palette.value ?? fallback
	const dominant = toOkLab(colors.dominant)
	const accent = toOkLab(colors.accent)
	const motionTime = time * ANIMATION_SPEED
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const px = x / (width - 1)
			const py = y / (height - 1)
			const point = flowPoint(px - 0.5, py - 0.5, motionTime)
			const blend = smoothstep(-0.34, 0.16, point[0])
			const transition = 1 - Math.abs(blend * 2 - 1)
			const lab = dominant.map(
				(value, channel) =>
					value * (1 - blend) + accent[channel] * blend,
			) as [number, number, number]
			const beat = beatEnergy.value
			lab[0] = Math.min(1, lab[0] + beat * 0.01)
			lab[1] *= 1 + beat * 0.02
			lab[2] *= 1 + beat * 0.02
			const color = fromOkLab(lab)
			const offset = (y * width + x) * 4
			image.data[offset] = color[0] + ditherNoise(x, y, 0) * transition * 3
			image.data[offset + 1] = color[1] + ditherNoise(x, y, 1) * transition * 3
			image.data[offset + 2] = color[2] + ditherNoise(x, y, 2) * transition * 3
			image.data[offset + 3] = 255
		}
	}
	element.style.transform = `scale(${1.08 + beatEnergy.value * 0.003})`
	context.putImageData(image, 0, 0)
	if (props.active) frame = requestAnimationFrame(draw)
}

watch(() => props.src, loadArtwork)
watch(
	() => props.active,
	(active) => {
		if (active) startAnimation()
		else {
			cancelAnimationFrame(frame)
		}
	},
)

onMounted(() => {
	loadArtwork()
	if (props.active) startAnimation()
})

onBeforeUnmount(() => {
	cancelAnimationFrame(frame)
})
</script>

<template>
	<canvas ref="canvas" class="background-wash" aria-hidden="true" />
</template>

<style scoped>
.background-wash {
	position: absolute;
	inset: 0;
	width: 50%;
	height: 50%;
	filter: blur(6px) saturate(1.08);
	transform: scale(1.08);
}
</style>
