<script setup lang="ts">
const { currentSong, isPlaying } = usePlayer()

useHead({
	titleTemplate: (titleChunk) =>
		currentSong.value && isPlaying.value
			? `${currentSong.value.name} - Now Playing - Music`
			: `${titleChunk || "Home"} - Music`,
})
</script>

<template>
	<ToastContainer />
	<NuxtLayout>
		<NuxtPage />
		<Player />
	</NuxtLayout>
</template>

<style lang="scss">
@use "styles/global.scss";
</style>
