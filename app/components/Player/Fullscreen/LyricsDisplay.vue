<script setup lang="ts">
const { animationDuration, offset, showScrollBar } = defineProps<{
	animationDuration: number
	offset: number
	showScrollBar: boolean
}>()

const song = useSong()
const { secondsPlayed } = usePlayer()

const parsedLyrics = computed(() => {
	if (!song.value || !song.value.lyrics.synced) return

	if (song.value.lyrics.synced) return parseLyrics(song.value.lyrics.text)
})

const lyricsRefs = useTemplateRef("lyrics")

const activeIndex = computed(() => {
	if (!parsedLyrics.value) return -1

	const time = secondsPlayed.value

	return parsedLyrics.value.findIndex(
		(lyric, i) =>
			lyric.time <= time &&
			(!parsedLyrics.value![i + 1] ||
				parsedLyrics.value![i + 1]!.time > time),
	)
})
const scrollActiveIndex = computed(() => {
	if (!parsedLyrics.value) return -1

	const time = secondsPlayed.value + animationDuration

	let index = parsedLyrics.value.findIndex(
		(lyric, i) =>
			lyric.time <= time &&
			(!parsedLyrics.value![i + 1] ||
				parsedLyrics.value![i + 1]!.time > time),
	)

	if (index >= parsedLyrics.value.length - 1)
		index = parsedLyrics.value.length - 2
	return index
})

const height = ref(0)

watch(song, () => {
	const trackDisplay = document.querySelector(".track-display")

	if (!trackDisplay) return

	const resizeObserver = new ResizeObserver((entries) => {
		height.value = entries[0]!.target.clientHeight
	})

	resizeObserver.observe(trackDisplay)
})

const transformY = computed(() => {
	if (activeIndex.value < 0) return 0

	let accumulatedHeight = 0

	if (!lyricsRefs.value) return 0

	for (let i = 0; i < scrollActiveIndex.value; i++) {
		const el = lyricsRefs.value[i]
		if (el) accumulatedHeight += el.getBoundingClientRect().height
	}

	return -accumulatedHeight
})

const containerRef = useTemplateRef("container-ref")
const outerRef = useTemplateRef("outer-ref")

const manualOffset = ref(0)
const isScrolling = ref(false)

let scrollingTimeout: any = null

const onWheel = (event: WheelEvent) => {
	if (!containerRef.value || !outerRef.value) return

	isScrolling.value = true
	clearTimeout(scrollingTimeout)

	const delta = event.deltaY

	manualOffset.value -= delta

	const maxTranslate = offset
	const minTranslate =
		-containerRef.value.scrollHeight + outerRef.value.offsetHeight

	manualOffset.value = Math.min(
		maxTranslate,
		Math.max(minTranslate, manualOffset.value),
	)

	scrollingTimeout = setTimeout(() => (isScrolling.value = false), 3000)
}

const finalTransform = computed(() => {
	if (isScrolling.value) return manualOffset.value

	return transformY.value + offset
})
</script>

<template>
	<div
		ref="outer-ref"
		v-if="song && song.lyrics && song.lyrics.synced"
		class="synced-lyrics-container"
		:style="{
			height: `${height}px`,
		}"
		@wheel.prevent="onWheel"
	>
		<div
			ref="container-ref"
			class="synced-lyrics"
			:style="{
				transform: `translateY(${finalTransform}px)`,
				transition: `transform ${animationDuration}s ease`,
			}"
		>
			<p
				v-for="(lyric, i) in parsedLyrics"
				:key="lyric.time"
				:class="{ active: i == scrollActiveIndex }"
				ref="lyrics"
				@click="() => (secondsPlayed = lyric.time)"
			>
				{{ lyric.text }}
			</p>
		</div>
	</div>
	<div
		v-else-if="song && song.lyrics && song.lyrics.text"
		class="lyrics"
		:style="{
			height: `${height}px`,
		}"
		:class="{ show: showScrollBar }"
	>
		<p>{{ song.lyrics.text }}</p>
	</div>
</template>

<style lang="scss" scoped>
@use "@/styles/util" as *;
@use "@/styles/variables" as *;

.synced-lyrics-container {
	position: relative;
	overflow: hidden;

	mask-image: linear-gradient(
		transparent 0%,
		#000 15%,
		#000,
		#000,
		95%,
		transparent 100%
	);
}

.synced-lyrics {
	position: absolute;
	scrollbar-width: none;
	will-change: transform;

	top: 0;

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
			filter: initial;
		}

		&:hover {
			cursor: pointer;
			opacity: 1;
			filter: initial;
		}
	}
}

.lyrics {
	overflow: hidden;

	& > p {
		height: 100%;
		overflow-y: scroll;
		white-space: pre-wrap;

		&::-webkit-scrollbar {
			width: 10px;
		}

		&::-webkit-scrollbar-thumb {
			background-color: transparent;
			border-radius: 5px;
		}
	}

	&.show > p::-webkit-scrollbar-thumb {
		background-color: $color-secondary-background;
	}
}
</style>
