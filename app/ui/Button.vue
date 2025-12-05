<script setup lang="ts">
import { NuxtLink } from "#components"

interface ButtonProps {
	to?: string
	type?: "button" | "submit" | "link"
	variant?: "default" | "ghost"
	full?: boolean
	iconName?: string
	centerText?: boolean
}

const props = withDefaults(defineProps<ButtonProps>(), {
	type: "button",
	variant: "default",
})
</script>

<template>
	<component
		:is="
			props.type == 'link' && props.to != undefined ? NuxtLink : 'button'
		"
		:to="props.to"
		:class="[
			`button type-${props.variant}`,
			{
				full: props.full,
				icon: $slots.icon || props.iconName,
				center: props.centerText,
			},
		]"
	>
		<span class="icon-wrapper">
			<slot name="icon" v-if="!props.iconName" />
			<Icon :name="props.iconName" v-else />
		</span>
		<slot />
	</component>
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;

.button {
	padding: 0.6rem 1rem;
	transition: background-color 0.2s ease-in-out;
	border-radius: $standard-border-radius;

	font-weight: 600;
}

.full {
	width: 100%;
	text-align: left;

	&.center {
		justify-content: center;
	}
}

.button,
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

.type-default {
	background-color: $color-button;
}

.type-default:hover,
.type-ghost:hover {
	background-color: $color-button-hover;
}

.type-ghost {
}
</style>
