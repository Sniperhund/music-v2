<script setup lang="ts">
import type { Field } from "~/components/Admin/ModalForm.vue"
import type { Row } from "~/ui/Table.vue"

const { data, refresh } = useApiFetch<Album[]>("/all/albums")
const toast = useToast()

const tableRows: Row[] = [
	{
		name: "_id",
		displayName: "ID",
	},
	{
		name: "file",
		displayName: "Cover",
		type: "image",
		prefix: `${BACKEND_SERVE}/static/`,
	},
	{
		name: "name",
		displayName: "Name",
	},
	{
		name: "genre.name",
		displayName: "Genre",
	},
	{
		name: "action",
	},
]

import { type Option } from "~/ui/SearchSelect.vue"

const { data: artistData } = useApiFetch<Genre[]>("/all/artists")
const artistFetchOptions = async (q?: string): Promise<Option[]> => {
	return artistData.value.map<Option>((g) => ({
		label: g.name,
		value: g._id,
	}))
}

const { data: genreData } = useApiFetch<Genre[]>("/all/genres")
const genreFetchOptions = async (q?: string): Promise<Option[]> => {
	return genreData.value.map<Option>((g) => ({
		label: g.name,
		value: g._id,
	}))
}

const modalFields: Field[] = [
	{ key: "name", label: "Name" },
	{ key: "file", label: "Cover file", type: "file" },
	{
		key: "artists",
		label: "Artists",
		type: "search-select-array",
		fetchOptions: artistFetchOptions,
	},
	{
		key: "genre",
		label: "Genre",
		type: "search-select",
		fetchOptions: genreFetchOptions,
	},
]

const showModal = ref<boolean>(false)
const item = ref<Track | undefined>(undefined)

const save = async (value: any) => {
	if (value._id) {
		try {
			await cfetch("/admin/album", {
				method: "PATCH",
				data: value,
				params: { id: value._id },
				forceFormData: true,
			})

			toast.show("Album updated successfully", "success")
		} catch {
			toast.show("Failed to update album", "error")

			return false
		}
	} else {
		try {
			await cfetch("/admin/album", {
				method: "POST",
				data: value,
			})

			toast.show("Album added successfully", "success")
		} catch {
			toast.show("Failed to add album", "error")

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

	console.log(transformed)

	if (transformed.genre)
		transformed.genre = {
			value: curItem.genre._id,
			label: curItem.genre.name,
		}

	if (transformed.artists)
		transformed.artists = transformed.artists.map((a: Artist) => ({
			value: a._id,
			label: a.name,
		}))

	item.value = transformed

	showModal.value = true
}
</script>

<template>
	<h1 class="title">Manage albums</h1>

	<Table :rows="tableRows" :data="data" class="table">
		<template #action="{ item, index }">
			<div class="action">
				<Button @click="show(item._id)">Edit</Button>
				<Button @click="">Delete</Button>
			</div>
		</template>
	</Table>
	<Button @click="show()">Add a new album</Button>

	<AdminModalForm
		v-model:open="showModal"
		@save="save"
		:fields="modalFields"
		:item="item"
		:title="item ? 'Edit album' : 'Add new album'"
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
