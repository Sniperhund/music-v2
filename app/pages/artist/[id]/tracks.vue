<script setup lang="ts">
const route = useRoute()
const id = computed(() => route.params.id)

const { data: tracksData } = await useApiFetch<Track[]>(
	`/artists/${id.value}/tracks`,
)

const { playAlbumAtIndex } = usePlayer()
</script>

<template>
	<section class="tracks">
		<h1 class="title">Songs</h1>

		<TrackRow
			v-for="(track, i) in tracksData"
			:key="track._id"
			:track="track"
			:index="i"
			show-image
			@play-album-at-index="() => playAlbumAtIndex(tracksData, i)"
		/>
	</section>
</template>

<style lang="scss" scoped>
@use "@/styles/util" as *;

.tracks {
	display: flex;
	flex-direction: column;
	gap: 0.4rem;
}

.title {
	@include fontSize(32px);
	font-weight: 700;

	margin-bottom: 1.5rem;
}
</style>
