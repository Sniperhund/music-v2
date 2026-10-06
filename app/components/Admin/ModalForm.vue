<script setup lang="ts">
import { type Option } from "~/ui/SearchSelect.vue"

interface BaseField<T> {
	key: keyof T
	label?: string
	visibleWhen?: (value: any) => boolean
}

interface TextField<T> extends BaseField<T> {
	type?: "text"
}

interface TextAreaField<T> extends BaseField<T> {
	type?: "textarea"
	rows: number
}

interface FileField<T> extends BaseField<T> {
	type: "file"
}

interface SearchSelectField<T> extends BaseField<T> {
	type: "search-select"
	fetchOptions: (q?: string) => Promise<Option[]>
}

interface SearchSelectArrayField<T> extends BaseField<T> {
	type: "search-select-array"
	fetchOptions: (q?: string) => Promise<Option[]>
}

interface CheckboxField<T> extends BaseField<T> {
	type?: "checkbox"
}

export type Field<T = any> =
	| TextField<T>
	| TextAreaField<T>
	| FileField<T>
	| SearchSelectField<T>
	| SearchSelectArrayField<T>
	| CheckboxField<T>

interface ModalFormProps<T> {
	item?: T
	fields: Field<T>[]
	title?: string
	onSave: (value: any) => Promise<boolean>
	loading?: boolean
	loadingText?: string
}

const props = defineProps<ModalFormProps<any>>()
const open = defineModel("open", { required: true })

let localItem = reactive<any>({})

const getNestedValue = (obj: any, path: string) =>
	path.split(".").reduce((acc, key) => acc?.[key], obj)

const setNestedValue = (obj: any, path: string, value: any) => {
	const keys = path.split(".")
	keys.reduce((acc, key, i) => {
		if (i === keys.length - 1) acc[key] = value
		else acc[key] ??= {}
		return acc[key]
	}, obj)
}

const expandDotKeys = (flat: Record<string, any>) => {
	const result: any = {}
	for (const [key, value] of Object.entries(flat)) {
		setNestedValue(result, key, toRaw(value))
	}
	return result
}

const save = async () => {
	const expanded = expandDotKeys(localItem)

	Object.keys(expanded).forEach((k) => {
		if (expanded[k] == undefined || expanded[k] == null) delete expanded[k]
	})

	if (await props.onSave(expanded)) open.value = false
}

watch(
	() => props.item,
	(item) => {
		Object.keys(localItem).forEach((k) => delete localItem[k])

		if (item)
			for (const [key, value] of Object.entries(item))
				localItem[key] = value

		for (const field of props.fields) {
			const key = field.key as string
			if (field.type === "file") {
				localItem[key] = null
			} else if (field.type === "checkbox") {
				localItem[key] = item
					? (getNestedValue(item, key) ?? false)
					: false
			} else {
				localItem[key] = item ? getNestedValue(item, key) : undefined
			}
		}
	},
	{ immediate: true },
)
</script>

<template>
	<Modal v-model:open="open" width="40%">
		<p v-if="props.title" class="title">{{ props.title }}</p>

		<form class="form" @submit.prevent="save">
			<template
				v-for="field in props.fields.filter(
					(field) =>
						!field.visibleWhen || field.visibleWhen(localItem),
				)"
			>
				<SearchSelect
					v-if="
						field.type == 'search-select' ||
						field.type == 'search-select-array'
					"
					v-model:value="localItem[field.key]"
					:fetch-options="field.fetchOptions"
					:label="field.label || String(field.key)"
					:predefined="props.item?.[field.key]"
					:multiple="field.type == 'search-select-array'"
				/>
				<Checkbox
					v-else-if="field.type == 'checkbox'"
					:label="field.label || String(field.key)"
					:model-value="localItem[field.key]"
					@change="(v) => (localItem[field.key] = v)"
				/>
				<Input
					v-else
					:type="field.type"
					:key="field.key"
					:label="field.label || String(field.key)"
					v-model:value="localItem[field.key]"
					:textarea="field.type == 'textarea'"
					:rows="field.type == 'textarea' ? field.rows : 0"
					full
				/>
			</template>

			<Button type="submit" full center-text :disabled="props.loading">
				<span v-if="props.loading" class="spinner" aria-hidden="true" />
				{{ props.loading ? props.loadingText || "Saving…" : "Save" }}
			</Button>
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

.spinner {
	width: 1rem;
	height: 1rem;
	border: 2px solid currentColor;
	border-right-color: transparent;
	border-radius: 50%;
	animation: spin 0.7s linear infinite;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}
</style>
