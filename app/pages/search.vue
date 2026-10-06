<script setup lang="ts">
import type { Track } from "@/utils/types"

interface SearchResult {
	type: "track" | "album" | "artist"
	_id: string
	name: string
	file?: string
	cover?: string
	album?: { _id?: string; name?: string; file?: string; cover?: string }
	artists?: Artist[]
}

const route = useRoute()
const router = useRouter()
const { currentSong, playAlbum } = usePlayer()
const query = computed(() => {
	const value = route.query.q
	const firstValue = Array.isArray(value) ? value[0] : value
	return (firstValue ?? "").trim()
})
const searchInput = ref(query.value)
const debouncedQuery = ref(query.value)
const querySettled = computed(() => query.value === debouncedQuery.value)
let debounceTimeout: ReturnType<typeof setTimeout> | undefined

watch(query, (value) => {
	searchInput.value = value
	clearTimeout(debounceTimeout)
	debounceTimeout = setTimeout(() => {
		debouncedQuery.value = value
		debounceTimeout = undefined
	}, 300)
})

const updateSearchRoute = (value: string) => {
	const trimmed = value.trim()
	if (trimmed)
		router.replace(`/search?q=${encodeURIComponent(trimmed)}`)
	else router.replace("/search")
}

onBeforeUnmount(() => clearTimeout(debounceTimeout))

const { data, status, error } = await useApiFetch<SearchResult[]>("/search", {
	query: { q: debouncedQuery, limit: 9 },
	watch: [debouncedQuery],
})

const results = computed<SearchResult[]>(() => {
	const payload: any = data.value
	if (Array.isArray(payload)) return payload
	if (Array.isArray(payload?.results)) return payload.results
	if (Array.isArray(payload?.data)) return payload.data
	if (!payload || typeof payload !== "object") return []

	return (["tracks", "albums", "artists"] as const).flatMap((kind) =>
		Array.isArray(payload[kind])
			? payload[kind].map((result: SearchResult) => ({
					...result,
					type: kind.slice(0, -1) as SearchResult["type"],
				}))
			: [],
	)
})

const recentTracks = ref<Track[]>([])
const recentStorageKey = "music-v2-recently-played"

onMounted(() => {
	try {
		recentTracks.value = JSON.parse(
			window.localStorage.getItem(recentStorageKey) ?? "[]",
		) as Track[]
	} catch {
		recentTracks.value = []
	}
})

watch(currentSong, (track) => {
	if (!track || !import.meta.client) return
	const updated = [
		track,
		...recentTracks.value.filter((item) => item._id !== track._id),
	].slice(0, 9)
	recentTracks.value = updated
	window.localStorage.setItem(recentStorageKey, JSON.stringify(updated))
})

const playResult = (result: SearchResult | Track) => {
	if ("album" in result && result.album) playAlbum([result as Track])
}
useHead({ title: computed(() => query.value ? `Search: ${query.value}` : "Search") })
</script>

<template>
	<main class="search-page">
		<h1>Search</h1>
		<Input
			class="mobile-search"
			v-model:value="searchInput"
			full
			type="search"
			name="mobile-search-query"
			label="Search the library"
			placeholder="Songs, albums, artists"
			icon-name="lucide:search"
			@input="updateSearchRoute"
		/>

		<p
			v-if="query && (!querySettled || status === 'pending')"
			class="message"
			role="status"
		>
			Searching…
		</p>
		<p v-else-if="query && querySettled && error" class="message" role="alert">
			Search could not be loaded. Please try again.
		</p>
		<p
			v-else-if="query && querySettled && status === 'success' && results.length === 0"
			class="message"
		>
			No results for “{{ query }}”.
		</p>

		<template v-if="!query || (status === 'success' && results.length === 0)">
			<h2>Recently Played</h2>
			<p v-if="recentTracks.length === 0" class="message">
				Your recently played tracks will appear here.
			</p>
		</template>

		<section
		v-if="query && querySettled && status === 'success' && results.length"
			class="results"
			aria-label="Search results"
		>
			<template
				v-for="(result, index) in results"
				:key="`${result.type}-${result._id}`"
			>
				<SearchRow
					:result="result"
					:index="index"
					@play="playResult(result)"
				/>
			</template>
		</section>

		<section
		v-else-if="
			recentTracks.length &&
			(!query || (querySettled && status === 'success'))
		"
			class="results"
			aria-label="Recently played tracks"
		>
			<TrackRow
				v-for="(track, index) in recentTracks"
				:key="track._id"
				:track="track"
				:index="index"
				show-image
				touch-friendly
				@play-album-at-index="playResult(track)"
			/>
		</section>
	</main>
</template>

<style lang="scss" scoped>
@use "@/styles/util" as *;

.search-page {
	padding-bottom: 2rem;

	h1 {
		@include fontSize(32px);
		font-weight: 700;
		margin-bottom: 1rem;
	}

	h2 {
		@include fontSize(20px);
		font-weight: 600;
		margin: 1.5rem 0 0.8rem;
	}
}

.mobile-search {
	display: none;
}

.results {
	display: flex;
	flex-direction: column;
	gap: 0.4rem;
}

.message {
	@include fontSize(14px);
	opacity: 0.65;
	margin: 0.75rem 0;
}

@media (max-width: 767px) {
	.mobile-search {
		display: block;
		margin-bottom: 1rem;
	}

	.results :deep(.track.image) {
		grid-template-columns: 40px minmax(0, 1fr) auto auto;
		gap: 0.5rem;
		padding-inline: 0.5rem;
	}

}
</style>
