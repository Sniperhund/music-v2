<script setup lang="ts">
const open = defineModel<boolean>("open", { default: false })
const { queue, playAlbumAtIndex } = usePlayer()

interface QueueRow {
	key: number
	track: Track
}

const queueRows = ref<QueueRow[]>([])
const draggedKey = ref<number | null>(null)
const overKey = ref<number | null>(null)
let nextRowKey = 0

const syncRows = (tracks: Track[]) => {
	const previousRows = [...queueRows.value]
	queueRows.value = tracks.map((track) => {
		const previousIndex = previousRows.findIndex((row) => row.track === track)
		if (previousIndex !== -1) {
			const [row] = previousRows.splice(previousIndex, 1)
			return row!
		}
		return { key: nextRowKey++, track }
	})
}

watch(queue, syncRows, { immediate: true, deep: true })

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
	const row = queueRows.value[index]
	if (!row) return
	draggedKey.value = row.key
	if (event.dataTransfer) {
		event.dataTransfer.effectAllowed = "move"
		event.dataTransfer.setData("text/plain", String(row.key))
	}
}

const moveTo = (event: DragEvent, key: number) => {
	event.preventDefault()
	const from = queueRows.value.findIndex((row) => row.key === draggedKey.value)
	const to = queueRows.value.findIndex((row) => row.key === key)
	if (from === -1 || to === -1 || from === to) return

	const [row] = queueRows.value.splice(from, 1)
	queueRows.value.splice(to, 0, row!)
	overKey.value = key
}

const finishDrag = () => {
	if (draggedKey.value === null) return
	queue.value = queueRows.value.map((row) => row.track)
	draggedKey.value = null
	overKey.value = null
}

const cancelDrag = () => {
	if (draggedKey.value === null) return
	syncRows(queue.value)
	draggedKey.value = null
	overKey.value = null
}

const playAt = (index: number) =>
	playAlbumAtIndex(
		queueRows.value.map((row) => row.track),
		index,
	)

const moveRow = (index: number, direction: -1 | 1) => {
	const destination = index + direction
	if (destination < 0 || destination >= queueRows.value.length) return

	const [row] = queueRows.value.splice(index, 1)
	queueRows.value.splice(destination, 0, row!)
	queue.value = queueRows.value.map((item) => item.track)
}
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

					<div v-if="queueRows.length === 0" class="empty">
						<p>No upcoming songs.</p>
					</div>
					<ol v-else class="tracks">
						<li
							v-for="(row, index) in queueRows"
							:key="row.key"
							:class="{
								dragging: draggedKey === row.key,
								over: overKey === row.key,
							}"
							draggable="true"
							@dragstart="startDrag($event, index)"
							@dragenter="moveTo($event, row.key)"
							@dragover.prevent
							@dragleave="overKey = null"
							@drop="finishDrag"
							@dragend="cancelDrag"
						>
							<div class="queue-row">
								<TrackRow
									:track="row.track"
									:index="index"
									show-image
									queue-mode
									class="queue-track"
									@play-album-at-index="playAt(index)"
								/>
								<div
									class="queue-order-actions"
									role="group"
									:aria-label="`Reorder ${row.track.name}`"
								>
									<button
										type="button"
										:aria-label="`Move ${row.track.name} up in queue`"
										:disabled="index === 0"
										@click="moveRow(index, -1)"
									>
										<Icon name="lucide:chevron-up" aria-hidden="true" />
									</button>
									<button
										type="button"
										:aria-label="`Move ${row.track.name} down in queue`"
										:disabled="index === queueRows.length - 1"
										@click="moveRow(index, 1)"
									>
										<Icon name="lucide:chevron-down" aria-hidden="true" />
									</button>
								</div>
							</div>
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

.queue-row {
	position: relative;
}

.queue-order-actions {
	display: none;
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

@media (max-width: 767px) {
	.queue-root {
		z-index: 120;
	}

	.drawer {
		inset-block: 18dvh 0;
		inset-inline: 0;
		inline-size: 100%;
		border-inline-start: 0;
		border-top: 1px solid $color-border;
		border-radius: 1rem 1rem 0 0;
		padding-bottom: env(safe-area-inset-bottom);
	}

	.header {
		padding: 0.85rem 1rem;
	}

	.close {
		padding: 0.75rem;
	}

	.tracks {
		min-height: 0;
		flex: 1;
		overscroll-behavior: contain;
		-webkit-overflow-scrolling: touch;
	}

	.queue-row {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.queue-track {
		flex: 1;
		min-width: 0;
		grid-template-columns: 40px minmax(0, 1fr);
		padding-inline: 0.5rem;
	}

	.queue-row :deep(.queue-track > :nth-last-child(-n + 2)) {
		display: none;
	}

	.queue-order-actions {
		display: flex;
		flex-direction: column;

		button {
			display: grid;
			place-items: center;
			border: 0;
			padding: 0.875rem;
			color: inherit;
			background: transparent;
			font-size: 1rem;
		}

		button:disabled {
			color: rgb(255 255 255 / 30%);
			cursor: default;
		}
	}

	.queue-enter-active,
	.queue-leave-active {
		.drawer {
			transition: transform 0.2s ease;
		}
	}

	.queue-enter-from,
	.queue-leave-to {
		.drawer {
			transform: translateY(100%);
		}
	}
}
</style>
