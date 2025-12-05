<script setup lang="ts">
interface CheckboxProps {
	label?: string
	name?: string
	required?: boolean
	full?: boolean
}

const model = defineModel<boolean>({ default: false })

const emit = defineEmits<{
	(e: "change", value: boolean): void
}>()

const props = defineProps<CheckboxProps>()
</script>

<template>
	<div class="checkbox-wrapper" :class="{ full: props.full }">
		<label :for="props.name" class="checkbox-label">
			<input
				type="checkbox"
				:id="props.name"
				:name="props.name"
				v-model="model"
				@change="emit('change', model)"
				:required="props.required"
			/>
			<span class="checkmark"></span>

			<slot v-if="$slots.label" name="label" />
			<span v-else-if="props.label">{{ props.label }}</span>

			<span v-if="props.required" class="required">*</span>
		</label>
	</div>
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;
@use "@/styles/util" as *;

.checkbox-wrapper {
	display: inline-block;
	position: relative;
	user-select: none;

	&.full {
		display: block;
		width: 100%;
	}
}

.checkbox-label {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	cursor: pointer;
	position: relative;
	padding-left: 1.6rem;
	@include fontSize(16px);
}

.checkbox-label input {
	position: absolute;
	opacity: 0;
	cursor: pointer;
	height: 0;
	width: 0;
}

.checkmark {
	position: absolute;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
	height: 1rem;
	width: 1rem;
	border: 1px solid $color-border;
	border-radius: $standard-border-radius;
	background-color: transparent;
	transition: background-color 0.2s, border-color 0.2s;
}

.checkbox-label input:checked ~ .checkmark {
	background-color: $color-accent;
	border-color: $color-accent;
}

.checkbox-label input:focus-visible ~ .checkmark {
	outline: 2px solid $color-accent;
	outline-offset: 2px;
}

.checkmark::after {
	content: "";
	position: absolute;
	display: none;
	left: 0.28rem;
	top: 0.05rem;
	width: 0.3rem;
	height: 0.6rem;
	border: solid white;
	border-width: 0 2px 2px 0;
	transform: rotate(45deg);
}

.checkbox-label input:checked ~ .checkmark::after {
	display: block;
}

.required {
	color: $color-attention;
	margin-left: 0.3em;
}
</style>
