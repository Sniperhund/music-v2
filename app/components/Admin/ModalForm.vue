<script setup lang="ts">
import { type Option } from "~/ui/SearchSelect.vue"

type InputType = "text" | "file" | "search-select"

interface BaseField<T> {
	key: keyof T
	label?: string
}

interface TextField<T> extends BaseField<T> {
	type?: "text"
}

interface FileField<T> extends BaseField<T> {
	type: "file"
}

interface SearchSelectField<T> extends BaseField<T> {
	type: "search-select"
	fetchOptions: (q: string) => Promise<Option[]>
}

export type Field<T = any> = TextField<T> | FileField<T> | SearchSelectField<T>

interface ModalFormProps<T> {
	item?: T
	fields: Field<T>[]
	title?: string
	onSave: (value: any) => Promise<boolean>
}

const props = defineProps<ModalFormProps<any>>()
const open = defineModel("open", { required: true })

let localItem = reactive<any>({})

watch(
	() => props.item,
	(item) => {
		Object.keys(localItem).forEach((k) => delete localItem[k])

		if (!item) return

		for (const [key, value] of Object.entries(item)) {
			localItem[key] = value
		}

		for (const field of props.fields) {
			if (field.type == "file") localItem[field.key as string] = null
		}
	},
	{ immediate: true },
)

const save = async () => {
	if (await props.onSave(localItem)) open.value = false
}
</script>

<template>
	<Modal v-model:open="open" width="40%">
		<p v-if="props.title" class="title">{{ props.title }}</p>

		<form class="form" @submit.prevent="save">
			<template v-for="field in props.fields">
				<SearchSelect
					v-if="field.type == 'search-select'"
					v-model:value="localItem[field.key]"
					:fetch-options="field.fetchOptions"
					:label="field.label || field.key"
					:predefined="props.item?.[field.key]"
				/>
				<Input
					v-else
					:type="field.type"
					:key="field.key"
					:label="field.label || field.key"
					v-model:value="localItem[field.key]"
					full
				/>
			</template>

			<Button type="submit" full center-text>Save</Button>
		</form>
	</Modal>
</template>

<style lang="scss" scoped>
@use "@/styles/util" as *;

.title {
	@include fontSize(20px);
	font-weight: 600;
	margin-bottom: 0.5rem;
}

.form {
	display: flex;
	flex-direction: column;
	gap: 0.8rem;
}
</style>
