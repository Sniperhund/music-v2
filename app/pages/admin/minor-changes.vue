<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin" })
const {
	page,
	status,
	error,
	tracks,
	total,
	totalPages,
	previousPage,
	nextPage,
} = useAdminVerificationPage("/admin/tracks/minor-changes")
const { playAlbumAtIndex } = usePlayer()
useHead({ title: "Lyrics: Minor Changes Required" })
</script>

<template>
	<section class="tracks-page">
		<h1 class="title">Lyrics: Minor Changes Required</h1>
		<p v-if="status === 'pending'" class="message">Loading tracks…</p>
		<p v-else-if="error" class="message" role="alert">Could not load tracks with lyrics requiring minor changes.</p>
		<p v-else-if="!tracks.length" class="message">No lyrics are marked as requiring minor changes.</p>
		<template v-else>
			<div
				v-for="(track, index) in tracks"
				:key="track._id"
				class="review-track"
			>
				<TrackRow
					:track="track"
					:index="index"
					show-image
					@play-album-at-index="() => playAlbumAtIndex(tracks, index)"
				/>
				<p class="change-note">
					<strong>Changes required:</strong>
					{{ track.verification?.lyricsNote || "No details provided." }}
				</p>
			</div>
		</template>
		<p v-if="total" class="page-summary">{{ total }} tracks with lyrics requiring minor changes</p>
		<nav v-if="totalPages > 1" class="pagination" aria-label="Minor changes pages">
			<Button :disabled="page === 0" @click="previousPage">Previous</Button>
			<span>Page {{ page + 1 }} of {{ totalPages }}</span>
			<Button :disabled="page + 1 >= totalPages" @click="nextPage">Next</Button>
		</nav>
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

.review-track {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.change-note {
	padding: 0 1rem 0.5rem;
	white-space: pre-wrap;
}

.page-summary {
	margin-top: 1rem;
}

.pagination {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 1rem;
	margin-top: 1rem;
}
</style>
