<script setup lang="ts">
import type { Track } from "@/utils/types"
import { getReplayGradient } from "~/utils/replay"

interface ReplayData {
	period: string
	title: string
	totals: { playCount: number; listenedSeconds: number; activeDays: number }
	tracks: Array<{ track: Track; playCount: number; listenedSeconds: number }>
	artists: Array<{ artist: Omit<Artist, "file">; playCount: number; listenedSeconds: number }>
	albums: Array<{ album: { _id: string; name: string; file: string }; playCount: number; listenedSeconds: number }>
}

const route = useRoute()
const period = computed(() => String(route.params.period))
const { data, status, error, refresh } = await useApiFetch<ReplayData>(() => `/user/replay/${encodeURIComponent(period.value)}`)
const replay = computed(() => data.value)
const tracks = computed(() => replay.value?.tracks.map((entry) => entry.track) ?? [])
const topArtists = computed(() => replay.value?.artists.slice(0, 3).map((entry) => entry.artist) ?? [])

const { playAlbum, playShuffledAlbum, playAlbumAtIndex } = usePlayer()

useHead({ title: computed(() => replay.value ? `${replay.value.title} - Replay` : "Replay") })
</script>

<template>
	<section class="replay-page">
		<p v-if="status === 'pending'" class="message" role="status">Loading Replay…</p>
		<div v-else-if="error" class="message" role="alert">
			<p>This Replay could not be loaded.</p>
			<Button variant="ghost" @click="refresh">Try again</Button>
			<Button variant="ghost" type="link" to="/">Back to Replay cards</Button>
		</div>
		<template v-else-if="replay">
			<section class="info">
				<div class="cover">
					<ReplayArtwork
						:title="replay.title"
						:period="replay.period"
						:top-artists="[]"
						:gradient="getReplayGradient(replay.period)"
					/>
				</div>
				<div class="details">
					<p class="eyebrow">Replay · {{ tracks.length }} songs</p>
					<h1>{{ replay.title }}</h1>
					<ArtistName v-if="topArtists.length" :artists="topArtists" class="artist" />
					<div v-if="tracks.length" class="buttons">
						<Button icon-name="lucide:play" @click="playAlbum(tracks)">Play</Button>
						<Button icon-name="lucide:shuffle" @click="playShuffledAlbum(tracks)">Shuffle</Button>
					</div>
				</div>
			</section>

			<p v-if="tracks.length === 0" class="message">No qualifying listens were recorded for this Replay.</p>
			<section v-else class="tracks">
				<TrackRow
					v-for="(entry, index) in replay.tracks"
					:key="entry.track._id"
					:track="entry.track"
					:index="index"
					@play-album-at-index="() => playAlbumAtIndex(tracks, index)"
				/>
			</section>
		</template>
	</section>
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;
@use "@/styles/util";

.replay-page {
	padding-bottom: 2rem;
}

.info {
	display: flex;
	gap: 1rem;
	margin-bottom: 2rem;

	.cover {
		position: relative;
		flex: 0 0 300px;
		width: 300px;
		height: 300px;
		overflow: hidden;
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

		.eyebrow {
			@include util.fontSize(14px);
			opacity: 0.7;
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

.message {
	@include util.fontSize(14px);
	opacity: 0.7;
	margin: 0.75rem 0;
}
</style>
