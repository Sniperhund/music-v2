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
const CPU_FRAME_INTERVAL = 1000 / 12
const WEBGPU_FRAME_INTERVAL = 1000 / 30
const { beatEnergy } = usePlayer()
const cpuCanvas = ref<HTMLCanvasElement | null>(null)
const webGpuCanvas = ref<HTMLCanvasElement | null>(null)
const palette = ref<AlbumPalette | null>(null)
const backend = ref<"cpu" | "webgpu">("cpu")
let frameTimer: number | null = null
let startedAt = 0
let random: [number, number] = [0, 0]
let angleJitter = 0
let flowParams: [number, number, number, number] = [5, 25, 0.75, -0.08]
let cpuRenderer: BackgroundRenderer | null = null
let webGpuRenderer: BackgroundRenderer | null = null
let webGpuInitialization: Promise<void> | null = null
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

async function initializeWebGpuRenderer() {
	if (webGpuRenderer || webGpuInitialization) return webGpuInitialization
	webGpuInitialization = (async () => {
		const gpuElement = webGpuCanvas.value
		if (!gpuElement || disposed) return

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
		try {
			const frame = makeFrame(performance.now(), gpuElement, "webgpu")
			updateCanvasScale(gpuElement, frame.beat)
			renderer.render(frame)
		} catch (error) {
			console.warn(
				"[background renderer] WebGPU initial render failed; using CPU",
				error,
			)
			renderer.dispose()
			return
		}
		webGpuRenderer = renderer
		activeRenderer = renderer
		backend.value = "webgpu"
		console.info("[background renderer] using WebGPU")
	})()
	try {
		await webGpuInitialization
	} finally {
		webGpuInitialization = null
	}
}

function makeFrame(
	now: number,
	canvas: HTMLCanvasElement,
	renderBackend = backend.value,
): BackgroundFrame {
	if (!startedAt) startedAt = now
	const pixelRatio = window.devicePixelRatio || 1
	const width =
		renderBackend === "webgpu"
			? Math.max(1, Math.round(canvas.clientWidth * pixelRatio))
			: 224
	const height =
		renderBackend === "webgpu"
			? Math.max(1, Math.round(canvas.clientHeight * pixelRatio))
			: Math.max(
					72,
					Math.round(
						(width * canvas.clientHeight) /
							Math.max(1, canvas.clientWidth),
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

function updateCanvasScale(canvas: HTMLCanvasElement, beat: number) {
	const transform = `scale(${1.08 + beat * 0.003})`
	if (canvas.style.transform !== transform) canvas.style.transform = transform
}

function draw(now: number) {
	if (!props.active || disposed) return
	const canvas = backend.value === "webgpu" ? webGpuCanvas.value : cpuCanvas.value
	if (canvas && activeRenderer) {
		const renderFrame = makeFrame(now, canvas)
		updateCanvasScale(canvas, renderFrame.beat)
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
				if (cpuCanvas.value) {
					const cpuFrame = makeFrame(now, cpuCanvas.value)
					updateCanvasScale(cpuCanvas.value, cpuFrame.beat)
					try {
						cpuRenderer?.render(cpuFrame)
					} catch (fallbackError) {
						console.warn(
							"[background renderer] CPU fallback failed",
							fallbackError,
						)
					}
				}
			} else {
				console.warn("[background renderer] CPU render failed", error)
			}
		}
	}
	frameTimer = window.setTimeout(() => {
		frameTimer = null
		draw(performance.now())
	}, backend.value === "webgpu" ? WEBGPU_FRAME_INTERVAL : CPU_FRAME_INTERVAL)
}

function startAnimation() {
	if (frameTimer !== null) window.clearTimeout(frameTimer)
	frameTimer = null
	startedAt = 0
	randomizeMotion()
	draw(performance.now())
}

watch(() => props.src, loadArtwork)
watch(
	() => props.active,
	(active) => {
		if (active) {
			startAnimation()
			void initializeWebGpuRenderer()
		}
		else if (frameTimer !== null) {
			window.clearTimeout(frameTimer)
			frameTimer = null
		}
	},
)

onMounted(() => {
	loadArtwork()
	const canvas = cpuCanvas.value
	if (canvas) {
		cpuRenderer = createCpuRenderer(canvas)
		activeRenderer = cpuRenderer
		if (!cpuRenderer) console.warn("[background renderer] 2D canvas is unavailable")
	}
	if (props.active) {
		startAnimation()
		void initializeWebGpuRenderer()
	}
})

onBeforeUnmount(() => {
	disposed = true
	if (frameTimer !== null) window.clearTimeout(frameTimer)
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
	width: 100%;
	height: 100%;
	filter: blur(6px) saturate(1.08);
	transform: scale(1.08);
	visibility: hidden;
}

.background-wash--active {
	visibility: visible;
}
</style>
