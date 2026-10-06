<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { GET_AUDIO_FILE, GET_FILE } from "@/utils/file"

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
}

const props = withDefaults(defineProps<TableProps>(), {
	pagination: false,
	pageSize: 10,
})

const currentPage = ref(1)
const pageSize = computed(() => Math.max(1, Math.floor(props.pageSize)))
const pageCount = computed(() =>
	Math.max(1, Math.ceil(props.data.length / pageSize.value)),
)
const visibleData = computed(() => {
	if (!props.pagination) return props.data

	const start = (currentPage.value - 1) * pageSize.value
	return props.data.slice(start, start + pageSize.value)
})

watch(pageCount, (count) => {
	if (currentPage.value > count) currentPage.value = count
})
</script>

<template>
	<table class="table">
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
		<tbody>
			<tr
				v-for="(item, i) in visibleData"
				:key="(currentPage - 1) * pageSize + i"
			>
				<td v-for="(row, j) in props.rows" :key="j">
					<slot
						:name="row.name"
						:item="item"
						:index="props.pagination ? (currentPage - 1) * pageSize + i : i"
					>
						<nuxt-img
							v-if="row.type == 'image'"
							:src="GET_FILE(item[row.name])"
						/>
						<audio
							v-else-if="row.type == 'audio'"
							controls
							:src="GET_AUDIO_FILE(item[row.name])"
						/>
						<p v-else>{{ item[row.name] }}</p>
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
