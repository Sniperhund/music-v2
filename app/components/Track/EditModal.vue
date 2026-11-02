<script setup lang="ts">
import type { Field } from "~/components/Admin/ModalForm.vue"
import type { Option } from "~/ui/SearchSelect.vue"
import { clearRequestCache } from "@/utils/requestCache"

const props = defineProps<{ track?: Track }>()
const open = defineModel<boolean>("open", { required: true })
const toast = useToast()
const { data: artistsData } = useApiFetch<Artist[]>("/all/artists")
const { data: albumsData } = useApiFetch<Album[]>("/all/albums")

const artistOptions = async (): Promise<Option[]> =>
	(artistsData.value ?? []).map((artist) => ({ label: artist.name, value: artist._id }))
const albumOptions = async (): Promise<Option[]> =>
	(albumsData.value ?? []).map((album) => ({ label: album.name, value: album._id }))

const fields: Field[] = [
	{ key: "name", label: "Track name" },
	{ key: "file", label: "Audio file", type: "file" },
	{ key: "artists", label: "Artists", type: "search-select-array", fetchOptions: artistOptions },
	{ key: "album", label: "Album", type: "search-select", fetchOptions: albumOptions },
	{ key: "lyrics.text", label: "Lyrics", type: "textarea", rows: 8 },
	{ key: "lyrics.synced", label: "Synced lyrics", type: "checkbox" },
]

const item = computed(() => {
	const track = props.track
	if (!track) return undefined
	return {
		...track,
		album: { ...track.album, value: track.album._id, label: track.album.name },
		artists: track.artists.map((artist) => ({ ...artist, value: artist._id, label: artist.name })),
	}
})

const serializeLyrics = (lyrics: Track["lyrics"] | undefined) => {
	if (!lyrics?.text?.trim()) return JSON.stringify(null)
	return JSON.stringify(lyrics)
}

const save = async (value: any) => {
	try {
		await cfetch("/admin/track", {
			method: "PATCH",
			data: { ...value, lyrics: serializeLyrics(value.lyrics) },
			params: { id: value._id },
			forceFormData: true,
		})
		clearRequestCache()
		await refreshNuxtData()
		toast.show("Track updated successfully", "success")
		return true
	} catch {
		toast.show("Failed to update track", "error")
		return false
	}
}
</script>

<template>
	<AdminModalForm
		v-model:open="open"
		:fields="fields"
		:item="item"
		title="Edit track"
		@save="save"
	/>
</template>
