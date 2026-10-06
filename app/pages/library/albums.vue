<script setup lang="ts">
import { GET_FILE } from "@/utils/file"
import type { Album } from "@/utils/types"

const {
	data: albumsData,
	status,
	error,
	refresh,
} = await useApiFetch<Album[]>("/user/albums")
const albums = computed(() => albumsData.value ?? [])

useHead({ title: "Albums" })
</script>

<template>
	<section class="albums-page">
		<h1>Albums</h1>

		<p v-if="status === 'pending'" class="message" role="status">
			Loading your albums…
		</p>
		<div v-else-if="error" class="message" role="alert">
			<p>Your albums could not be loaded.</p>
			<Button variant="ghost" @click="refresh">Try again</Button>
		</div>
		<p v-else-if="albums.length === 0" class="message">
			No saved albums yet. Save a song to add its album here.
		</p>
		<div v-else class="album-list">
			<AlbumCard
				v-for="album in albums"
				:key="album._id"
				:name="album.name"
				:file="GET_FILE(album.file)"
				:artists="album.artists"
				:_id="album._id"
			/>
		</div>
	</section>
</template>

<style lang="scss" scoped>
@use "@/styles/util" as *;

.albums-page {
	padding-bottom: 2rem;

	h1 {
		@include fontSize(32px);
		font-weight: 700;
		margin-bottom: 1rem;
	}
}

.album-list {
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
	.album-list {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}

	.album-list :deep(.card) {
		min-width: 0;
		max-width: none;
	}

	.album-list :deep(.card img) {
		display: block;
		width: 100%;
		height: auto;
	}
}
</style>
