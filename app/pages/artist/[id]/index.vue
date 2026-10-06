<script setup lang="ts">
import { GET_FILE } from "@/utils/file"

const route = useRoute()
const id = computed(() => route.params.id)

const { data: artistData } = await useApiFetch<Album>(`/artists/${id.value}`)

const { data: albumsData } = await useApiFetch<Album[]>(
	`/artists/${id.value}/albums`,
)

const { data: tracksData } = await useApiFetch<Track[]>(
	`/artists/${id.value}/tracks`,
)
const tracks = computed(() => tracksData.value ?? [])

const chunkedTracks = computed(() => {
	const SIZE = 3
	const chunks = []

	for (let i = 0; i < tracks.value.length; i += SIZE) {
		chunks.push(tracks.value.slice(i, i + SIZE))
	}

	return chunks
})

const slider = useTemplateRef("slider")

const scrollWidth = () => {
	if (!slider.value) return 0

	const el = Array.isArray(slider.value) ? slider.value[0] : slider.value

	if (!el) return 0

	return el.offsetWidth
}

const { playAlbum, playShuffledAlbum, playAlbumAtIndex } = usePlayer()
useHead({ title: computed(() => artistData.value ? `${artistData.value.name} - Artist` : "Artist") })
</script>

<template>
	<section class="info" v-if="artistData">
		<div class="artist-art">
			<NuxtImg
				class="artist-image"
				:src="GET_FILE(artistData.file)"
				width="300"
				height="300"
				placeholder
			/>
		</div>

		<div class="details">
			<h1>{{ artistData.name }}</h1>

			<div class="buttons">
				<Button
					icon-name="lucide:play"
					:aria-label="`Play ${artistData.name}`"
					@click="() => playAlbum(tracks)"
				>
					<span class="button-label">Play</span>
				</Button>
				<Button
					icon-name="lucide:shuffle"
					:aria-label="`Shuffle ${artistData.name}`"
					@click="() => playShuffledAlbum(tracks)"
				>
					<span class="button-label">Shuffle</span>
				</Button>
			</div>
		</div>
	</section>

	<Slider slider-class="slider" :scroll-width="scrollWidth" title="Tracks">
		<section
			class="tracks"
			:class="[`tracks-${chunkedTracks[0]?.length ?? 1}`]"
			v-for="(chunk, pI) in chunkedTracks"
			:key="`chunk-${pI}`"
			ref="slider"
		>
			<TrackRow
				v-for="(track, i) in chunk"
				:key="`track-${track._id}`"
				:track="track"
				:index="i + pI * 3"
				@play-album-at-index="
					() => playAlbumAtIndex(tracks, i + pI * 3)
				"
			/>
		</section>
	</Slider>

	<Slider title="Albums">
		<AlbumCard
			v-for="album in albumsData"
			:key="album._id"
			:name="album.name"
			:file="GET_FILE(album.file)"
			:artists="album.artists"
			:_id="album._id"
			carousel
		/>
	</Slider>
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;
@use "@/styles/util";

.info {
	display: flex;
	gap: 1rem;
	margin-bottom: 2rem;

	& img {
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

$gap: 12px;

:deep(.slider) {
	gap: $gap;
	margin-bottom: 1rem;
}

.tracks {
	display: grid;
	gap: 0.4rem;

	flex: 0 0 calc((100% - 3 * $gap) / 4);

	@for $i from 1 through 3 {
		&-#{$i} {
			grid-template-rows: repeat(#{$i}, 1fr);
		}
	}
}

@media (max-width: 767px) {
	.info {
		flex-direction: column;
		align-items: stretch;
		gap: 0.25rem;
	}

	.artist-art {
		padding: 0.5rem;
	}

	.artist-image {
		width: 100%;
		height: auto;
	}

	.info .details {
		align-items: center;
		padding-top: 0;
		text-align: center;

		h1 {
			margin-top: 0;
			margin-bottom: 0;
		}

		.buttons {
			margin-top: 0.375rem;
			gap: 0.75rem;
		}
	}

	.details .buttons :deep(.button) {
		padding: 0.75rem;
		border-radius: 50%;
	}

	.details .buttons :deep(.icon-wrapper) {
		font-size: 1.5rem;
	}

	.details .buttons :deep(.button-label) {
		display: none;
	}

	.tracks {
		flex-basis: 100%;
		min-width: 0;
	}
}
</style>
