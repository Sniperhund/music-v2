<script setup lang="ts">
export type Row = {
	name: string
	class?: string
	width?: string
	type?: "image"
	displayName?: string
}

type TableProps = {
	rows: Row[]
	data: any
}

const { rows, data } = defineProps<TableProps>()
</script>

<template>
	<table>
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
					</slot>
				</td>
			</tr>
		</tbody>
	</table>
</template>
