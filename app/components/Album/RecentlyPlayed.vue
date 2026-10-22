<script setup lang="ts">
import type { Album } from "@/utils/types"
import { GET_FILE } from "@/utils/file"

const { data: albumsData } = await useApiFetch<Album[]>("/user/recently-played")
const albums = computed(() => albumsData.value ?? [])
</script>

<template>
	<Slider v-if="albums.length" title="Recently Played" href="/recently-played">
		<AlbumCard
			v-for="album in albums"
			:key="album._id"
			:name="album.name"
			:file="GET_FILE(album.file)"
			:artists="album.artists"
			:_id="album._id"
		/>
	</Slider>
</template>
