<script setup lang="ts">
const { fullscreen, close: closeFullscreen } = useFullscreen()
const song = useSong()
const backgroundColors = ref(["#24202d", "#302238", "#182b35"])
const backgroundPosition = ref("8% 14%, 88% 12%, 48% 76%, 0 0")

const randomBackgroundPosition = () => {
	return [0, 1, 2]
		.map(() => `${Math.round(Math.random() * 100)}% ${Math.round(Math.random() * 100)}%`)
		.concat("0 0")
		.join(", ")
}

watch(
	() => song.value?.album.file,
	async (file) => {
		if (!file || !import.meta.client) return

		const image = new Image()
		image.crossOrigin = "anonymous"
		image.src = GET_FILE(file)
		try {
			await image.decode()
			const canvas = document.createElement("canvas")
			canvas.width = 3
			canvas.height = 1
			const context = canvas.getContext("2d", { willReadFrequently: true })
			if (!context) return
			context.drawImage(image, 0, 0, 3, 1)
			const pixels = context.getImageData(0, 0, 3, 1).data
			backgroundColors.value = [0, 1, 2].map((index) => {
				const offset = index * 4
				return `rgb(${pixels[offset]}, ${pixels[offset + 1]}, ${pixels[offset + 2]})`
			})
		} catch {
			// Keep the default palette when the cover cannot be loaded or sampled.
		}
	},
	{ immediate: true },
)

const mouseMovedRecently = ref(true)

onMounted(() => {
	let timeoutId: NodeJS.Timeout
	let backgroundInterval: NodeJS.Timeout | undefined
	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")

	if (!reducedMotion.matches) {
		backgroundPosition.value = randomBackgroundPosition()
		backgroundInterval = setInterval(() => {
			backgroundPosition.value = randomBackgroundPosition()
		}, 9000)
	}

	const handleMouseMove = () => {
		mouseMovedRecently.value = true

		clearTimeout(timeoutId)
		timeoutId = setTimeout(() => {
			mouseMovedRecently.value = false
		}, 2000)
	}
	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === "Escape" && fullscreen.value) {
			closeFullscreen()
		}
	}

	window.addEventListener("mousemove", handleMouseMove)
	window.addEventListener("keydown", handleKeydown)

	onUnmounted(() => {
		window.removeEventListener("mousemove", handleMouseMove)
		window.removeEventListener("keydown", handleKeydown)
		if (backgroundInterval) clearInterval(backgroundInterval)
	})
})

const nuxtApp = useNuxtApp()

nuxtApp.hook("page:finish", () => {
	closeFullscreen()
})
</script>

<template>
	<section
		class="fullscreen"
		:class="{ showCursor: mouseMovedRecently }"
		v-show="fullscreen"
	>
		<div
			class="background"
			:style="{
				'--background-color-one': backgroundColors[0],
				'--background-color-two': backgroundColors[1],
				'--background-color-three': backgroundColors[2],
				backgroundPosition,
			}"
		/>

		<section class="screen-container" v-if="song">
			<Icon
				name="lucide:x"
				class="close-btn"
				:class="{ show: mouseMovedRecently }"
				@click="closeFullscreen()"
			/>

			<div
				class="content-container"
				:class="{ lyrics: song.lyrics?.text }"
			>
				<PlayerFullscreenTrackDisplay
					:show-buttons="mouseMovedRecently"
				/>
				<PlayerFullscreenLyricsDisplay
					:animation-duration="0.2"
					:offset="250"
					:show-scroll-bar="mouseMovedRecently"
				/>
			</div>
		</section>
	</section>
</template>

<style lang="scss" scoped>
.fullscreen {
	position: fixed;
	top: 0;
	left: 0;

	width: 200vw;
	height: 200vh;
	z-index: 150;

	cursor: none;

	&.showCursor {
		cursor: auto;
	}
}

.background {
	position: absolute;
	inset: -25%;
	background:
		radial-gradient(ellipse, var(--background-color-one) 0%, transparent 74%),
		radial-gradient(ellipse, var(--background-color-two) 0%, transparent 76%),
		radial-gradient(ellipse, var(--background-color-three) 0%, transparent 72%),
		#15131a;
	background-repeat: no-repeat;
	background-size: 48% 48%, 44% 44%, 46% 46%, auto;
	filter: blur(28px);
	transition: background-position 9s ease-in-out;
	will-change: background-position;

	&::after {
		content: "";
		position: absolute;
		inset: 0;
		background-color: rgb(0 0 0 / 55%);
		pointer-events: none;
	}
}

@media (prefers-reduced-motion: reduce) {
	.background { transition: none; }
}

.screen-container {
	position: fixed;
	top: 0;
	left: 0;

	width: 100vw;
	height: 100vh;

	background-color: rgba(0, 0, 0, 0.45);
}

.close-btn {
	position: absolute;
	top: 1rem;
	right: 1rem;

	cursor: pointer;
	font-size: 24px;
	transition: opacity 0.2s ease;
	opacity: 0;

	&.show {
		opacity: 1;
	}
}

.content-container {
	/* TODO: A lot of magic numbers... should be variables */
	max-width: 1280px;
	width: 100%;
	height: 100%;
	margin: 0 auto;

	display: grid;
	grid-template-columns: 1fr;
	gap: 110px;

	align-items: center;

	& > * {
		max-height: 675px;
		margin: 0 auto;
	}

	&.lyrics {
		grid-template-columns: 500px 1fr;

		& > * {
			margin: initial;
		}

		& > :deep(.synced-lyrics-container) {
			max-height: none;
		}
	}
}
</style>
