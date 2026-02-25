<script setup lang="ts">
const player = usePlayer()

const { data } = useApiFetch("/all/tracks")

const play = () => {
	player.addToQueue(data.value[0])
	player.play()
}
</script>

<template>
	<h1>Home</h1>

	<AlbumSlider />
</template>
