<script setup lang="ts">
interface CardProps {
	width?: string
}

const props = defineProps<CardProps>()
</script>

<template>
	<article class="card" :style="{ width: props.width }">
		<slot />
	</article>
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;

.card {
	border: 1px solid $color-border;
	border-radius: $border-radius-standard;
	padding: 1rem;
}
</style>
