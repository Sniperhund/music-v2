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
		prefix: `${BACKEND_SERVE}`,
		suffix: "/high.m4a",
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
	return artistData.value.map<Option>((g) => ({
		label: g.name,
		value: g._id,
	}))
}

const { data: albumData } = useApiFetch<Album[]>("/all/albums")
const albumFetchOptions = async (q?: string): Promise<Option[]> => {
	return albumData.value.map<Option>((g) => ({
		label: g.name,
		value: g._id,
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
		key: "album",
		label: "Album",
		type: "search-select",
		fetchOptions: albumFetchOptions,
	},
]

const showModal = ref<boolean>(false)
const item = ref<Track | undefined>(undefined)

const save = async (value: any) => {
	if (value._id) {
		try {
			await cfetch("/admin/track", {
				method: "PATCH",
				data: value,
				params: { id: value._id },
				forceFormData: true,
			})

			toast.show("Song updated successfully", "success")
		} catch {
			toast.show("Failed to update song", "error")

			return false
		}
	} else {
		try {
			await cfetch("/admin/track", {
				method: "POST",
				data: value,
			})

			toast.show("Song added successfully", "success")
		} catch {
			toast.show("Failed to add song", "error")

			return false
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

	const curItem: any = data.value.filter((i) => i._id == id)[0]

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

watch(data, () => console.log(data))
</script>

<template>
	<h1 class="title">Manage songs</h1>

	<Table :rows="tableRows" :data="data" class="table">
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
