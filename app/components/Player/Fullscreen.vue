<script setup lang="ts">
const fullscreen = useFullscreen()
const song = useSong()
</script>

<template>
	<section class="fullscreen" v-show="fullscreen">
		<template v-if="song">
			<NuxtImg
				:src="GET_FILE(song.album.file)"
				:alt="song.name"
				width="500"
				height="500"
				class="background"
			/>
		</template>

		<section class="container">
			<Icon
				name="lucide:x"
				class="close-btn show"
				@click="fullscreen = false"
			/>
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

.container {
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
</style>
