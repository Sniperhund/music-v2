<script setup lang="tsx">
const widthFixer = useTemplateRef("width-fixer")
const player = useTemplateRef("player")

onMounted(() => {
	const resizeObserver = new ResizeObserver((entries) => {
		for (const entry of entries) {
			if (player.value)
				player.value.style.width = `${entry.target.clientWidth}px`
		}
	})

	if (widthFixer.value) resizeObserver.observe(widthFixer.value)
})
</script>

<template>
	<div id="width-fixer" ref="width-fixer"></div>
	<article class="player" ref="player"></article>
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;

#width-fixer {
	width: 100%;
}

.player {
	position: fixed;
	bottom: 1rem;

	height: 72px;

	border-radius: $border-radius-standard;
}
</style>
