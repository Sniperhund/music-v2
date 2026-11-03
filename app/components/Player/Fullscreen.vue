<script setup lang="ts">
import { GET_FILE } from "@/utils/file"
import { clearRequestCache } from "@/utils/requestCache"

const { fullscreen, close: closeFullscreen } = useFullscreen()
const song = useSong()
const {
	fullscreenLyricsReviewTrack,
	continueAfterFullscreenLyricsReview,
} = usePlayer()
const { data: user } = useApiFetch<{ role?: string }>("/user")
const toast = useToast()
const lyricsReviewNote = ref("")
const lyricsReviewModalOpen = ref(false)
const mouseMovedRecently = ref(true)

watch(fullscreenLyricsReviewTrack, (track) => {
	lyricsReviewNote.value = ""
	lyricsReviewModalOpen.value = Boolean(track && user.value?.role === "admin")
}, { immediate: true })

const dismissLyricsReview = () => {
	lyricsReviewModalOpen.value = false
	void continueAfterFullscreenLyricsReview()
}

const submitLyricsReview = async (status: "approved" | "approved-with-changes" | "denied") => {
	const track = fullscreenLyricsReviewTrack.value
	if (!track || user.value?.role !== "admin") return
	try {
		await $fetch("/api/admin/verification", {
			method: "PATCH",
			query: { id: track._id },
			body: {
				target: "lyrics",
				status,
				...(status === "approved-with-changes" ? { lyricsNote: lyricsReviewNote.value } : {}),
			},
		})
		clearRequestCache()
		await refreshNuxtData()
		toast.show(status === "approved-with-changes" ? "Lyrics approved with minor changes required" : `Lyrics ${status}`)
		lyricsReviewModalOpen.value = false
		await continueAfterFullscreenLyricsReview()
	} catch {
		toast.show("Could not update lyrics verification", "error")
	}
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
	<TrackLyricsVerificationModal
		v-model:open="lyricsReviewModalOpen"
		v-model:note="lyricsReviewNote"
		mode="review"
		:track-name="fullscreenLyricsReviewTrack?.name"
		:lyrics-synced="fullscreenLyricsReviewTrack?.lyrics?.synced"
		@approve="submitLyricsReview('approved')"
		@approve-with-changes="submitLyricsReview('approved-with-changes')"
		@deny="submitLyricsReview('denied')"
		@dismiss="dismissLyricsReview"
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
