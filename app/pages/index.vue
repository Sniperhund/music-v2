<script setup lang="ts">
const player = usePlayer()

const { data } = useApiFetch("/all/tracks")

const play = () => {
	player.addToQueue(data.value[0])
	player.play()
}
</script>

<template>
	<Button @click="play">Test play</Button>

	<AlbumSlider />

	<div :style="{ height: '100vh' }"></div>
</template>
