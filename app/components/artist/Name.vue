<script setup lang="ts">
import { NuxtLink } from "#components"

interface ArtistNameProps {
	artists: Omit<Artist, "file">[]
	element?: string | typeof NuxtLink
}

const props = withDefaults(defineProps<ArtistNameProps>(), {
	element: NuxtLink,
})

/**
 * @param index It stops showing a suffix when the index is 0 (so length - index)
 */
const suffix = (index: number) => {
	if (index > 1) return ", "
	return ""
}
</script>

<template>
	<div v-if="props.artists" class="artist-name">
		<div v-for="(artist, index) in props.artists" :key="artist._id">
			<component
				:is="props.element"
				v-bind="
					props.element == NuxtLink
						? { to: `/artist/${artist._id}` }
						: {}
				"
			>
				{{ artist.name }}
			</component>
			<span>{{ suffix(props.artists.length - index) }}</span>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.artist-name {
	display: inline-flex;
	flex-wrap: wrap;

	& span {
		white-space: pre;
	}
}
</style>
