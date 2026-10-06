<script setup lang="ts">
import {
	extractPalette,
	type AlbumPalette,
} from "./palette"
import { createCpuRenderer } from "./renderers/cpu"
import { createWebGpuRenderer } from "./renderers/webgpu"
import type { BackgroundFrame, BackgroundRenderer } from "./renderers/types"
import { shapeBeatPulse } from "~/utils/beat"

const props = defineProps<{ src: string; active: boolean }>()
const ANIMATION_SPEED = 0.3
const { beatEnergy } = usePlayer()
const cpuCanvas = ref<HTMLCanvasElement | null>(null)
const webGpuCanvas = ref<HTMLCanvasElement | null>(null)
const palette = ref<AlbumPalette | null>(null)
const backend = ref<"cpu" | "webgpu">("cpu")
let frame = 0
let startedAt = 0
let lastFrameAt = 0
let random: [number, number] = [0, 0]
let angleJitter = 0
let flowParams: [number, number, number, number] = [5, 25, 0.75, -0.08]
let cpuRenderer: BackgroundRenderer | null = null
let webGpuRenderer: BackgroundRenderer | null = null
let activeRenderer: BackgroundRenderer | null = null
let disposed = false

const fallback: AlbumPalette = { dominant: [30, 35, 55], accent: [105, 65, 45] }

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
	image.onerror = () => {
		palette.value = fallback
	}
	image.src = props.src
}

function randomizeMotion() {
	random = [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2]
	angleJitter = (Math.random() - 0.5) * 0.3
	flowParams = [
		4.5 + Math.random(),
		22 + Math.random() * 7,
		(0.65 + Math.random() * 0.2) * (Math.random() < 0.5 ? -1 : 1),
		((-5 + (Math.random() - 0.5) * 12) * Math.PI) / 180,
	]
}

function useCpuFallback() {
	if (!cpuRenderer) return
	activeRenderer = cpuRenderer
	backend.value = "cpu"
}

async function initializeRenderers() {
	const cpuElement = cpuCanvas.value
	const gpuElement = webGpuCanvas.value
	if (!cpuElement || !gpuElement) return
	cpuRenderer = createCpuRenderer(cpuElement)
	activeRenderer = cpuRenderer
	if (!cpuRenderer) {
		console.warn("[background renderer] 2D canvas is unavailable")
		return
	}

	let rendererLost = false
	const renderer = await createWebGpuRenderer(gpuElement, () => {
		rendererLost = true
		webGpuRenderer = null
		console.warn("[background renderer] WebGPU device lost; using CPU")
		useCpuFallback()
	})
	if (!renderer) return
	if (disposed || rendererLost) {
		renderer.dispose()
		return
	}
	webGpuRenderer = renderer
	activeRenderer = renderer
	backend.value = "webgpu"
	console.info("[background renderer] using WebGPU")
}

function makeFrame(now: number, canvas: HTMLCanvasElement): BackgroundFrame {
	if (!startedAt) startedAt = now
	const width = 224
	const height = Math.max(
		72,
		Math.round(
			(width * canvas.clientHeight) / Math.max(1, canvas.clientWidth),
		),
	)
	return {
		width,
		height,
		time: ((now - startedAt) / 1000) * ANIMATION_SPEED,
		beat: shapeBeatPulse(beatEnergy.value),
		random,
		angleJitter,
		flowParams,
		palette: palette.value ?? fallback,
	}
}

function draw(now: number) {
	if (!props.active || disposed) return
	if (now - lastFrameAt < 1000 / 24) {
		frame = requestAnimationFrame(draw)
		return
	}
	lastFrameAt = now
	const canvas = backend.value === "webgpu" ? webGpuCanvas.value : cpuCanvas.value
	if (canvas && activeRenderer) {
		const renderFrame = makeFrame(now, canvas)
		canvas.style.transform = `scale(${1.08 + renderFrame.beat * 0.003})`
		try {
			activeRenderer.render(renderFrame)
		} catch (error) {
			if (backend.value === "webgpu") {
				console.warn(
					"[background renderer] WebGPU render failed; using CPU",
					error,
				)
				webGpuRenderer?.dispose()
				webGpuRenderer = null
				useCpuFallback()
				cpuCanvas.value?.style.setProperty(
					"transform",
					`scale(${1.08 + renderFrame.beat * 0.003})`,
				)
				try {
					cpuRenderer?.render(renderFrame)
				} catch (fallbackError) {
					console.warn("[background renderer] CPU fallback failed", fallbackError)
				}
			} else {
				console.warn("[background renderer] CPU render failed", error)
			}
		}
	}
	frame = requestAnimationFrame(draw)
}

function startAnimation() {
	cancelAnimationFrame(frame)
	startedAt = 0
	lastFrameAt = 0
	randomizeMotion()
	frame = requestAnimationFrame(draw)
}

watch(() => props.src, loadArtwork)
watch(
	() => props.active,
	(active) => {
		if (active) startAnimation()
		else cancelAnimationFrame(frame)
	},
)

onMounted(() => {
	loadArtwork()
	void initializeRenderers()
	if (props.active) startAnimation()
})

onBeforeUnmount(() => {
	disposed = true
	cancelAnimationFrame(frame)
	webGpuRenderer?.dispose()
	cpuRenderer?.dispose()
})
</script>

<template>
	<canvas
		ref="webGpuCanvas"
		class="background-wash"
		:class="{ 'background-wash--active': backend === 'webgpu' }"
		aria-hidden="true"
	/>
	<canvas
		ref="cpuCanvas"
		class="background-wash"
		:class="{ 'background-wash--active': backend === 'cpu' }"
		aria-hidden="true"
	/>
</template>

<style scoped>
.background-wash {
	position: absolute;
	inset: 0;
	width: 50%;
	height: 50%;
	filter: blur(6px) saturate(1.08);
	transform: scale(1.08);
	visibility: hidden;
}

.background-wash--active {
	visibility: visible;
}
</style>
