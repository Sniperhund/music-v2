<script setup lang="ts">
const { data: genresData } = await useApiFetch<Genre[]>("/genres/random")

const data = await Promise.allSettled(
	(genresData.value ?? []).map(async (genre: Genre) => {
		const albums = await cfetch<Album[]>(`/genres/albums/${genre._id}`)

		return {
			genre,
			albums,
		}
	}),
).then((results) =>
	results
		.filter(
			(
				r,
			): r is PromiseFulfilledResult<{
				genre: any
				albums: any[]
			}> => r.status === "fulfilled",
		)
		.map((r) => r.value),
)
</script>

<template>
	<section class="slider">
		<template v-for="item in data" :key="item.genre._id">
			<Slider v-if="item.albums.length" :title="item.genre.name">
				<AlbumCard
					v-for="album in item.albums"
					:key="album._id"
					:name="album.name"
					:file="GET_FILE(album.file)"
					:artists="album.artists"
					:_id="album._id"
				/>
			</Slider>
		</template>
	</section>
</template>

<style lang="scss" scoped>
.slider {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}
</style>
