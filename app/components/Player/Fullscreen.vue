<script setup lang="ts">
const fullscreen = useFullscreen()
const song = useSong()

const mouseMovedRecently = ref(true)

onMounted(() => {
	let timeoutId: NodeJS.Timeout

	const handleMouseMove = () => {
		mouseMovedRecently.value = true

		clearTimeout(timeoutId)
		timeoutId = setTimeout(() => {
			mouseMovedRecently.value = false
		}, 2000)
	}

	window.addEventListener("mousemove", handleMouseMove)

	onUnmounted(() => {
		window.removeEventListener("mousemove", handleMouseMove)
	})
})
</script>

<template>
	<section
		class="fullscreen"
		:class="{ showCursor: mouseMovedRecently }"
		v-show="fullscreen"
	>
		<template v-if="song">
			<NuxtImg
				:src="GET_FILE(song.album.file)"
				:alt="song.name"
				width="500"
				height="500"
				class="background"
			/>
		</template>

		<section class="screen-container">
			<Icon
				name="lucide:x"
				class="close-btn show"
				@click="fullscreen = false"
			/>

			<div class="content-container">
				<PlayerFullscreenTrackDisplay
					:show-buttons="!mouseMovedRecently"
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
	top: -25%;
	left: -25%;

	width: 100%;
	height: 100%;
	object-fit: cover;
	filter: blur(40px);
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
	grid-template-columns: 500px 1fr;
	gap: 110px;

	align-items: center;

	& > * {
		max-height: 675px;
	}
}
</style>
