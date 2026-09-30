<script setup lang="ts">
const { currentSong, isPlaying } = usePlayer()
const debugView = useCookie("DEBUG_VIEW")
const debugViewEnabled = computed(() => String(debugView.value ?? "") === "1")

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
	<div v-if="debugViewEnabled" class="debug-view-disclaimer">
		Debug view: everything may not align correctly on different screens.
		It's made for 1920x1080
	</div>
</template>

<style lang="scss">
@use "styles/global.scss";

.debug-view-disclaimer {
	position: fixed;
	right: 1rem;
	bottom: 1rem;
	z-index: 200;
	padding: 0.5rem 0.75rem;
	border-radius: 0.25rem;
	background: rgba(0, 0, 0, 0.7);
	color: white;
	font-size: 0.875rem;
}
</style>
