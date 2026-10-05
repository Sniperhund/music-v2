<script setup lang="ts">
import {
	extractPalette,
	fromOkLab,
	toOkLab,
	type AlbumPalette,
} from "./palette"

const props = defineProps<{ src: string; active: boolean }>()
const canvas = ref<HTMLCanvasElement | null>(null)
const palette = ref<AlbumPalette | null>(null)
let frame = 0
let startedAt = 0
let lastFrameAt = 0
let random = [0, 0]

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
	image.onerror = () => { setPalette(fallback) }
	image.src = props.src
}

function setPalette(next: AlbumPalette) {
	palette.value = next
	random = Array.from({ length: 2 }, () => Math.random() * Math.PI * 2)
}

function smoothstep(edge0: number, edge1: number, value: number) {
	const amount = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)))
	return amount * amount * (3 - 2 * amount)
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
	const width = 112
	const height = Math.max(72, Math.round(width * element.clientHeight / Math.max(1, element.clientWidth)))
	if (element.width !== width || element.height !== height) {
		element.width = width
		element.height = height
	}
	const image = context.createImageData(width, height)
	const colors = palette.value ?? fallback
	const dominant = toOkLab(colors.dominant)
	const accent = toOkLab(colors.accent)
	const motionTime = time * 0.2
	const gradientTime = motionTime * 0.1
	const centerX = 0.5 + 0.43 * Math.sin(motionTime * 0.22)
	const centerY = 0.5 + 0.4 * Math.sin(motionTime * 0.31 + 1.4)
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const px = x / (width - 1)
			const py = y / (height - 1)
			const degree = gradientNoise(
				gradientTime + random[0] * 0.07,
				px * py + random[1] * 0.07,
			)
			const distance = Math.hypot(px - centerX, py - centerY)
			const radius = distance + (degree - 0.5) * 0.12
			const blend = 1 - smoothstep(0.3, 0.52, radius)
			const lab = dominant.map(
				(value, channel) =>
					value * (1 - blend) + accent[channel] * blend,
			) as [number, number, number]
			const color = fromOkLab(lab)
			const offset = (y * width + x) * 4
			image.data[offset] = color[0]
			image.data[offset + 1] = color[1]
			image.data[offset + 2] = color[2]
			image.data[offset + 3] = 255
		}
	}
	context.putImageData(image, 0, 0)
	if (props.active) frame = requestAnimationFrame(draw)
}

watch(() => props.src, loadArtwork)
watch(() => props.active, (active) => {
	if (active) {
		startedAt = 0
		lastFrameAt = 0
		frame = requestAnimationFrame(draw)
	} else {
		cancelAnimationFrame(frame)
	}
})

onMounted(() => {
	loadArtwork()
	if (props.active) frame = requestAnimationFrame(draw)
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
	filter: blur(28px) saturate(1.08);
	transform: scale(1.08);
}
</style>
