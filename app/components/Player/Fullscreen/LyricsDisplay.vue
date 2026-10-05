<script setup lang="ts">
const { animationDuration, offset, showScrollBar } = defineProps<{
	animationDuration: number
	offset: number
	showScrollBar: boolean
}>()

const song = useSong()
const { fullscreen } = useFullscreen()
const { secondsPlayed, refreshPosition } = usePlayer()
const debugView = useCookie("DEBUG_VIEW")
const debugViewEnabled = computed(() => String(debugView.value ?? "") === "1")

const parsedLyrics = computed(() => {
	if (!song.value?.lyrics?.synced) return []

	return parseLyrics(song.value.lyrics.text)
})
const hasParsedLyrics = computed(() => parsedLyrics.value.length > 0)

const findLyricIndex = (time: number) => {
	if (!hasParsedLyrics.value) return -1

	const index = parsedLyrics.value.findIndex(
		(lyric, i) =>
			lyric.time <= time &&
			(!parsedLyrics.value![i + 1] ||
				parsedLyrics.value![i + 1]!.time > time),
	)

	return index
}

const activeIndex = computed(() => {
	return findLyricIndex(secondsPlayed.value)
})
const scrollActiveIndex = computed(() => {
	if (!hasParsedLyrics.value) return -1

	const time = secondsPlayed.value + animationDuration

	let index = findLyricIndex(time)
	if (index === -1 && time < parsedLyrics.value[0]!.time) index = 0

	if (index >= parsedLyrics.value.length - 1)
		index = parsedLyrics.value.length - 2
	return index
})

const height = ref<number>()
const top = ref(0)
const syncedHeight = ref<number>()
const layoutVersion = ref(0)
const topFadeExtension = 75

const updateLyricsLayout = () => {
	const trackDisplay = document.querySelector(".track-display")

	if (!trackDisplay) return

	height.value = trackDisplay.clientHeight
	top.value = trackDisplay.getBoundingClientRect().top
	syncedHeight.value = window.innerHeight - top.value - 100
}

watch(
	fullscreen,
	async () => {
		if (fullscreen.value) refreshPosition()
		await nextTick()
		updateLyricsLayout()
		if (fullscreen.value) {
			requestAnimationFrame(() => {
				updateLyricsLayout()
				layoutVersion.value++
			})
		}
	},
	{ immediate: true },
)

onMounted(() => window.addEventListener("resize", updateLyricsLayout))
onUnmounted(() => window.removeEventListener("resize", updateLyricsLayout))

const containerRef = useTemplateRef("container-ref")
const outerRef = useTemplateRef("outer-ref")

const transformY = computed(() => {
	layoutVersion.value
	const lines = containerRef.value?.children
	if (scrollActiveIndex.value < 0 || !lines?.length) return 0

	let accumulatedHeight = 0
	for (let i = 0; i < scrollActiveIndex.value; i++) {
		const line = lines[i] as HTMLElement | undefined
		if (line) accumulatedHeight += line.getBoundingClientRect().height
	}

	return -accumulatedHeight
})

const manualOffset = ref(0)
const isScrolling = ref(false)

let scrollingTimeout: any = null

const onWheel = (event: WheelEvent) => {
	if (!containerRef.value || !outerRef.value) return

	if (!isScrolling.value) {
		manualOffset.value = finalTransform.value
	}

	isScrolling.value = true
	clearTimeout(scrollingTimeout)

	const delta = event.deltaY

	manualOffset.value -= delta

	const maxTranslate = finalTransform.value + offset
	const lowerViewportLimit = Math.max(
		outerRef.value.offsetHeight,
		window.innerHeight - 300,
	)
	const minTranslate = -containerRef.value.scrollHeight + lowerViewportLimit

	manualOffset.value = Math.min(
		maxTranslate,
		Math.max(minTranslate, manualOffset.value),
	)

	scrollingTimeout = setTimeout(() => (isScrolling.value = false), 3000)
}

const onLyricClick = (time: number) => {
	clearTimeout(scrollingTimeout)
	isScrolling.value = false
	secondsPlayed.value = time
}

const finalTransform = computed(() => {
	if (isScrolling.value) return manualOffset.value

	return transformY.value + offset + topFadeExtension
})
</script>

<template>
	<div
		v-if="debugViewEnabled"
		:style="[
			{
				position: 'absolute',
				top: '455px',
				width: '100px',
				height: '1px',
				backgroundColor: 'red',
				right: '900px',
			},
			{
				transform: 'translateY(20px)',
			},
		]"
	/>
	<div
		ref="outer-ref"
		v-if="song && song.lyrics && song.lyrics.synced && hasParsedLyrics"
		class="synced-lyrics-container"
		:style="{
			height: `${syncedHeight + topFadeExtension}px`,
			marginTop: `${top - topFadeExtension}px`,
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
				:class="{
					active: i == activeIndex,
					past: i < activeIndex && !isScrolling,
				}"
				@click="onLyricClick(lyric.time)"
			>
				{{ lyric.text }}
			</p>
		</div>
	</div>
	<div
		v-else-if="song?.lyrics?.text"
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
	align-self: start;

	mask-image: linear-gradient(
		to bottom,
		transparent 0%,
		#000 15%,
		#000 calc(100% - 200px),
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
		margin: 0;
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

		&.past {
			opacity: 0;
			filter: blur(1.5px);
			transition: opacity 0.4s ease;

			&:hover {
				cursor: default;
				opacity: 0;
				filter: blur(1.5px);
			}
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
