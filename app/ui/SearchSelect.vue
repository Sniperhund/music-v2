<script setup lang="ts">
export interface Option {
	label: string
	value: any
}

interface SearchSelectProps {
	fetchOptions: (q: string) => Promise<Option[]>
}

const props = defineProps<SearchSelectProps>()
const value = defineModel<string>("value")

const query = ref<string>("")
const options = ref<Option[]>([])
const show = ref<boolean>(false)

watch(query, async (q) => {
	options.value = q ? await props.fetchOptions(q) : []
	show.value = true
})

const select = (item: Option) => {
	value.value = item.value
	query.value = item.label
	nextTick(() => (options.value = []))
}
</script>

<template>
	<div class="search-select" @blur="show = false">
		<Input v-model:value="query" @focus="show = true" type="text" full />

		<ul v-if="options.length && show">
			<li v-for="opt in options" :key="opt.value" @click="select(opt)">
				{{ opt.label }}
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
		padding: 0.35rem 0.85rem;

		transition: background-color 0.1s ease;

		&:hover {
			background-color: $color-button-hover;
		}
	}
}
</style>
