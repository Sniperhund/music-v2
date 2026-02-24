<script setup lang="ts">
const { toasts, remove } = useToast()
const song = useSong()
</script>

<template>
	<div class="toast-container" :class="{ playerShown: song != undefined }">
		<TransitionGroup name="toast">
			<div
				v-for="toast in toasts"
				:key="toast.id"
				class="toast"
				:class="[toast.type]"
				@click="remove(toast.id)"
			>
				{{ toast.message }}
			</div>
		</TransitionGroup>
	</div>
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;

.toast-container {
	position: fixed;
	bottom: 0;
	right: 0;
	z-index: 100;

	padding: 2rem;

	display: flex;
	flex-direction: column;
	gap: 10px;

	transition: trasnform 0.2s ease-out;
}

.playerShown {
	transform: translateY(-$player-height);
}

.toast {
	background-color: $color-background;
	border: 1px solid $color-border;
	border-radius: $border-radius-standard;

	padding: 10px 16px;
	min-width: 200px;

	cursor: pointer;

	transition:
		transform 0.2s ease,
		opacity 0.2s ease;
}

.toast-enter-from {
	opacity: 0;
	transform: translateX(50px);
}

.toast-enter-active {
	transition: all 0.3s ease-out;
}

.toast-enter-to {
	opacity: 1;
	transform: translateX(0);
}

.toast-leave-from {
	opacity: 1;
	transform: translateX(0);
}

.toast-leave-active {
	transition: all 0.3s ease-out;
}

.toast-leave-to {
	opacity: 0;
	transform: translateX(50px);
}
</style>
