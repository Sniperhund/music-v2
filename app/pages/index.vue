<script setup lang="ts">
import ReplayCards from "~/components/Replay/Cards.vue"

useHead({ title: "Home" })
</script>

<template>
	<section class="home-page">
		<h1>Home</h1>
		<ReplayCards />
		<AlbumRecentlyPlayed />
		<AlbumNewForYou />
	</section>
</template>

<style lang="scss" scoped>
@use "@/styles/util" as *;

.home-page {
	h1 {
		@include fontSize(32px);
		font-weight: 700;
		margin-bottom: 1rem;
	}
}
</style>
