<script setup lang="ts">
import { GET_FILE } from "@/utils/file"
import type { Playlist } from "@/utils/types"

const route = useRoute()
const { playAlbum, playShuffledAlbum, playAlbumAtIndex } = usePlayer()
const {
	data: playlistData,
	status,
	error,
	refresh,
} = await useApiFetch<Playlist>(() => `/user/playlists/${route.params.id}`)
const playlist = computed(() => playlistData.value)
const tracks = computed(() => playlist.value?.tracks ?? [])
const artwork = computed(() => {
	const file = tracks.value[0]?.album?.file
	return file ? GET_FILE(file) : undefined
})

const playTracks = () => {
	if (tracks.value.length) void playAlbum(tracks.value)
}
const shuffleTracks = () => {
	if (tracks.value.length) void playShuffledAlbum(tracks.value)
}

useHead(() => ({ title: playlist.value?.name ?? "Playlist" }))
</script>

<template>
	<section class="playlist-page">
		<p v-if="status === 'pending'" class="message" role="status">
			Loading playlist…
		</p>
		<div v-else-if="error" class="message" role="alert">
			<p>This playlist could not be loaded.</p>
			<Button variant="ghost" @click="refresh">Try again</Button>
			<Button variant="ghost" type="link" to="/library/playlists">
				Back to playlists
			</Button>
		</div>
		<template v-else-if="playlist">
			<section class="info">
				<NuxtImg
					v-if="artwork"
					:src="artwork"
					:alt="playlist.name"
					width="300"
					height="300"
					placeholder
				/>
				<div class="details">
					<p class="eyebrow">Playlist · {{ tracks.length }} songs</p>
					<h1>{{ playlist.name }}</h1>
					<div v-if="tracks.length" class="buttons">
					<Button icon-name="lucide:play" @click="playTracks">Play</Button>
					<Button icon-name="lucide:shuffle" @click="shuffleTracks">Shuffle</Button>
					</div>
				</div>
			</section>

			<p v-if="tracks.length === 0" class="message">
				This playlist is empty. Add songs from a track’s menu.
			</p>
			<section v-else class="tracks">
				<TrackRow
					v-for="(track, index) in tracks"
					:key="track._id"
					:track="track"
					:index="index"
					@play-album-at-index="() => playAlbumAtIndex(tracks, index)"
				/>
			</section>
		</template>
	</section>
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;
@use "@/styles/util" as *;

.playlist-page {
	padding-bottom: 2rem;
}

.info {
	display: flex;
	gap: 1rem;
	margin-bottom: 2rem;

	img {
		border-radius: $border-radius-standard;
	}

	.details {
		padding-top: 3.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;

		h1 {
			@include fontSize(32px);
			font-weight: 700;
			line-height: 2.4rem;
		}

		.eyebrow {
			@include fontSize(14px);
			opacity: 0.7;
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

.message {
	@include fontSize(14px);
	opacity: 0.7;
	margin: 0.75rem 0;
}
</style>
