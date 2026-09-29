<script setup lang="ts">
import type { Field } from "~/components/Admin/ModalForm.vue"
import type { Row } from "~/ui/Table.vue"

const { data, refresh } = useApiFetch<Genre[]>("/all/genres")
const toast = useToast()

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

const modalFields: Field[] = [{ key: "name", label: "Name" }]

const showModal = ref<boolean>(false)
const item = ref<Genre | undefined>(undefined)

const save = async (value: any) => {
	if (value._id) {
		try {
			await cfetch("/admin/genre", {
				method: "PATCH",
				data: value,
				params: { id: value._id },
				forceFormData: true,
			})

			toast.show("Genre updated successfully", "success")
		} catch {
			toast.show("Failed to update genre", "error")

			return false
		}
	} else {
		try {
			await cfetch("/admin/genre", {
				method: "POST",
				data: value,
			})

			toast.show("Genre added successfully", "success")
		} catch {
			toast.show("Failed to add genre", "error")

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

	item.value = curItem

	showModal.value = true
}
useHead({ title: "Admin - Genres" })
</script>

<template>
	<h1 class="title">Manage genres</h1>

	<Table :rows="tableRows" :data="data" class="table">
		<template #action="{ item, index }">
			<div class="action">
				<Button @click="show(item._id)">Edit</Button>
				<Button @click="">Delete</Button>
			</div>
		</template>
	</Table>
	<Button @click="show()">Add a new genre</Button>

	<AdminModalForm
		v-model:open="showModal"
		@save="save"
		:fields="modalFields"
		:item="item"
		:title="item ? 'Edit genre' : 'Add new genre'"
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
