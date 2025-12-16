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
	label?: string
}

const value = defineModel<string | File | File[] | null>("value")

const emit = defineEmits<{
	(e: "input", value: string): void
	(e: "file", value: File | File[] | null | undefined): void
	(e: "focus"): void
	(e: "blur"): void
}>()

const props = defineProps<InputProps>()

const onFileChange = (e: Event) => {
	const input = e.target as HTMLInputElement
	const files = input.files

	if (!files || files.length == 0) {
		value.value = null
		emit("file", null)
		return
	}

	const result = files.length == 1 ? files[0] : Array.from(files)

	value.value = result
	emit("file", result)
}
</script>

<template>
	<div class="input-wrapper">
		<label v-if="$slots.label || props.label" :for="props.name">
			<template v-if="!props.label">
				<slot name="label" />
			</template>
			<template v-else>
				{{ props.label }}
			</template>

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
				v-if="props.type != 'file'"
				:placeholder="props.placeholder"
				v-model="value"
				@input="(e) => emit('input', e.target?.value)"
				@focus="emit('focus')"
				@blur="emit('blur')"
				:type="props.type"
				:name="props.name"
				:id="props.name"
				:required="props.required"
				:autocomplete="props.autocomplete"
			/>

			<input
				v-else
				@focus="emit('focus')"
				@blur="emit('blur')"
				@change="onFileChange"
				:type="props.type"
				:name="props.name"
				:id="props.name"
				:required="props.required"
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
