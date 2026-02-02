<script setup lang="ts">
const props = defineProps<{ width?: string }>()

const open = defineModel("open")
</script>

<template>
	<Transition>
		<div class="modal-container" v-show="open" @click="open = false">
			<Card @click.stop :width="props.width">
				<slot />
			</Card>
		</div>
	</Transition>
</template>

<style lang="scss" scoped>
.modal-container {
	position: absolute;
	top: 0;
	left: 0;
	z-index: 10;

	width: 100vw;
	height: 100vh;

	backdrop-filter: blur(10px);
	display: flex;
	justify-content: center;
	align-items: center;
}

.v-enter-active,
.v-leave-active {
	transition: opacity 0.2s ease;
}

.v-enter-from,
.v-leave-to {
	opacity: 0;
}
</style>
