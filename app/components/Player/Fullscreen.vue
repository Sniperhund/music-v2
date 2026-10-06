<script setup lang="ts">
import { GET_FILE } from "@/utils/file"

const { fullscreen, close: closeFullscreen } = useFullscreen()
const song = useSong()
const mouseMovedRecently = ref(true)
const mobileView = ref(false)
const showMobileLyrics = ref(false)
const queueOpen = useState<boolean>("queueOpen", () => false)
const dragOffset = ref(0)
const isDragging = ref(false)
let dragPointerId: number | null = null
let dragStartX = 0
let dragStartY = 0
let dragStartedAt = 0
let clickSuppressionTimer: number | undefined
let closeAnimationTimer: number | undefined

function suppressClickThrough(event: MouseEvent) {
	event.preventDefault()
	event.stopImmediatePropagation()
	if (clickSuppressionTimer !== undefined)
		window.clearTimeout(clickSuppressionTimer)
	clickSuppressionTimer = undefined
	document.removeEventListener("click", suppressClickThrough, true)
}

function startDrag(event: PointerEvent) {
	if (!mobileView.value || !event.isPrimary) return
	if (event.pointerType === "mouse" && event.button !== 0) return
	if (event.clientY > window.innerHeight * 0.16) return

	const target = event.target
	if (
		target instanceof Element &&
		target.closest(
			"button, a, input, [role='slider'], .slider, .btns, .volume-slider, .mobile-tabs",
		)
	)
		return

	dragPointerId = event.pointerId
	dragStartX = event.clientX
	dragStartY = event.clientY
	dragStartedAt = performance.now()
	const element = event.currentTarget as HTMLElement
	element.setPointerCapture(event.pointerId)
}

function moveDrag(event: PointerEvent) {
	if (dragPointerId !== event.pointerId) return

	const deltaX = event.clientX - dragStartX
	const deltaY = event.clientY - dragStartY
	if (Math.abs(deltaX) > Math.abs(deltaY)) return
	if (deltaY <= 0) {
		dragOffset.value = 0
		return
	}

	event.preventDefault()
	isDragging.value = true
	dragOffset.value = deltaY
}

function endDrag(event: PointerEvent) {
	if (dragPointerId !== event.pointerId) return

	const deltaY = Math.max(0, event.clientY - dragStartY)
	const deltaX = Math.abs(event.clientX - dragStartX)
	const elapsed = performance.now() - dragStartedAt
	const closeThreshold = Math.max(96, window.innerHeight * 0.16)
	const shouldClose =
		deltaX <= deltaY &&
		(deltaY >= closeThreshold || (deltaY >= 56 && elapsed < 220))

	dragPointerId = null
	if (shouldClose) {
		document.addEventListener("click", suppressClickThrough, true)
		clickSuppressionTimer = window.setTimeout(() => {
			document.removeEventListener("click", suppressClickThrough, true)
			clickSuppressionTimer = undefined
		}, 400)
		isDragging.value = false
		dragOffset.value = window.innerHeight
		if (closeAnimationTimer !== undefined)
			window.clearTimeout(closeAnimationTimer)
		closeAnimationTimer = window.setTimeout(finishCloseAnimation, 400)
		return
	}

	isDragging.value = false
	dragOffset.value = 0
}

function finishCloseAnimation() {
	if (closeAnimationTimer !== undefined)
		window.clearTimeout(closeAnimationTimer)
	closeAnimationTimer = undefined
	closeFullscreen()
	dragOffset.value = 0
}

function onFullscreenTransitionEnd(event: TransitionEvent) {
	if (
		closeAnimationTimer !== undefined &&
		event.target === event.currentTarget &&
		event.propertyName === "transform"
	)
		finishCloseAnimation()
}

function cancelDrag(event: PointerEvent) {
	if (dragPointerId !== event.pointerId) return
	dragPointerId = null
	isDragging.value = false
	dragOffset.value = 0
}

