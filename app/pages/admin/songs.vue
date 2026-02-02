<script setup lang="ts">
import type { Field } from "~/components/Admin/ModalForm.vue"
import type { Row } from "~/ui/Table.vue"

const { data, status } = useApiFetch<Track[]>("/all/tracks")

const tableRows: Row[] = [
	{
		name: "_id",
		displayName: "ID",
	},
	{
		name: "name",
		displayName: "Name",
	},
	{
		name: "action",
	},
]

import { type Option } from "~/ui/SearchSelect.vue"

const options: Option[] = [
	{ label: "A", value: "a" },
	{ label: "B", value: "b" },
]

const fetchOptions = async (q: string): Promise<Option[]> => {
	return options
}

const modalFields: Field[] = [
	{ key: "name", label: "Name" },
	{ key: "album", label: "Album", type: "search-select", fetchOptions },
	{ key: "file", label: "Audio file", type: "file" },
]

const showModal = ref<boolean>(false)
const item = ref<Track | undefined>(undefined)

const save = (value: any) => {
	console.log(value)

	return false
}

/**
 * @param id Set it to a value to make it edit instead of creating a new one
 */
const show = (id?: string) => {
	if (!id) {
		item.value = undefined
		showModal.value = true
	}

	const curItem: any = data.value.filter((i) => i._id == id)[0]

	if (!curItem) return

	const transformed = { ...curItem }

	if (transformed.album)
		transformed.album = {
			value: curItem.album._id,
			label: curItem.album.name,
		}

	item.value = transformed

	showModal.value = true
}
</script>

<template>
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
		title="Add new song"
	/>
</template>

<style lang="scss" scoped>
.action {
	display: flex;
	gap: 0.2rem;
}

.table {
	margin-bottom: 0.4rem;
}
</style>
