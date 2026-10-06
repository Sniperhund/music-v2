<script setup lang="ts">
const route = useRoute()
const id = computed(() => route.params.id)

const { data: tracksData } = await useApiFetch<Track[]>(
	`/artists/${id.value}/tracks`,
)
const tracks = computed(() => tracksData.value ?? [])

const { playAlbumAtIndex } = usePlayer()
useHead({ title: "Artist Songs" })
</script>

<template>
	<section class="tracks">
		<h1 class="title">Songs</h1>

		<TrackRow
			v-for="(track, i) in tracks"
			:key="track._id"
			:track="track"
			:index="i"
			show-image
			touch-friendly
			@play-album-at-index="() => playAlbumAtIndex(tracks, i)"
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

@media (max-width: 767px) {
	.title {
		@include fontSize(26px);
		margin-bottom: 1rem;
	}

	.tracks :deep(.track.image) {
		grid-template-columns: 40px minmax(0, 1fr) auto auto;
		gap: 0.5rem;
		padding-inline: 0.5rem;
	}
}
</style>
