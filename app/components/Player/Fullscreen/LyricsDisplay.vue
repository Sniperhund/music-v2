<script setup lang="ts">
const { animationDuration } = defineProps<{ animationDuration: number }>()

const song = useSong()
const { secondsPlayed } = usePlayer()

const parsedLyrics = computed(() => {
	if (!song.value || !song.value.lyrics.synced) return

	if (song.value.lyrics.synced) return parseLyrics(song.value.lyrics.text)
})

const lyricsRefs = useTemplateRef("lyrics")

const activeIndex = computed(() => {
	if (!parsedLyrics.value) return -1

	const time = secondsPlayed.value + animationDuration

	return parsedLyrics.value.findIndex(
		(lyric, i) =>
			lyric.time <= time &&
			(!parsedLyrics.value![i + 1] ||
				parsedLyrics.value![i + 1]!.time > time),
	)
})

const height = ref(0)

watch(parsedLyrics, () => {
	const trackDisplay = document.querySelector(".track-display")

	if (!trackDisplay) return

	const resizeObserver = new ResizeObserver((entries) => {
		height.value = entries[0]!.target.clientHeight
	})

	resizeObserver.observe(trackDisplay)
})

onMounted(() => {})

const transformY = computed(() => {
	if (activeIndex.value < 0) return 0

	let accumulatedHeight = 0

	if (!lyricsRefs.value) return 0

	for (let i = 0; i < activeIndex.value; i++) {
		const el = lyricsRefs.value[i]
		if (el) accumulatedHeight += el.getBoundingClientRect().height
	}

	return -accumulatedHeight
})
</script>

<template>
	<div
		v-if="song && song.lyrics.synced"
		class="synced-lyrics-container"
		:style="{
			height: `${height}px`,
		}"
	>
		<div
			class="synced-lyrics"
			:style="{
				transform: `translateY(${transformY + 150}px)`,
				transition: `transform ${animationDuration}s ease`,
			}"
		>
			<p
				v-for="(lyric, i) in parsedLyrics"
				:key="lyric.time"
				:class="{ active: i == activeIndex }"
				ref="lyrics"
			>
				{{ lyric.text }}
			</p>
		</div>
	</div>
	<template v-else-if="song"> </template>
</template>

<style lang="scss" scoped>
@use "@/styles/util" as *;

.synced-lyrics-container {
	position: relative;
	overflow: hidden;
}

.synced-lyrics {
	position: absolute;
	scrollbar-width: none;
	will-change: transform;

	top: 0;

	mask-image: linear-gradient(
		transparent 0%,
		#000 15%,
		#000,
		#000,
		95%,
		transparent 100%
	);

	& > p {
		@include fontSize(40px);
		font-weight: 600;
		color: white;
		opacity: 0.4;
		padding: 10px 0;
		transition:
			opacity 0.1s ease,
			filter 0.1s ease;
		filter: blur(1.5px);

		&.active {
			opacity: 1;
			filter: blur(0);
		}
	}
}
</style>
