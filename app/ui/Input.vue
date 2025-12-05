<script setup lang="ts">
type InputType = HTMLInputElement["type"]
type AutocompleteType = HTMLInputElement["autocomplete"]

interface InputProps {
	placeholder?: string
	full?: boolean
	iconName?: string
	type?: InputType
	name?: string
	required?: boolean
	autocomplete?: AutocompleteType
}

const value = defineModel("value")

const emit = defineEmits<{
	(e: "input", value: string): void
	(e: "focus"): void
}>()

const props = defineProps<InputProps>()
</script>

<template>
	<div class="input-wrapper">
		<label v-if="$slots.label" :for="props.name">
			<slot name="label" />
			<span v-if="props.required" class="required">*</span>
		</label>
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
				:type="props.type"
				:name="props.name"
				:id="props.name"
				:required="props.required"
				:autocomplete="props.autocomplete"
			/>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;
@use "@/styles/util" as *;

.input-wrapper {
	& > label {
		display: block;
		@include fontSize(14px);
		margin-bottom: 0.4rem;

		.required {
			margin-left: 0.3em;
			color: $color-attention;
		}
	}
}

.input {
	border-radius: $border-radius-standard;
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

		&:-webkit-autofill,
		&:-webkit-autofill:hover,
		&:-webkit-autofill:focus {
			box-shadow: 0 0 0px 1000px $color-background inset !important;
			-webkit-text-fill-color: $color-text !important;
		}
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
