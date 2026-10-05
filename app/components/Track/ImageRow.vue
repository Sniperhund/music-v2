<script setup lang="ts">
import type { DropdownMenuItem } from "~/ui/DropdownMenu.vue"

interface TrackRowProps {
	track: Track
}

const { track } = defineProps<TrackRowProps>()
const emit = defineEmits<{ (e: "playAlbumAtIndex"): void }>()
const route = useRoute()

const hovering = ref(false)

const toast = useToast()

const dropdownMenuItems: DropdownMenuItem[][] = [
	[
		{
			label: "Play only this",
			icon: "lucide:play",
			onSelect() {},
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
	[
		{
			label: "Go to artist",
			icon: "lucide:user-round",
			onSelect() {
				const artist = track.artists[0]
				if (artist) navigateTo(`/artist/${artist._id}`)
			},
		},
		{
			label: "Go to album",
			icon: "lucide:disc-3",
			onSelect() {
				navigateTo(`/album/${track.album._id}`)
			},
		},
	],
]

const visibleDropdownMenuItems = computed(() =>
	dropdownMenuItems.map((group) =>
		group.filter(
			(item) =>
				!(item.label === "Go to album" && route.path.startsWith("/album/")),
		),
	),
)
</script>

<template>
	<article
		class="track"
		@mouseover="hovering = true"
		@mouseleave="hovering = false"
	>
		<div
			class="index"
			:class="{ hovering }"
			@click="emit('playAlbumAtIndex')"
		>
			<Icon name="lucide:play" />
			<NuxtImg
				:src="GET_FILE(track.album.file)"
				width="50"
				height="50"
				placeholder
			/>
		</div>

		<div>
			<p>{{ track.name }}</p>
			<ArtistName :artists="track.artists" class="artists" />
		</div>

		<DropdownMenu :items="visibleDropdownMenuItems">
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
	grid-template-columns: 40px 1fr 30px;
	gap: 0.5rem;
	align-items: center;
	padding: 0.6rem 1rem;
	border-radius: $border-radius-standard;
	background-color: $color-background;
	line-height: 1;
	width: 100%;

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
	font-size: 24px;

	position: relative;

	cursor: pointer;

	img {
		border-radius: $border-radius-standard;
	}

	span {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);

		opacity: 0;
	}

	img,
	span {
		transition: opacity 0.15s ease;
	}

	&.hovering {
		img {
			opacity: 0.4;
		}

		span {
			opacity: 1;
		}
	}
}

.artists {
	@include fontSize(14px);
}

.dropdown-icon {
	font-size: 20px;
	cursor: pointer;
}
</style>
