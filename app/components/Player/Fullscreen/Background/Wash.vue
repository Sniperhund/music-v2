<script setup lang="ts">
import { extractPalette } from "./palette"

const props = defineProps<{ src: string; active: boolean }>()
const canvas = ref<HTMLCanvasElement | null>(null)
const palette = ref<[number, number, number][]>([])
let frame = 0
let startedAt = 0

const fallback: [number, number, number][] = [
	[30, 35, 55], [70, 45, 75], [35, 75, 85], [105, 65, 45],
]

function loadArtwork() {
	const image = new Image()
	image.crossOrigin = "anonymous"
	image.onload = () => {
		try {
			palette.value = extractPalette(image)
		} catch {
			palette.value = fallback
		}
	}
	image.onerror = () => { palette.value = fallback }
	image.src = props.src
}

function draw(now: number) {
	const element = canvas.value
	const context = element?.getContext("2d")
	if (!element || !context) return
	if (!startedAt) startedAt = now
	const time = (now - startedAt) / 1000
	const width = 112
	const height = Math.max(72, Math.round(width * element.clientHeight / Math.max(1, element.clientWidth)))
	if (element.width !== width || element.height !== height) {
		element.width = width
		element.height = height
	}
	const image = context.createImageData(width, height)
	const colors = palette.value.length ? palette.value : fallback
	const fields = colors.map((_, index) => {
		const angle = (index / colors.length) * Math.PI * 2
		return {
			x: 0.5 + Math.cos(angle + time * 0.13) * 0.34,
			y: 0.5 + Math.sin(angle + time * 0.11) * 0.32,
		}
	})
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const px = x / width
			const py = y / height
			const weights = fields.map((field) => {
				const dx = px - field.x
				const dy = py - field.y
				return 1 / (0.2 + dx * dx + dy * dy)
			})
			const total = weights.reduce((sum, weight) => sum + weight, 0)
			const color = [0, 1, 2].map((channel) => Math.round(
				colors.reduce((sum, item, index) => sum + item[channel] * weights[index], 0) / total * 0.52,
			))
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
	width: 100%;
	height: 100%;
	filter: blur(42px) saturate(1.2);
	transform: scale(1.08);
}
</style>
