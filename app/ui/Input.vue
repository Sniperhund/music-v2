<script setup lang="ts">
interface InputProps {
	placeholder?: string
	full?: boolean
	iconName?: string
}

const value = defineModel("value")

const emit = defineEmits<{
	(e: "input", value: string): void
	(e: "focus"): void
}>()

const props = defineProps<InputProps>()
</script>

<template>
	<div
		class="input"
		:class="{ full: props.full, icon: $slots.icon || props.iconName }"
	>
		<span class="icon-wrapper">
			<slot name="icon" v-if="!props.iconName" />
			<Icon :name="props.iconName" v-else />
		</span>
		<input
			:placeholder="props.placeholder"
			v-model="value"
			@input="(e) => emit('input', e.target?.value)"
			@focus="emit('focus')"
		/>
	</div>
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;

.input {
	border-radius: $standard-border-radius;
	border: 1px solid $color-border;

	padding: 0.5rem 1rem;

	transition: outline 0.2s ease;
	outline: 2px solid transparent;

	&:focus-within {
		outline: 2px solid $color-accent;
	}

	& input {
		width: 100%;
		background: none;
	}

	& input:focus {
		outline: none;
	}

	& input::placeholder {
		color: $color-placeholder-text;
	}
}

.input,
.icon,
.icon-wrapper {
	display: inline-flex;
	align-items: center;
}

.icon {
	gap: 0.7rem;

	.icon-wrapper {
		font-size: 24px;
	}
}

.full {
	width: 100%;
}
</style>
