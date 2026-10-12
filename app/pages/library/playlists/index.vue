<script setup lang="ts">
import { GET_FILE } from "@/utils/file"
import type { Playlist } from "@/utils/types"

const {
	data: playlistsData,
	status,
	error,
	refresh,
} = await useApiFetch<Playlist[]>("/user/playlists")
const playlists = computed(() => playlistsData.value ?? [])

useHead({ title: "Playlists" })
</script>

<template>
	<section class="playlists-page">
		<header class="page-header">
			<h1>Playlists</h1>
		</header>

		<p v-if="status === 'pending'" class="message" role="status">
			Loading your playlists…
		</p>
		<div v-else-if="error" class="message" role="alert">
			<p>Your playlists could not be loaded.</p>
			<Button variant="ghost" @click="refresh">Try again</Button>
		</div>
		<p v-else-if="playlists.length === 0" class="message">
			You haven’t created any playlists yet.
		</p>
		<div v-else class="playlist-list">
			<NuxtLink
				v-for="playlist in playlists"
				:key="playlist._id"
				:to="`/library/playlists/${playlist._id}`"
				class="playlist-link"
			>
				<article class="playlist-card">
					<NuxtImg
						v-if="playlist.tracks[0]?.album?.file"
						:src="GET_FILE(playlist.tracks[0].album.file)"
						:alt="playlist.name"
						placeholder
						width="240"
						height="240"
					/>
					<Icon v-else name="lucide:list-music" class="playlist-placeholder" />
					<p class="playlist-name">{{ playlist.name }}</p>
					<p class="playlist-count">{{ playlist.tracks.length }} songs</p>
				</article>
			</NuxtLink>
		</div>
	</section>
</template>

<style lang="scss" scoped>
@use "@/styles/util" as *;
@use "@/styles/variables" as *;

.playlists-page {
	padding-bottom: 2rem;
}

.page-header h1 {
	@include fontSize(32px);
	font-weight: 700;
	margin-bottom: 1rem;
}

.playlist-list {
	display: flex;
	flex-wrap: wrap;
	gap: 1rem;
}

.playlist-link {
	color: inherit;
	text-decoration: none;
}

.playlist-card {
	@include fontSize(14px);
	max-width: 240px;
	display: flex;
	flex-direction: column;
	justify-content: flex-start;

	img {
		border-radius: $border-radius-standard;
	}

	.playlist-placeholder {
		width: 240px;
		height: 240px;
		display: grid;
		place-items: center;
		font-size: 4rem;
		border-radius: $border-radius-standard;
		background: $color-background;
	}

	.playlist-name {
		margin-top: 0.3rem;
		font-weight: 600;
	}

	.playlist-count {
		@include fontSize(13px);
		opacity: 0.7;
	}
}

.message {
	@include fontSize(14px);
	opacity: 0.7;
	margin: 0.75rem 0;
}
</style>
