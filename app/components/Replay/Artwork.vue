<script setup lang="ts">
import type { ReplayGradient } from "~/utils/replay"

const props = defineProps<{
	title: string
	period: string
	topArtists: string[]
	gradient: ReplayGradient
	animate?: boolean
}>()

const displayTitle = computed(() =>
	props.period === "all-time"
		? "All\nTime"
		: props.title.replace(", ", ",\n"),
)
</script>

<template>
	<div
		:class="[
			'replay-artwork',
			`gradient-${gradient}`,
			{ animated: animate },
		]"
	>
		<span class="card-kicker">Replay</span>
		<strong class="card-title">{{ displayTitle }}</strong>
		<span v-if="animate" class="card-artists">
			{{ topArtists.join(", ") || "Your listening highlights" }}
		</span>
	</div>
</template>

<style lang="scss" scoped>
@use "@/styles/util" as *;

.replay-artwork {
	position: absolute;
	inset: 0;
	box-sizing: border-box;
	user-select: none;
	-webkit-user-select: none;
	padding: 1rem;
	display: flex;
	flex-direction: column;
	justify-content: flex-start;
	color: white;
}

.animated {
	background-size: 200% 200%;
	background-position: left center;
	transition: background-position 1s ease-in-out;

	&:hover {
		background-position: right center;
	}
}

.card-kicker {
	@include fontSize(36px);
	font-weight: 500;
	margin-top: 4rem;
}

.card-title {
	@include fontSize(56px);
	font-weight: 700;
	line-height: 0.88;
	letter-spacing: -0.035em;
	white-space: pre-line;
	overflow-wrap: anywhere;
	margin-top: 1.25rem;
}

.card-artists {
	@include fontSize(11px);
	line-height: 1.35;
	font-weight: 300;
	opacity: 0.9;
	margin-top: auto;
}

.gradient-gold {
	background-image: linear-gradient(
		145deg,
		#ffc52d 0%,
		#ed6554 58%,
		#a978c6 100%
	);
}

.gradient-pink {
	background-image: linear-gradient(
		145deg,
		#35d8c6 0%,
		#ed006d 58%,
		#ff8138 100%
	);
}

.gradient-orange {
	background-image: linear-gradient(
		145deg,
		#f8b913 0%,
		#ee3947 52%,
		#f29b12 100%
	);
}

.gradient-green {
	background-image: linear-gradient(
		145deg,
		#13cbb9 0%,
		#51d77e 52%,
		#f7a91c 100%
	);
}

.gradient-blue {
	background-image: linear-gradient(
		145deg,
		#1fcfce 0%,
		#269fe5 52%,
		#bfd32a 100%
	);
}
</style>
