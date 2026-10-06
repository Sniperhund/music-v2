<script setup lang="ts">
import type { Track } from "@/utils/types"

const toast = useToast()
const { playAlbum, playShuffledAlbum, playAlbumAtIndex } = usePlayer()
const {
	data: tracksData,
	status,
	error,
	refresh,
} = await useApiFetch<Track[]>("/user/tracks")
const tracks = computed(() => tracksData.value ?? [])
const playTracks = () => {
	if (tracks.value.length) void playAlbum(tracks.value)
}

const shuffleTracks = () => {
	if (tracks.value.length) void playShuffledAlbum(tracks.value)
}

const removeFromLibrary = (track: Track) => {
	tracksData.value = tracks.value.filter(
		(savedTrack) => savedTrack._id !== track._id,
	)
}

useHead({ title: "Songs" })
</script>

<template>
	<section class="songs-page">
		<header class="page-header">
			<h1>Songs</h1>
			<div v-if="tracks.length" class="page-actions">
				<Button icon-name="lucide:play" @click="playTracks">Play</Button>
				<Button icon-name="lucide:shuffle" @click="shuffleTracks">Shuffle</Button>
			</div>
		</header>

		<p v-if="status === 'pending'" class="message" role="status">
			Loading your songs…
		</p>
		<div v-else-if="error" class="message" role="alert">
			<p>Your songs could not be loaded.</p>
			<Button variant="ghost" @click="refresh">Try again</Button>
		</div>
		<p v-else-if="tracks.length === 0" class="message">
			You haven’t saved any songs yet.
		</p>
		<div v-else class="track-list">
			<TrackRow
				v-for="(track, index) in tracks"
				:key="track._id"
				:track="track"
				:index="index"
				:extended-info="true"
				library-list
				@play-album-at-index="() => playAlbumAtIndex(tracks, index)"
				@remove-from-library="removeFromLibrary"
			/>
		</div>
	</section>
</template>

<style lang="scss" scoped>
@use "@/styles/util" as *;

.songs-page {
	padding-bottom: 2rem;
}

.page-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	margin-bottom: 1rem;

	h1 {
		@include fontSize(32px);
		font-weight: 700;
	}
}

.page-actions {
	display: flex;
	gap: 0.75rem;
}

.track-list {
	display: flex;
	flex-direction: column;
	gap: 0.4rem;
}

.message {
	@include fontSize(14px);
	opacity: 0.7;
	margin: 0.75rem 0;
}

@media (max-width: 359px) {
	.page-header {
		flex-wrap: wrap;
		justify-content: flex-start;
	}
}
</style>
