<script setup lang="ts">
import type { Album } from "@/utils/types"
import { GET_FILE } from "@/utils/file"

const { data: albumsData } = await useApiFetch<Album[]>("/user/new-albums")
const albums = computed(() => albumsData.value ?? [])
</script>

<template>
	<Slider v-if="albums.length" title="New Albums for You">
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
