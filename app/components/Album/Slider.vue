<script setup lang="ts">
import { GET_FILE } from "@/utils/file"

const cacheKey = "album-slider-data"
const data = ref<{ genre: Genre; albums: Album[] }[]>([])

onMounted(async () => {
	const cached = sessionStorage.getItem(cacheKey)
	if (cached) {
		try {
			data.value = JSON.parse(cached)
			return
		} catch {
			sessionStorage.removeItem(cacheKey)
		}
	}

	const genres = await cfetch<Genre[]>("/genres/random")
	const results = await Promise.allSettled(
		(genres ?? []).map(async (genre) => ({
			genre,
			albums: await cfetch<Album[]>(`/genres/albums/${genre._id}`),
		})),
	)

	data.value = results
		.filter(
			(
				result,
			): result is PromiseFulfilledResult<{
					genre: Genre
					albums: Album[]
				}> => result.status === "fulfilled",
		)
		.map((result) => result.value)

	sessionStorage.setItem(cacheKey, JSON.stringify(data.value))
})
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
					carousel
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
