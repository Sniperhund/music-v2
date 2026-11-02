<script setup lang="ts">
const props = withDefaults(defineProps<{ width?: string; dismissible?: boolean; priority?: boolean }>(), {
	dismissible: true,
	priority: false,
})

const open = defineModel("open")

const dismiss = () => {
	if (props.dismissible) open.value = false
}
</script>

<template>
	<Transition>
		<div class="modal-container" :class="{ priority: props.priority }" v-show="open" @click="dismiss">
			<Card @click.stop :width="props.width">
				<slot />
			</Card>
		</div>
	</Transition>
</template>

<style lang="scss" scoped>
.modal-container {
	position: fixed;
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

.modal-container.priority {
	z-index: 200;
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
