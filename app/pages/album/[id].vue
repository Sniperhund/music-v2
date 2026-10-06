<script setup lang="ts">
import { GET_FILE } from "@/utils/file"

const route = useRoute()
const id = computed(() => route.params.id)

const { data: albumData } = await useApiFetch<Album>(`/albums/${id.value}`)

const { data: tracksData } = await useApiFetch<Track[]>(
	`/albums/${id.value}/tracks`,
)
const tracks = computed(() => tracksData.value ?? [])

const { playAlbum, playShuffledAlbum, playAlbumAtIndex } = usePlayer()
useHead({ title: computed(() => albumData.value ? `${albumData.value.name} - Album` : "Album") })
</script>

<template>
	<section class="info" v-if="albumData">
		<NuxtImg
			:src="GET_FILE(albumData.file)"
			width="300"
			height="300"
			placeholder
		/>

		<div class="details">
			<h1>{{ albumData.name }}</h1>
			<ArtistName :artists="albumData.artists" class="artist" />

			<div class="buttons">
				<Button
					icon-name="lucide:play"
					@click="() => playAlbum(tracks)"
					>Play</Button
				>
				<Button
					icon-name="lucide:shuffle"
					@click="() => playShuffledAlbum(tracks)"
					>Shuffle</Button
				>
			</div>
		</div>
	</section>

	<section class="tracks">
		<TrackRow
			v-for="(track, i) in tracks"
			:key="track._id"
			:track="track"
			:index="i"
			@play-album-at-index="() => playAlbumAtIndex(tracks, i)"
		/>
	</section>
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;
@use "@/styles/util";

.info {
	display: flex;
	gap: 1rem;
	margin-bottom: 2rem;

	& img {
		border-radius: $border-radius-standard;
	}

	.details {
		padding-top: 3.5rem;

		display: flex;
		flex-direction: column;
		gap: 0.2rem;

		& h1 {
			@include util.fontSize(32px);
			font-weight: 700;
			line-height: 2.4rem;
		}

		.artist {
			@include util.fontSize(18px);
		}

		.buttons {
			margin-top: auto;
			display: flex;
			gap: 1rem;
		}
	}
}

.tracks {
	display: flex;
	flex-direction: column;
	gap: 0.4rem;
}
</style>
