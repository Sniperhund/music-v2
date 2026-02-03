<script setup lang="ts">
export type Row = {
	name: string
	class?: string
	width?: string
	type?: "image"
	imagePrefix?: string
	displayName?: string
}

type TableProps = {
	rows: Row[]
	data: any
}

const { rows, data } = defineProps<TableProps>()
</script>

<template>
	<table class="table">
		<thead>
			<tr>
				<th
					v-for="row in rows"
					:key="row.name"
					:class="row.class"
					:style="{ width: row.width }"
				>
					{{ row.displayName || row.name }}
				</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="(item, i) in data" :key="i">
				<td v-for="(row, j) in rows" :key="j">
					<slot :name="row.name" :item="item" :index="i">
						<p v-if="row.type != 'image'">{{ item[row.name] }}</p>
						<nuxt-img
							v-else-if="row.type == 'image'"
							:src="`${row.imagePrefix}${item[row.name]}`"
						/>
					</slot>
				</td>
			</tr>
		</tbody>
	</table>
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
}
</style>
