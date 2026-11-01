<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin" })
const { data, status, error } = useApiFetch<Track[]>("/admin/tracks/unverified")
const tracks = computed(() => data.value ?? [])
const { playAlbumAtIndex } = usePlayer()
useHead({ title: "Awaiting Verification" })
</script>

<template>
	<section class="tracks-page">
		<h1 class="title">Awaiting Verification</h1>
		<p v-if="status === 'pending'" class="message">Loading tracks…</p>
		<p v-else-if="error" class="message" role="alert">Could not load tracks awaiting verification.</p>
		<p v-else-if="!tracks.length" class="message">No tracks are awaiting verification.</p>
		<template v-else>
			<TrackRow
				v-for="(track, index) in tracks"
				:key="track._id"
				:track="track"
				:index="index"
				show-image
				@play-album-at-index="() => playAlbumAtIndex(tracks, index)"
			/>
		</template>
	</section>
</template>

<style lang="scss" scoped>
@use "@/styles/util" as *;

.tracks-page {
	display: flex;
	flex-direction: column;
	gap: 0.4rem;
}

.title {
	@include fontSize(32px);
	font-weight: 700;
	margin-bottom: 1.5rem;
}

.message {
	padding: 1rem 0;
}
</style>
