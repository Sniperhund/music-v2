<script setup lang="ts">
export interface Option {
	label: string
	value: any
}

interface SearchSelectProps {
	label?: string
	fetchOptions: (q?: string) => Promise<Option[]>
	predefined?: Option
	multiple?: boolean
}

const props = defineProps<SearchSelectProps>()
const value = defineModel<string | string[] | Option | Option[]>("value")
const selectedOptions = ref<Option[]>([])

const query = ref<string>("")
const options = ref<Option[]>([])
const show = ref<boolean>(false)

const isMultiple = computed(() => !!props.multiple)

watchEffect(() => {
	if (!props.predefined) return

	if (isMultiple.value) {
		const items = Array.isArray(props.predefined)
			? props.predefined
			: [props.predefined]

		value.value = items.map((i) => i.value)

		if (Array.isArray(items)) {
			query.value = items.map((o) => o.label).join(", ")
			selectedOptions.value = items
		}
	} else {
		const item = Array.isArray(props.predefined)
			? props.predefined[0]
			: props.predefined

		query.value = item.label
		value.value = item.value
	}

	nextTick(() => (options.value = []))
})

watch(query, async (q) => {
	options.value = await (await props.fetchOptions(q)).slice(0, 10)
})

const isSelected = (opt: Option) => {
	if (isMultiple.value && Array.isArray(value.value)) {
		return value.value.includes(opt.value)
	}
	return false
}

const select = (item: Option) => {
	if (isMultiple.value) {
		const current = [...selectedOptions.value]
		const idx = current.findIndex((o) => o.value === item.value)

		if (idx === -1) current.push(item)
		else current.splice(idx, 1)

		selectedOptions.value = current
		value.value = current.map((o) => o.value)
	} else {
		value.value = item.value
		query.value = item.label
		show.value = false
	}
}

const onFocus = async () => {
	if (isMultiple.value) query.value = ""
	show.value = true
	options.value = await (await props.fetchOptions()).slice(0, 10)
}

const onFocusOut = () => {
	show.value = false

	if (Array.isArray(selectedOptions.value) && isMultiple.value) {
		query.value = selectedOptions.value.map((o) => o.label).join(", ")
	}
}
</script>

<template>
	<div class="search-select" tabindex="0" @focusout="onFocusOut">
		<Input
			v-model:value="query"
			@focus="onFocus"
			@focusout="onFocusOut"
			:label="props.label"
			type="text"
			full
		/>

		<ul v-if="options.length && show" @mousedown.prevent>
			<li
				v-for="opt in options"
				:key="opt.value"
				@mousedown.prevent="select(opt)"
			>
				<span>{{ opt.label }}</span>
				<span v-if="isSelected(opt)" class="li-chip">✓</span>
			</li>
		</ul>
	</div>
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;

.search-select {
	position: relative;

	& ul,
	& li {
		border-radius: $border-radius-standard;
	}

	& ul {
		position: absolute;
		top: calc(100% + 2px);
		z-index: 10;

		width: 100%;
		padding: 0.25rem;

		display: flex;
		flex-direction: column;
		background-color: $color-secondary-background;
		gap: 0.2rem;
	}

	& li {
		display: flex;
		justify-content: space-between;
		align-items: center;

		padding: 0.35rem 0.85rem;
		transition: background-color 0.1s ease;

		&:hover {
			background-color: $color-button-hover;
		}
	}

	.li-chip {
		font-size: 0.7rem;
		padding: 0.15rem 0.45rem;
		border-radius: 999px;
		background: $color-button-hover;
	}
}
</style>
