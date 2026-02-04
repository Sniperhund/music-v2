<script setup lang="ts">
const route = useRoute()
const id = computed(() => route.params.id)

const {
	data: albumData,
	pending,
	error,
	refresh,
} = await useApiFetch(`/albums/${id.value}`)
</script>

<template>
	<section class="info">
		<nuxt-img :src="GET_FILE(albumData.file)" />

		<div class="details">
			<h1>{{ albumData.name }}</h1>
			<ArtistName :artists="albumData.artists" class="artist" />

			<div class="buttons">
				<Button icon-name="lucide:play">Play</Button>
				<Button icon-name="lucide:shuffle">Shuffle</Button>
			</div>
		</div>
	</section>
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;
@use "@/styles/util";

.info {
	display: flex;
	gap: 1rem;

	& img {
		aspect-ratio: 1 / 1;
		max-width: 300px;
		border-radius: $border-radius-standard;
	}

	.details {
		padding-top: 3.5rem;

		display: flex;
		flex-direction: column;
		gap: 0.2rem;

		& h1 {
			@include util.fontSize(32px);
			font-weight: 700;
			line-height: 2.4rem;
		}

		.artist {
			@include util.fontSize(18px);
		}

		.buttons {
			margin-top: auto;
			display: flex;
			gap: 1rem;
		}
	}
}
</style>
