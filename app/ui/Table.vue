<script setup lang="ts">
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
</style>
