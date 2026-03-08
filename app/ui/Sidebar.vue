<template>
	<div class="sidebar-container">
		<aside>
			<slot name="sidebar" />
		</aside>

		<main>
			<slot />
		</main>
	</div>
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;
@use "sass:color";

.sidebar-container {
	width: 100vw;
	height: 100vh;

	overflow: hidden;

	display: flex;

	background-color: $color-background;
	color: $color-text;

	& aside {
		height: 100%;
		min-width: 275px;
		max-width: 300px;

		border-right: 1px solid $color-border;
		padding: 1.5rem;
	}

	& main {
		width: 100%;
		height: 100%;
		overflow-y: auto;
		padding: 2rem 3rem calc(2rem + $player-height);
	}
}
</style>
