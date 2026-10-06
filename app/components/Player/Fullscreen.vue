<script setup lang="ts">
import { GET_FILE } from "@/utils/file"

const { fullscreen, close: closeFullscreen } = useFullscreen()
const song = useSong()
const mouseMovedRecently = ref(true)
const mobileView = ref(false)

onMounted(() => {
	let timeoutId: NodeJS.Timeout
	const mobileQuery = window.matchMedia("(max-width: 767px)")
	const updateMobileView = () => (mobileView.value = mobileQuery.matches)
	updateMobileView()
	mobileQuery.addEventListener("change", updateMobileView)

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
		mobileQuery.removeEventListener("change", updateMobileView)
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
		<template v-if="song">
			<PlayerFullscreenBackgroundWash
				:src="GET_FILE(song.album.file)"
				:active="fullscreen"
			/>
		</template>

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
					:offset="mobileView ? 100 : 250"
					:show-scroll-bar="mouseMovedRecently"
				/>
			</div>
		</section>
	</section>
</template>

<style lang="scss" scoped>
.fullscreen {
	position: fixed;
	inset: 0;
	z-index: 150;

	cursor: none;

	&.showCursor {
		cursor: auto;
	}
}

.screen-container {
	position: fixed;
	inset: 0;

		background-color: rgba(0, 0, 0, 0.34);
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

@media (max-width: 767px) {
	.close-btn {
		top: calc(0.75rem + env(safe-area-inset-top));
		right: 0.75rem;
		z-index: 2;
		padding: 0.6rem;
		opacity: 1;
		font-size: 1.4rem;

		&.show {
			opacity: 1;
		}
	}

	.content-container {
		max-width: none;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		justify-content: safe center;
		gap: 1.25rem;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: calc(3.75rem + env(safe-area-inset-top)) 1rem
			calc(1rem + env(safe-area-inset-bottom));

		& > * {
			max-height: none;
			margin: 0 auto;
		}

		&.lyrics {
			grid-template-columns: 1fr;
		}

	}
}
</style>