onMounted(() => {
	let timeoutId: NodeJS.Timeout
	const mobileQuery = window.matchMedia("(max-width: 767px)")
	const updateMobileView = () => (mobileView.value = mobileQuery.matches)
	updateMobileView()
	mobileQuery.addEventListener("change", updateMobileView)

	const handleMouseMove = () => {
		mouseMovedRecently.value = true

		clearTimeout(timeoutId)
		timeoutId = setTimeout(() => {
			mouseMovedRecently.value = false
		}, 2000)
	}
	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === "Escape" && fullscreen.value) {
			closeFullscreen()
		}
	}

	window.addEventListener("mousemove", handleMouseMove)
	window.addEventListener("keydown", handleKeydown)

	onUnmounted(() => {
		window.removeEventListener("mousemove", handleMouseMove)
		window.removeEventListener("keydown", handleKeydown)
		mobileQuery.removeEventListener("change", updateMobileView)
		document.removeEventListener("click", suppressClickThrough, true)
		if (clickSuppressionTimer !== undefined)
			window.clearTimeout(clickSuppressionTimer)
		if (closeAnimationTimer !== undefined)
			window.clearTimeout(closeAnimationTimer)
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
		:class="{ showCursor: mouseMovedRecently, dragging: isDragging }"
		:style="{ '--drag-offset': `${dragOffset}px` }"
		@transitionend="onFullscreenTransitionEnd"
		v-show="fullscreen"
	>
		<template v-if="song">
			<PlayerFullscreenBackgroundWash
				:src="GET_FILE(song.album.file)"
				:active="fullscreen"
			/>
		</template>

		<section
			class="screen-container"
			v-if="song"
			@pointerdown="startDrag"
			@pointermove="moveDrag"
			@pointerup="endDrag"
			@pointercancel="cancelDrag"
		>
			<Icon
				v-if="!mobileView"
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
				<nav
					v-if="mobileView"
					class="mobile-tabs"
					aria-label="Player views"
				>
					<button
						:class="{ selected: showMobileLyrics }"
						aria-label="Toggle lyrics"
						@click="showMobileLyrics = !showMobileLyrics"
					>
						<Icon name="lucide:message-square-quote" />
					</button>
					<button aria-label="Open queue" @click="queueOpen = true">
						<Icon name="lucide:list" />
					</button>
				</nav>
				<PlayerFullscreenLyricsDisplay
					v-if="
						!mobileView || (showMobileLyrics && song.lyrics?.text)
					"
					:animation-duration="0.2"
					:offset="mobileView ? 100 : 250"
					:show-scroll-bar="mouseMovedRecently"
				/>
			</div>
		</section>
	</section>
</template>

<style lang="scss" scoped>
.fullscreen {
	position: fixed;
	inset: 0;
	z-index: 150;
	overflow: hidden;

	cursor: none;

	&.showCursor {
		cursor: auto;
	}
}

.screen-container {
	position: fixed;
	inset: 0;

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

.mobile-tabs {
	display: none;
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

@media (max-width: 767px) {
	.screen-container {
		touch-action: none;
	}

	.fullscreen {
		transition: transform 280ms ease-out;
		transform: translate3d(0, var(--drag-offset, 0px), 0);

		&.dragging {
			transition: none;
		}
	}

	.close-btn {
		top: calc(0.75rem + env(safe-area-inset-top));
		right: 0.75rem;
		z-index: 2;
		padding: 0.6rem;
		opacity: 1;
		font-size: 1.4rem;

		&.show {
			opacity: 1;
		}
	}

	.mobile-tabs {
		display: flex;
		justify-content: center;
		gap: 3rem;
		margin: 0 auto;
		color: rgba(255, 255, 255, 0.72);

		button {
			border: 0;
			padding: 0.5rem;
			color: inherit;
			background: transparent;
			font-size: 1.5rem;
		}

		.selected {
			color: white;
		}
	}

	.content-container {
		max-width: none;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		justify-content: space-between;
		gap: 1.5rem;
		overflow: hidden;
		padding: max(11vh, calc(2.75rem + env(safe-area-inset-top))) 1.5rem
			calc(env(safe-area-inset-bottom));
		height: 100vh;

		& > * {
			max-height: none;
			margin: 0 auto;
		}

		&.lyrics {
			grid-template-columns: 1fr;
		}
	}
}
</style>
