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
			:verification="album.verification"
			:approved-track-count="album.approvedTrackCount"
			:partially-approved-track-count="album.partiallyApprovedTrackCount"
			:unapproved-track-count="album.unapprovedTrackCount"
			:denied-track-count="album.deniedTrackCount"
		/>
	</Slider>
</template>
