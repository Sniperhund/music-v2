<script setup lang="ts">
const route = useRoute()
const id = computed(() => route.params.id)

const { data: artistData } = await useApiFetch<Artist>(`/artists/${id.value}`)
const { data: tracksData } = await useApiFetch<Track[]>(
	`/artists/${id.value}/tracks`,
)

const { playAlbum, playAlbumAtIndex } = usePlayer()
</script>

<template>
	<section class="info" v-if="artistData">
		<NuxtImg
			:src="GET_FILE(artistData.file)"
			width="300"
			height="300"
			placeholder
		/>

		<div class="details">
			<h1>{{ artistData.name }}</h1>

			<div class="buttons">
				<Button
					icon-name="lucide:play"
					@click="() => playAlbum(tracksData)"
					>Play</Button
				>
			</div>
		</div>
	</section>

	<section class="tracks-container">
		<NuxtLink :to="`/artist/${id}/tracks`">
			Tracks
			<Icon name="lucide:chevron-right" />
		</NuxtLink>

		<Slider>
			<div class="tracks">
				<template v-for="j in 25">
					<TrackImageRow
						v-for="(track, i) in tracksData"
						:key="track._id"
						:track="track"
						:index="i"
						@play-album-at-index="
							() => playAlbumAtIndex(tracksData, i)
						"
					/>
				</template>
			</div>
		</Slider>
	</section>

	<section class="albums"></section>
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;
@use "@/styles/util";

.info {
	display: flex;
	gap: 1rem;
	margin-bottom: 2rem;

	img {
		border-radius: $border-radius-standard;
	}

	.details {
		padding-top: 3.5rem;

		display: flex;
		flex-direction: column;

		& h1 {
			@include util.fontSize(32px);
			font-weight: 700;
			line-height: 2.4rem;
		}

		.buttons {
			margin-top: auto;
		}
	}
}

.tracks-container {
	a {
		display: inline-flex;
		align-items: center;

		@include util.fontSize(24px);
		font-weight: 600;
	}

	.tracks {
		display: grid;
		grid-template-rows: repeat(3, 1fr);
		grid-template-columns: repeat(auto-fit, minmax(300px, 350px));
		grid-auto-flow: column;
	}
}
</style>
