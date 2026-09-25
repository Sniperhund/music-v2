<script setup lang="ts">
interface SearchResult {
	type: "track" | "album" | "artist"
	_id: string
	name: string
	file?: string
	cover?: string
	album?: { _id?: string; name?: string; file?: string; cover?: string }
	artists?: Artist[]
}

const props = defineProps<{ result: SearchResult; index: number }>()
const emit = defineEmits<{ (e: "play"): void }>()

const artworkSrc = computed(() => {
	const file = props.result.type === "track"
		? props.result.album?.file ?? props.result.album?.cover
		: props.result.file ?? props.result.cover
	return file ? GET_FILE(file) : undefined
})

const entryType = computed(() =>
	props.result.type === "track"
		? "Song"
		: props.result.type === "album"
			? "Album"
			: "Artist",
)
</script>

<template>
	<article class="search-row" :class="{ odd: props.index % 2 === 1 }">
		<div class="artwork" @click="props.result.type === 'track' && emit('play')">
			<NuxtImg
				v-if="artworkSrc"
				:src="artworkSrc"
				width="40"
				height="40"
				placeholder
			/>
			<Icon
				v-if="props.result.type === 'track'"
				name="lucide:play"
				class="play-icon"
			/>
		</div>
		<div class="details">
			<p v-if="props.result.type === 'track'">{{ props.result.name }}</p>
			<NuxtLink
				v-else
				:to="`/${props.result.type}/${props.result._id}`"
			>
				{{ props.result.name }}
			</NuxtLink>
			<span class="entry-type">{{ entryType }}</span>
		</div>
		<ArtistName
			v-if="props.result.type === 'album' && props.result.artists?.length"
			:artists="props.result.artists"
			class="artists"
		/>
		<span v-else />
	</article>
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;
@use "sass:color";

.search-row {
	display: grid;
	grid-template-columns: 40px minmax(0, 1fr) minmax(0, 1fr);
	gap: 0.75rem;
	align-items: center;
	padding: 0.7rem 1rem;
	border-radius: $border-radius-standard;
	background-color: $color-background;
	line-height: 1.2;

	&.odd {
		background-color: color.adjust($color-background, $lightness: 3%);
	}

	&:hover {
		background-color: color.adjust($color-background, $lightness: 5%);
	}
}

.artwork {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: $border-radius-standard;
	cursor: pointer;

	img {
		max-width: 100%;
		max-height: 100%;
		border-radius: inherit;
	}

	&:hover .play-icon {
		opacity: 1;
	}
}

.play-icon {
	position: absolute;
	opacity: 0;
	font-size: 1.4rem;
	transition: opacity 0.15s ease;
}

.details {
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 0.3rem;

	p,
	a {
		overflow: hidden;
		margin: 0;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	a {
		color: inherit;
		text-decoration: none;
	}
}

.entry-type {
	font-size: 0.8em;
	opacity: 0.65;
}

.artists {
	min-width: 0;
}
</style>
