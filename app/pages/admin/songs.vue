<script setup lang="ts">
import type { Field } from "~/components/Admin/ModalForm.vue"
import type { Row } from "~/ui/Table.vue"

const { data, refresh } = useApiFetch<Track[]>("/all/tracks")
const toast = useToast()

const tableRows: Row[] = [
	{
		name: "_id",
		displayName: "ID",
	},
	{
		name: "fileDir",
		displayName: "Audio File",
		type: "audio",
	},
	{
		name: "name",
		displayName: "Name",
	},
	{
		name: "album.name",
		displayName: "Album",
	},
	{
		name: "action",
	},
]

import { type Option } from "~/ui/SearchSelect.vue"

const { data: artistData } = useApiFetch<Artist[]>("/all/artists")
const artistFetchOptions = async (q?: string): Promise<Option[]> => {
	return (artistData.value ?? []).map<Option>((g) => ({
		label: g.name,
		value: g._id,
	}))
}

const { data: albumData } = useApiFetch<Album[]>("/all/albums")
const albumFetchOptions = async (q?: string): Promise<Option[]> => {
	return (albumData.value ?? []).map<Option>((g) => ({
		label: g.name,
		value: g._id,
	}))
}

const { data: genreData } = useApiFetch<Genre[]>("/all/genres")
const genreFetchOptions = async (): Promise<Option[]> => {
	return (genreData.value ?? []).map<Option>((genre) => ({
		label: genre.name,
		value: genre._id,
	}))
}

const modalFields: Field[] = [
	{ key: "name", label: "Name" },
	{ key: "file", label: "Audio file", type: "file" },
	{
		key: "artists",
		label: "Artists",
		type: "search-select-array",
		fetchOptions: artistFetchOptions,
	},
	{
		key: "createSingle",
		label: "Create a single album automatically",
		type: "checkbox",
		visibleWhen: (value) => !value._id,
	},
	{
		key: "album",
		label: "Album",
		type: "search-select",
		fetchOptions: albumFetchOptions,
		visibleWhen: (value) => !value.createSingle,
	},
	{
		key: "cover",
		label: "Single cover",
		type: "file",
		visibleWhen: (value) => !value._id && value.createSingle,
	},
	{
		key: "genre",
		label: "Genre",
		type: "search-select",
		fetchOptions: genreFetchOptions,
		visibleWhen: (value) => !value._id && value.createSingle,
	},
	{ key: "lyrics.text", label: "Lyrics", type: "textarea", rows: 6 },
	{ key: "lyrics.synced", label: "Synced lyrics", type: "checkbox" },
]

const serializeLyrics = (lyrics: Track["lyrics"] | undefined) => {
	if (!lyrics?.text?.trim()) return JSON.stringify(null)
	return JSON.stringify(lyrics)
}

const getArtistIds = (artists: Array<string | Option> = []) =>
	artists.map((artist) => (typeof artist === "string" ? artist : artist.value))

const getOptionId = (option: string | Option) =>
	typeof option === "string" ? option : option.value

const showModal = ref<boolean>(false)
const item = ref<Track | undefined>(undefined)
const addingSong = ref(false)

const save = async (value: any) => {
	if (value._id) {
		try {
			await cfetch("/admin/track", {
				method: "PATCH",
				data: {
					...value,
					lyrics: serializeLyrics(value.lyrics),
				},
				params: { id: value._id },
				forceFormData: true,
			})

			toast.show("Song updated successfully", "success")
		} catch {
			toast.show("Failed to update song", "error")

			return false
		}
	} else {
		if (!value.name || !value.file || !value.artists?.length) {
			toast.show(
				"Name, audio file, and at least one artist are required",
				"error",
			)
			return false
		}

		if (value.createSingle && (!value.cover || !value.genre)) {
			toast.show(
				"A cover image and genre are required for a single",
				"error",
			)
			return false
		}

		if (!value.createSingle && !value.album) {
			toast.show("Choose an album or create a single album", "error")
			return false
		}

		addingSong.value = true
		await nextTick()
		try {
			if (value.createSingle) {
				const albumResponse = await cfetch<{ _id: string }>("/admin/album", {
					method: "POST",
					data: {
						name: `${value.name} - Single`,
						artists: getArtistIds(value.artists),
						genre: getOptionId(value.genre),
						file: value.cover,
					},
				})
				value.album = albumResponse._id
			}

			await cfetch("/admin/track", {
				method: "POST",
				data: {
					...value,
					album: value.album?.value ?? value.album,
					artists: getArtistIds(value.artists),
					lyrics: serializeLyrics(value.lyrics),
				},
			})

			toast.show("Song added successfully", "success")
		} catch {
			toast.show("Failed to add song", "error")

			return false
		} finally {
			addingSong.value = false
		}
	}

	refresh()

	return true
}

/**
 * @param id Set it to a value to make it edit instead of creating a new one
 */
const show = (id?: string) => {
	if (!id) {
		item.value = undefined
		showModal.value = true

		return
	}

	const curItem: any = (data.value ?? []).filter((i) => i._id == id)[0]

	if (!curItem) return

	const transformed = { ...curItem }

	if (transformed.album)
		transformed.album = {
			value: curItem.album._id,
			label: curItem.album.name,
		}

	if (transformed.artists)
		transformed.artists = transformed.artists.map((a: Artist) => ({
			value: a._id,
			label: a.name,
		}))

	item.value = transformed

	showModal.value = true
}
useHead({ title: "Admin - Songs" })
</script>

<template>
	<h1 class="title">Manage songs</h1>

	<Table :rows="tableRows" :data="data" search pagination class="table">
		<template #action="{ item, index }">
			<div class="action">
				<Button @click="show(item._id)">Edit</Button>
				<Button @click="">Delete</Button>
			</div>
		</template>
	</Table>
	<Button @click="show()">Add a new song</Button>

	<AdminModalForm
		v-model:open="showModal"
		@save="save"
		:fields="modalFields"
		:item="item"
		:title="item ? 'Edit song' : 'Add new song'"
		:loading="addingSong"
		:loading-text="'Adding song…'"
	/>
</template>

<style lang="scss" scoped>
@use "@/styles/util" as *;

.title {
	@include fontSize(24px);
	margin-bottom: 0.4rem;
}

.action {
	display: flex;
	gap: 0.2rem;
}

.table {
	margin-bottom: 0.4rem;
}
</style>
