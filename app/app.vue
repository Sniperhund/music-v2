<script setup lang="ts">
const { currentSong, isPlaying } = usePlayer()
const debugView = useCookie("DEBUG_VIEW")
const debugViewEnabled = computed(() => String(debugView.value ?? "") === "1")

useHead({
	meta: [
		{ name: "theme-color", content: "#09090b" },
		{ name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
		{ name: "apple-mobile-web-app-capable", content: "yes" },
		{ name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
	],
	link: [{ rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" }],
})

useHead(
	computed(() => ({
		titleTemplate:
			currentSong.value && isPlaying.value
				? `${currentSong.value.name} - Now Playing - Music`
				: (titleChunk) => `${titleChunk || "Home"} - Music`,
	})),
)
</script>

<template>
	<NuxtPwaManifest />
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
