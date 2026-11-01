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
} = useAdminVerificationPage("/admin/tracks/declined")
const { playAlbumAtIndex } = usePlayer()
useHead({ title: "Declined Verification" })
</script>

<template>
	<section class="tracks-page">
		<h1 class="title">Declined Verification</h1>
		<p v-if="status === 'pending'" class="message">Loading tracks…</p>
		<p v-else-if="error" class="message" role="alert">Could not load declined tracks.</p>
		<p v-else-if="!tracks.length" class="message">No tracks have declined verification.</p>
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
		<p v-if="total" class="page-summary">{{ total }} declined tracks</p>
		<nav v-if="totalPages > 1" class="pagination" aria-label="Declined verification pages">
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
