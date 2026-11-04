<script setup lang="ts">
import { GET_FILE } from "@/utils/file"
import { clearRequestCache } from "@/utils/requestCache"
import type { LyricsVerificationStatus, VerificationStatus } from "@/utils/types"

const { fullscreen, close: closeFullscreen } = useFullscreen()
const song = useSong()
const {
	fullscreenLyricsReviewTrack,
	continueAfterFullscreenLyricsReview,
	updateQueuedAlbumVerification,
} = usePlayer()
const { data: user } = useApiFetch<{ role?: string }>("/user")
const toast = useToast()
const lyricsReviewNote = ref("")
const trackReviewDecision = ref<VerificationStatus>("undecided")
const albumReviewDecision = ref<VerificationStatus>("undecided")
const lyricsReviewDecision = ref<LyricsVerificationStatus>("undecided")
const lyricsReviewModalOpen = ref(false)
const mouseMovedRecently = ref(true)

watch(fullscreenLyricsReviewTrack, (track) => {
	lyricsReviewNote.value = track?.verification?.lyricsNote ?? ""
	trackReviewDecision.value = "undecided"
	albumReviewDecision.value = "undecided"
	lyricsReviewDecision.value = "undecided"
	lyricsReviewModalOpen.value = Boolean(track)
}, { flush: "sync", immediate: true })

const finishReview = async () => {
	const track = fullscreenLyricsReviewTrack.value
	if (!track) return
	const review = {
		trackStatus: trackReviewDecision.value,
		albumStatus: albumReviewDecision.value,
		lyricsStatus: lyricsReviewDecision.value,
		lyricsNote: lyricsReviewNote.value.trim(),
	}
	const hasDecision = trackReviewDecision.value !== "undecided" || albumReviewDecision.value !== "undecided" || lyricsReviewDecision.value !== "undecided"
	if (hasDecision) {
		if (user.value?.role !== "admin") return
		try {
			await $fetch("/api/admin/verification", {
				method: "POST",
				body: {
					trackId: track._id,
					...(trackReviewDecision.value !== "undecided" ? { trackStatus: review.trackStatus } : {}),
					...(albumReviewDecision.value !== "undecided" ? { albumStatus: review.albumStatus } : {}),
					...(lyricsReviewDecision.value !== "undecided" ? {
						lyricsStatus: review.lyricsStatus,
						...(lyricsReviewDecision.value === "approved-with-changes" ? { lyricsNote: review.lyricsNote } : {}),
					} : {}),
				},
			})
			if (trackReviewDecision.value !== "undecided") {
				track.verification = {
					song: trackReviewDecision.value,
					lyrics: track.verification?.lyrics ?? "undecided",
					lyricsNote: track.verification?.lyricsNote,
				}
			}
			if (albumReviewDecision.value !== "undecided") {
				track.album.verification = albumReviewDecision.value
				updateQueuedAlbumVerification(track.album._id, albumReviewDecision.value)
			}
			if (lyricsReviewDecision.value !== "undecided") {
				track.verification = {
					song: track.verification?.song ?? "undecided",
					lyrics: lyricsReviewDecision.value,
					lyricsNote: lyricsReviewDecision.value === "approved-with-changes" ? review.lyricsNote : undefined,
				}
			}
			clearRequestCache()
			await refreshNuxtData()
		} catch {
			toast.show("Could not save verification", "error")
			return
		}
	}
	lyricsReviewModalOpen.value = false
	await continueAfterFullscreenLyricsReview()
}

onMounted(() => {
	let timeoutId: NodeJS.Timeout

	const handleMouseMove = () => {
		mouseMovedRecently.value = true

		clearTimeout(timeoutId)
		timeoutId = setTimeout(() => {
			mouseMovedRecently.value = false
		}, 2000)
	}
	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === "Escape" && fullscreen.value) {
			if (lyricsReviewModalOpen.value) {
				event.preventDefault()
				return
			}
			closeFullscreen()
		}
	}

	window.addEventListener("mousemove", handleMouseMove)
	window.addEventListener("keydown", handleKeydown)

	onUnmounted(() => {
		window.removeEventListener("mousemove", handleMouseMove)
		window.removeEventListener("keydown", handleKeydown)
	})
})

const nuxtApp = useNuxtApp()

nuxtApp.hook("page:finish", () => {
	closeFullscreen()
})
</script>

<template>
	<section
		class="fullscreen"
		:class="{ showCursor: mouseMovedRecently }"
		v-show="fullscreen"
	>
		<template v-if="song">
			<PlayerFullscreenBackgroundWash
				:src="GET_FILE(song.album.file)"
				:active="fullscreen"
			/>
		</template>

		<section class="screen-container" v-if="song">
			<Icon
				name="lucide:x"
				class="close-btn"
				:class="{ show: mouseMovedRecently }"
				@click="closeFullscreen()"
			/>

			<div
				class="content-container"
				:class="{ lyrics: song.lyrics?.text }"
			>
				<PlayerFullscreenTrackDisplay
					:show-buttons="mouseMovedRecently"
				/>
				<PlayerFullscreenLyricsDisplay
					:animation-duration="0.2"
					:offset="250"
					:show-scroll-bar="mouseMovedRecently"
				/>
			</div>
		</section>
	</section>
	<TrackVerificationReviewModal
		v-model:open="lyricsReviewModalOpen"
		v-model:note="lyricsReviewNote"
		v-model:track-decision="trackReviewDecision"
		v-model:album-decision="albumReviewDecision"
		v-model:lyrics-decision="lyricsReviewDecision"
		:track-name="fullscreenLyricsReviewTrack?.name"
		:track-status="fullscreenLyricsReviewTrack?.verification?.song"
		:album-status="fullscreenLyricsReviewTrack?.album.verification"
		:lyrics-status="fullscreenLyricsReviewTrack?.verification?.lyrics"
		:has-lyrics="Boolean(fullscreenLyricsReviewTrack?.lyrics?.text?.trim())"
		:lyrics-synced="fullscreenLyricsReviewTrack?.lyrics?.synced"
		@finish="finishReview"
	/>
</template>

<style lang="scss" scoped>
.fullscreen {
	position: fixed;
	top: 0;
	left: 0;

	width: 100vw;
	height: 100vh;
	z-index: 150;

	cursor: none;

	&.showCursor {
		cursor: auto;
	}
}

.screen-container {
	position: fixed;
	top: 0;
	left: 0;

	width: 100vw;
	height: 100vh;

		background-color: rgba(0, 0, 0, 0.34);
}

.close-btn {
	position: absolute;
	top: 1rem;
	right: 1rem;

	cursor: pointer;
	font-size: 24px;
	transition: opacity 0.2s ease;
	opacity: 0;

	&.show {
		opacity: 1;
	}
}

.content-container {
	/* TODO: A lot of magic numbers... should be variables */
	max-width: 1280px;
	width: 100%;
	height: 100%;
	margin: 0 auto;

	display: grid;
	grid-template-columns: 1fr;
	gap: 110px;

	align-items: center;

	& > * {
		max-height: 675px;
		margin: 0 auto;
	}

	&.lyrics {
		grid-template-columns: 500px 1fr;

		& > * {
			margin: initial;
		}

		& > :deep(.synced-lyrics-container) {
			max-height: none;
		}
	}
}
</style>
