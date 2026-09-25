<script setup lang="ts">
import type { DropdownMenuItem } from "~/ui/DropdownMenu.vue"

interface TrackRowProps {
	track: Track
	index: number
	extendedInfo?: boolean
	showImage?: boolean
	queueMode?: boolean
}

const { track, index, extendedInfo, showImage, queueMode } =
	defineProps<TrackRowProps>()
const emit = defineEmits<{ (e: "playAlbumAtIndex"): void }>()

const hovering = ref(false)
const { playAlbum } = usePlayer()

const toast = useToast()

const dropdownMenuItems: DropdownMenuItem[][] = [
	[
		{
			label: "Play only this",
			icon: "lucide:play",
			onSelect() {
				playAlbum([track])
			},
		},
		{
			label: "Play next",
			icon: "lucide:list-start",
			onSelect() {
				toast.show("Playing next")
			},
		},
		{
			label: "Add to queue",
			icon: "lucide:list-end",
			onSelect() {
				toast.show("Added to queue")
			},
		},
	],
]

const durationFormatted = computed(() =>
	new Date(track.durationInSeconds * 1000).toISOString().slice(14, 19),
)

const artworkSrc = computed(() => GET_FILE(track.album.file))
</script>

<template>
	<article
		class="track"
		:class="{
			extended: extendedInfo,
			odd: index % 2 == 1,
			image: showImage,
			queue: queueMode,
		}"
		@mouseenter="hovering = true"
		@mouseleave="hovering = false"
	>
		<div class="index" :class="{ hovering }">
			<template v-if="showImage">
				<Icon
					name="lucide:play"
					class="play-icon"
					@click="emit('playAlbumAtIndex')"
				/>
				<!-- Confirm before changing forced image dimensions. -->
				<NuxtImg :src="artworkSrc" width="40" height="40" placeholder />
			</template>
			<template v-else>
				<Icon
					v-if="hovering"
					name="lucide:play"
					class="play-icon inline"
					@click="emit('playAlbumAtIndex')"
				/>
				<p v-else>{{ index + 1 }}</p>
			</template>
		</div>

		<p>{{ track.name }}</p>

		<template v-if="extendedInfo">
			<ArtistName :artists="track.artists" class="artists" />
			<NuxtLink :to="`/album/${track.album._id}`">
				<p>{{ track.album.name }}</p>
			</NuxtLink>
		</template>

		<p>{{ durationFormatted }}</p>

		<Icon
			v-if="queueMode"
			name="lucide:grip-vertical"
			class="queue-handle"
			aria-hidden="true"
		/>
		<DropdownMenu v-else :items="dropdownMenuItems">
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

	p {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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
