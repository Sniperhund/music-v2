<script setup lang="ts">
import type { Album } from "@/utils/types"

type AlbumProps = Omit<Omit<Album, "genre">, "artists"> & {
	artists: Array<Omit<Artist, "file">>
	genre?: Genre
}

const props = defineProps<AlbumProps>()
</script>

<template>
	<article class="card">
		<NuxtLink :to="`/album/${props._id}`">
			<NuxtImg :src="props.file" :alt="props.name" />
			<p>{{ props.name }}</p>
		</NuxtLink>
		<ArtistName :artists="props.artists" class="artist" />
	</article>
</template>

<style lang="scss" scoped>
@use "@/styles/util" as *;
@use "@/styles/variables" as *;

$width: 240px;

.card {
	@include fontSize(14px);

	max-width: $width;

	display: flex;
	flex-direction: column;
	justify-content: start;

	& > a {
		& img {
			border-radius: $border-radius-standard;

			width: $width;
		}

		& p {
			margin-top: 0.3rem;
		}
	}
}

.artist {
	opacity: 0.6;
}
</style>
