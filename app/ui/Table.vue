<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { GET_AUDIO_FILE, GET_FILE } from "@/utils/file"

defineOptions({ inheritAttrs: false })

export type Row = {
	name: string
	class?: string
	width?: string
	type?: "image" | "audio"
	displayName?: string
}

type TableProps = {
	rows: Row[]
	data: any
	pagination?: boolean
	pageSize?: number
	search?: boolean
}

const props = withDefaults(defineProps<TableProps>(), {
	pagination: false,
	pageSize: 10,
	search: false,
})

const currentPage = ref(1)
const query = ref("")
const data = computed(() => (Array.isArray(props.data) ? props.data : []))
const pageSize = computed(() => Math.max(1, Math.floor(props.pageSize)))
const filteredData = computed(() => {
	const normalizedQuery = query.value.trim().toLocaleLowerCase()
	const indexedData = data.value.map((item: any, index: number) => ({
		item,
		index,
	}))

	if (!props.search || !normalizedQuery) return indexedData

	return indexedData.filter(({ item }: { item: any }) =>
		props.rows.some((row) =>
			String(item[row.name] ?? "")
				.toLocaleLowerCase()
				.includes(normalizedQuery),
		),
	)
})
const pageCount = computed(() =>
	Math.max(1, Math.ceil(filteredData.value.length / pageSize.value)),
)
const pagedData = computed(() => {
	if (!props.pagination) return filteredData.value

	const start = (currentPage.value - 1) * pageSize.value
	return filteredData.value.slice(start, start + pageSize.value)
})

watch(query, () => {
	currentPage.value = 1
})

watch(pageCount, (count) => {
	if (currentPage.value > count) currentPage.value = count
})
</script>

<template>
	<Input
		v-if="props.search"
		v-model:value="query"
		type="search"
		placeholder="Search table"
		class="table-search"
	/>
	<table v-bind="$attrs" class="table">
		<thead>
			<tr>
				<th
					v-for="row in props.rows"
					:key="row.name"
					:class="row.class"
					:style="{ width: row.width }"
				>
					{{ row.displayName || row.name }}
				</th>
			</tr>
		</thead>
		<tbody :key="currentPage">
			<tr
				v-for="entry in pagedData"
				:key="entry.index"
			>
				<td v-for="(row, j) in props.rows" :key="j">
					<slot
						:name="row.name"
						:item="entry.item"
						:index="entry.index"
					>
						<nuxt-img
							v-if="row.type == 'image'"
							:src="GET_FILE(entry.item[row.name])"
						/>
						<audio
							v-else-if="row.type == 'audio'"
							controls
							:src="GET_AUDIO_FILE(entry.item[row.name])"
						/>
						<p v-else>{{ entry.item[row.name] }}</p>
					</slot>
				</td>
			</tr>
		</tbody>
	</table>
	<nav
		v-if="props.pagination && pageCount > 1"
		class="pagination"
		aria-label="Table pagination"
	>
		<button
			type="button"
			:disabled="currentPage === 1"
			aria-label="Previous page"
			@click="currentPage--"
		>
			Previous
		</button>
		<button
			v-for="page in pageCount"
			:key="page"
			type="button"
			:aria-label="`Page ${page}`"
			:aria-current="currentPage === page ? 'page' : undefined"
			:class="{ active: currentPage === page }"
			@click="currentPage = page"
		>
			{{ page }}
		</button>
		<button
			type="button"
			:disabled="currentPage === pageCount"
			aria-label="Next page"
			@click="currentPage++"
		>
			Next
		</button>
	</nav>
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;
@use "@/styles/util" as *;

.table {
	width: 100%;
	text-align: left;
	border-collapse: collapse;
	@include fontSize(15px);

	& th,
	& td {
		border-bottom: 1px solid $color-border;
		padding: 0.5rem 0.6rem;
	}

	& tr:last-child td {
		border-bottom: none;
	}

	& thead {
	}

	& img {
		height: 60px;
		border-radius: $border-radius-standard;
	}

	& audio {
		max-width: 200px;
		padding: 5px 0;
	}
}

.table-search {
	margin-bottom: 0.75rem;
}

.table tbody {
	animation: table-page-fade 0.18s ease;
}

@keyframes table-page-fade {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}

.pagination {
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 0.4rem;
	margin-top: 0.75rem;

	& button {
		padding: 0.4rem 0.65rem;
		border-radius: $border-radius-standard;
		background-color: $color-button;
		cursor: pointer;
	}

	& button:hover:not(:disabled),
	& button.active {
		background-color: $color-button-hover;
	}

	& button:disabled {
		cursor: default;
		opacity: 0.5;
	}
}
</style>
