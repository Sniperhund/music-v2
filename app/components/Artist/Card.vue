<script setup lang="ts">
import { GET_FILE } from "@/utils/file"
import type { Artist } from "@/utils/types"

const props = defineProps<{ artist: Artist }>()
</script>

<template>
	<article class="card">
		<NuxtLink :to="`/artist/${props.artist._id}`">
			<NuxtImg
				:src="GET_FILE(props.artist.file)"
				:alt="props.artist.name"
				placeholder
			/>
			<p>{{ props.artist.name }}</p>
		</NuxtLink>
	</article>
</template>

<style lang="scss" scoped>
@use "@/styles/util" as *;
@use "@/styles/variables" as *;

.card {
	@include fontSize(14px);

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
