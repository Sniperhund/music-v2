<script setup lang="ts">
definePageMeta({
	layout: false,
})
</script>

<template>
	<section class="auth">
		<Card class="card">
			<NuxtPage />
		</Card>
	</section>
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;

.auth {
	width: 100vw;
	height: 100vh;
	background-color: $color-background;

	display: flex;
	justify-content: center;
	align-items: center;
}

.card {
	width: 40%;
	max-width: 450px;
}
</style>
