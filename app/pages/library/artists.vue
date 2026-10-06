<script setup lang="ts">
import type { Artist } from "@/utils/types"

const {
	data: artistsData,
	status,
	error,
	refresh,
} = await useApiFetch<Artist[]>("/user/artists")
const artists = computed(() => artistsData.value ?? [])

useHead({ title: "Artists" })
</script>

<template>
	<section class="artists-page">
		<h1>Artists</h1>

		<p v-if="status === 'pending'" class="message" role="status">
			Loading your artists…
		</p>
		<div v-else-if="error" class="message" role="alert">
			<p>Your artists could not be loaded.</p>
			<Button variant="ghost" @click="refresh">Try again</Button>
		</div>
		<p v-else-if="artists.length === 0" class="message">
			No artists in your saved songs yet.
		</p>
		<div v-else class="artist-list">
			<ArtistCard
				v-for="artist in artists"
				:key="artist._id"
				:artist="artist"
			/>
		</div>
	</section>
</template>

<style lang="scss" scoped>
@use "@/styles/util" as *;

.artists-page {
	padding-bottom: 2rem;

	h1 {
		@include fontSize(32px);
		font-weight: 700;
		margin-bottom: 1rem;
	}
}

.artist-list {
	display: flex;
	flex-wrap: wrap;
	gap: 1rem;
}

.message {
	@include fontSize(14px);
	opacity: 0.7;
	margin: 0.75rem 0;
}

@media (max-width: 767px) {
	.artist-list {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}

	.artist-list :deep(.card) {
		min-width: 0;
	}

	.artist-list :deep(.card img) {
		display: block;
		width: 100%;
		height: auto;
	}
}
</style>
