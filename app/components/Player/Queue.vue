<script setup lang="ts">
const open = defineModel<boolean>("open", { default: false })
const { queue, playAlbumAtIndex } = usePlayer()

const draggedIndex = ref<number | null>(null)
const overIndex = ref<number | null>(null)

const close = () => (open.value = false)

const handleKeydown = (event: KeyboardEvent) => {
	if (event.key === "Escape") close()
}

watch(open, (isOpen) => {
	if (isOpen) document.addEventListener("keydown", handleKeydown)
	else document.removeEventListener("keydown", handleKeydown)
})

onBeforeUnmount(() => document.removeEventListener("keydown", handleKeydown))

const startDrag = (event: DragEvent, index: number) => {
	draggedIndex.value = index
	if (event.dataTransfer) {
		event.dataTransfer.effectAllowed = "move"
		event.dataTransfer.setData("text/plain", String(index))
	}
}

const dropAt = (event: DragEvent, index: number) => {
	event.preventDefault()
	const from = draggedIndex.value
	if (from === null || from === index) return

	const reordered = [...queue.value]
	const [track] = reordered.splice(from, 1)
	reordered.splice(index, 0, track!)
	queue.value = reordered
	draggedIndex.value = null
	overIndex.value = null
}

const playAt = (index: number) => playAlbumAtIndex(queue.value, index)
</script>

<template>
	<Teleport to="body">
		<Transition name="queue">
			<div v-if="open" class="queue-root" @click.self="close">
				<div class="backdrop" @click="close"></div>
				<aside
					class="drawer"
					role="dialog"
					aria-modal="true"
					aria-labelledby="queue-heading"
				>
					<header class="header">
						<h2 id="queue-heading">Up Next</h2>
						<button class="close" aria-label="Close queue" @click="close">
							<Icon name="lucide:x" />
						</button>
					</header>

					<div v-if="queue.length === 0" class="empty">
						<p>No upcoming songs.</p>
					</div>
					<ol v-else class="tracks">
						<li
							v-for="(track, index) in queue"
							:key="`${track._id}-${index}`"
							:class="{ dragging: draggedIndex === index, over: overIndex === index }"
							draggable="true"
							@dragstart="startDrag($event, index)"
							@dragover.prevent="overIndex = index"
							@dragleave="overIndex = null"
							@drop="dropAt($event, index)"
							@dragend="draggedIndex = null; overIndex = null"
						>
							<TrackRow
								:track="track"
								:index="index"
								show-image
								queue-mode
								class="queue-track"
								@play-album-at-index="playAt(index)"
							/>
						</li>
					</ol>
				</aside>
			</div>
		</Transition>
	</Teleport>
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;

.queue-root {
	position: fixed;
	inset: 0;
	z-index: 30;
}

.backdrop {
	position: absolute;
	inset: 0;
	background: rgb(0 0 0 / 55%);
}

.drawer {
	position: absolute;
	inset-block: 0;
	inset-inline-end: 0;
	display: flex;
	flex-direction: column;
	inline-size: min(28rem, 92vw);
	max-inline-size: 100vw;
	background: $color-background;
	border-inline-start: 1px solid $color-border;
	box-shadow: 0 0 2rem rgb(0 0 0 / 30%);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 2rem;
	padding: 1rem 1.25rem;
	border-bottom: 1px solid $color-border;

	h2 {
		margin: 0;
		font-size: 1.1rem;
	}
}

.close,
.play {
	border: 0;
	color: inherit;
	background: transparent;
	cursor: pointer;
}

.close {
	display: grid;
	place-items: center;
	font-size: 1.25rem;
}

.tracks {
	margin: 0;
	padding: 0.5rem;
	list-style: none;
	overflow-y: auto;
}

.tracks li {
	list-style: none;
	border-radius: $border-radius-standard;

	&.over :deep(.track) {
		background: rgb(255 255 255 / 8%);
	}

	&.dragging :deep(.track) {
		opacity: 0.45;
	}
}

.empty {
	flex: 1;
	display: grid;
	place-items: center;
	padding: 2rem;
	color: rgb(255 255 255 / 55%);
}

.queue-enter-active,
.queue-leave-active {
	transition: opacity 0.2s ease;

	.drawer {
		transition: transform 0.2s ease;
	}
}

.queue-enter-from,
.queue-leave-to {
	opacity: 0;

	.drawer {
		transform: translateX(100%);
	}
}
</style>
