<script setup lang="ts">
import { GET_FILE } from "@/utils/file"
import type { Album } from "@/utils/types"

const {
	data: albumsData,
	status,
	error,
	refresh,
} = await useApiFetch<Album[]>("/user/recently-played")
const albums = computed(() => albumsData.value ?? [])

useHead({ title: "Recently Played" })
</script>

<template>
	<section class="albums-page">
		<h1>Recently Played</h1>

		<p v-if="status === 'pending'" class="message" role="status">
			Loading recently played albums…
		</p>
		<div v-else-if="error" class="message" role="alert">
			<p>Your recently played albums could not be loaded.</p>
			<Button variant="ghost" @click="refresh">Try again</Button>
		</div>
		<p v-else-if="albums.length === 0" class="message">
			No recently played albums yet. Listen to more than 30% of a song to add its album here.
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
</style>
