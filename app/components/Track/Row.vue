<script setup lang="ts">
import type { DropdownMenuItem } from "~/ui/DropdownMenu.vue"

interface TrackRowProps {
	track?: Track
	entity?: {
		type: "album" | "artist"
		_id: string
		name: string
		file?: string
		cover?: string
		artists?: Artist[]
	}
	index: number
	extendedInfo?: boolean
	showImage?: boolean
	queueMode?: boolean
}

const props = defineProps<TrackRowProps>()
const emit = defineEmits<{
	(e: "playAlbumAtIndex"): void
	(e: "removeFromLibrary", track: Track): void
}>()
const route = useRoute()

const hovering = ref(false)
const { playAlbum, addToFrontOfQueue, addToQueue } = usePlayer()
const toast = useToast()
const { isSaved, toggleSaved } = useTrackLibrary(() =>
	props.queueMode ? undefined : props.track?._id,
)

const dropdownMenuItems = computed<DropdownMenuItem[][]>(() => [
	[
		{
			label: "Play only this",
			icon: "lucide:play",
			onSelect() {
				if (props.track) playAlbum([props.track])
			},
		},
		{
			label: "Play next",
			icon: "lucide:list-start",
			onSelect() {
				if (!props.track) return
				addToFrontOfQueue(props.track)
				toast.show("Playing next")
			},
		},
		{
			label: "Add to queue",
			icon: "lucide:list-end",
			onSelect() {
				if (!props.track) return
				addToQueue(props.track)
				toast.show("Added to queue")
			},
		},
	],
	[
		{
			label:
				isSaved.value === null
					? "Checking Library…"
					: isSaved.value
						? "Remove from Library"
						: "Save to Library",
			icon: isSaved.value ? "lucide:bookmark-minus" : "lucide:bookmark-plus",
			async onSelect() {
				const removed = await toggleSaved()
				if (removed && props.track) emit("removeFromLibrary", props.track)
			},
		},
		{
			label: "Add to playlist",
			icon: "lucide:list-plus",
			onSelect() {
				toast.show("Playlists are not implemented")
			},
		},
	],
	[
		{
			label: "Go to artist",
			icon: "lucide:user-round",
			onSelect() {
				const artist = props.track?.artists[0]
				if (artist) navigateTo(`/artist/${artist._id}`)
			},
		},
		{
			label: "Go to album",
			icon: "lucide:disc-3",
			onSelect() {
				if (props.track) navigateTo(`/album/${props.track.album._id}`)
			},
		},
	],
])

const visibleDropdownMenuItems = computed(() =>
	dropdownMenuItems.value.map((group) =>
		group.filter(
			(item) => !(item.label === "Go to album" && route.path.startsWith("/album/")),
		),
	),
)

const durationFormatted = computed(() => {
	if (!props.track) return ""
	return new Date(props.track.durationInSeconds * 1000)
		.toISOString()
		.slice(14, 19)
})

const artworkSrc = computed(() => {
	if (props.track) return GET_FILE(props.track.album.file)
	const file = props.entity?.file ?? props.entity?.cover
	return file ? GET_FILE(file) : undefined
})
</script>

<template>
	<article
		class="track"
		:class="{
			extended: props.extendedInfo,
			odd: props.index % 2 == 1,
			image: props.showImage,
			queue: props.queueMode,
		}"
		@mouseenter="hovering = true"
		@mouseleave="hovering = false"
	>
		<div class="index" :class="{ hovering }">
			<template v-if="props.showImage">
				<Icon
					v-if="props.track"
					name="lucide:play"
					class="play-icon"
					@click="emit('playAlbumAtIndex')"
				/>
				<!-- Keep the existing TrackRow artwork dimensions unchanged. -->
				<NuxtImg
					v-if="artworkSrc"
					:src="artworkSrc"
					width="40"
					height="40"
					placeholder
				/>
			</template>
			<template v-else>
				<Icon
					v-if="hovering"
					name="lucide:play"
					class="play-icon inline"
					@click="emit('playAlbumAtIndex')"
				/>
				<p v-else>{{ props.index + 1 }}</p>
			</template>
		</div>

		<p v-if="props.track">{{ props.track.name }}</p>
		<NuxtLink
			v-else-if="props.entity"
			:to="`/${props.entity.type}/${props.entity._id}`"
		>
			{{ props.entity.name }}
		</NuxtLink>

		<template v-if="props.track && props.extendedInfo">
			<ArtistName :artists="props.track.artists" class="artists" />
			<NuxtLink :to="`/album/${props.track.album._id}`">
				<p>{{ props.track.album.name }}</p>
			</NuxtLink>
		</template>
		<template v-else-if="props.entity">
			<ArtistName
				v-if="props.entity.type === 'album' && props.entity.artists?.length"
				:artists="props.entity.artists"
				class="artists"
			/>
			<span v-else />
			<p>{{ props.entity.type }}</p>
		</template>

		<p v-if="props.track">{{ durationFormatted }}</p>

		<Icon
			v-if="props.queueMode"
			name="lucide:grip-vertical"
			class="queue-handle"
			aria-hidden="true"
		/>
		<DropdownMenu v-else-if="props.track" :items="visibleDropdownMenuItems">
			<Icon name="lucide:ellipsis" class="dropdown-icon" />
		</DropdownMenu>
	</article>
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;
@use "@/styles/util" as *;
@use "sass:color";

.track {
	display: grid;
	grid-template-columns: 40px 1fr 50px 30px;
	gap: 0.5rem;
	align-items: center;
	padding: 0.6rem 1rem;
	border-radius: $border-radius-standard;
	background-color: $color-background;
	line-height: 1;

	&.odd {
		background-color: color.adjust($color-background, $lightness: 3%);
	}

	&:hover {
		background-color: color.adjust($color-background, $lightness: 5%);
	}

	&.extended {
		grid-template-columns: 40px 2fr 1fr 1fr 50px 30px;
	}

	&.image {
		grid-template-columns: 40px 1fr 50px 30px;
		padding: 0.45rem 1rem;

		.index {
			height: 40px;
		}
	}

	&.queue {
		cursor: grab;
	}

	p,
	> a {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	> a {
		color: inherit;
		text-decoration: none;
	}
}

.index {
	display: flex;
	justify-content: center;
	align-items: center;
	font-size: 20px;
	height: 20px;
	position: relative;
	cursor: pointer;

	img {
		border-radius: $border-radius-standard;
	}

	.play-icon {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		opacity: 0;
		z-index: 1;
		font-size: 24px;
	}

	.play-icon.inline {
		position: static;
		transform: none;
		opacity: 1;
	}

	img,
	.play-icon {
		transition: opacity 0.15s ease;
	}

	&.hovering {
		img {
			opacity: 0.4;
		}

		.play-icon {
			opacity: 1;
		}
	}
}

.artists {
	opacity: 1;
}

.dropdown-icon {
	font-size: 20px;
	cursor: pointer;
}

.queue-handle {
	opacity: 0.5;
	cursor: grab;
}
</style>
