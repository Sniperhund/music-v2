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
			<NuxtImg
				:src="props.file"
				:alt="props.name"
				placeholder
				width="240"
				height="240"
			/>
			<p>{{ props.name }}</p>
		</NuxtLink>
		<ArtistName :artists="props.artists" class="artist" />
	</article>
</template>

<style lang="scss" scoped>
@use "@/styles/util" as *;
@use "@/styles/variables" as *;

.card {
	@include fontSize(14px);

	max-width: 240px;

	display: flex;
	flex-direction: column;
	justify-content: start;

	& > a {
		& img {
			border-radius: $border-radius-standard;
		}

		& p {
			margin-top: 0.3rem;
		}
	}
}
</style>
