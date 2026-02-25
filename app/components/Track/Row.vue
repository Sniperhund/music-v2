<script setup lang="ts">
import type { DropdownMenuItem } from "~/ui/DropdownMenu.vue"

interface TrackRowProps {
	track: Track
	index: number
	extendedInfo?: boolean
}

const { track, index, extendedInfo } = defineProps<TrackRowProps>()
const emit = defineEmits<{ (e: "playAlbumAtIndex"): void }>()

const hovering = ref(false)

const toast = useToast()

const dropdownMenuItems: DropdownMenuItem[] = [
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
]

const durationFormatted = computed(() =>
	new Date(track.durationInSeconds * 1000).toISOString().slice(14, 19),
)
</script>

<template>
	<article
		class="track"
		:class="{ extended: extendedInfo, odd: index % 2 == 1 }"
		@mouseover="hovering = true"
		@mouseleave="hovering = false"
	>
		<div class="index">
			<Icon
				name="lucide:play"
				@click="emit('playAlbumAtIndex')"
				v-if="hovering"
			/>
			<p v-else>{{ index + 1 }}</p>
		</div>

		<p>{{ track.name }}</p>

		<template v-if="extendedInfo">
			<ArtistName :artists="track.artists" class="artists" />
			<NuxtLink :to="`/album/${track.album._id}`">
				<p>{{ track.album.name }}</p>
			</NuxtLink>
		</template>

		<p>{{ durationFormatted }}</p>

		<DropdownMenu :items="dropdownMenuItems">
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
	grid-template-columns: 30px 1fr 50px 30px;
	gap: 0.5rem;
	align-items: center;
	padding: 0.6rem 1rem;
	border-radius: $border-radius-standard;
	background-color: $color-background;
	line-height: 1;

	&.odd {
		background-color: color.adjust($color-background, $lightness: 5%);
	}

	&.extended {
		grid-template-columns: 30px 2fr 1fr 1fr 50px 30px;
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

	cursor: pointer;
}

.artists {
	opacity: 1;
}

.dropdown-icon {
	font-size: 20px;
}
</style>
