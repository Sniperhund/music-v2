<script setup lang="ts">
import { getReplayGradient } from "~/utils/replay"

interface ReplayCard {
	period: string
	title: string
	playCount: number
	listenedSeconds: number
	topArtists: string[]
}

const { data, status, error, refresh } = await useApiFetch<{ cards: ReplayCard[] }>("/user/replay")
const cards = computed(() => data.value?.cards ?? [])
</script>

<template>
	<section class="replay-section" aria-labelledby="replay-heading">
		<h2 id="replay-heading">Replay: Your Top Music</h2>
		<p v-if="status === 'pending'" class="message" role="status">Loading your Replay…</p>
		<div v-else-if="error" class="message" role="alert">
			<p>Your Replay cards could not be loaded.</p>
			<Button variant="ghost" @click="refresh">Try again</Button>
		</div>
		<p v-else-if="cards.length === 0" class="message">Your Replay cards will appear after you listen to some music.</p>
		<div v-else class="replay-cards">
			<NuxtLink
				v-for="card in cards"
				:key="card.period"
				:to="`/replay/${card.period}`"
				class="replay-card"
			>
				<ReplayArtwork
					:title="card.title"
					:period="card.period"
					:top-artists="card.topArtists"
					:gradient="getReplayGradient(card.period)"
					:animate="true"
				/>
			</NuxtLink>
		</div>
	</section>
</template>

<style lang="scss" scoped>
@use "@/styles/util" as *;

.replay-section {
	margin-bottom: 2rem;

	h2 {
		@include fontSize(18px);
		font-weight: 700;
		margin-bottom: 0.75rem;
	}
}

.replay-cards {
	display: flex;
	gap: 1rem;
	overflow-x: auto;
	padding-bottom: 0.5rem;
}

.replay-card {
	position: relative;
	flex: 0 0 18.5rem;
	aspect-ratio: 296 / 394;
	border-radius: 0.75rem;
	overflow: hidden;
	text-decoration: none;
	box-shadow: 0 0.25rem 0.75rem rgb(0 0 0 / 18%);

	&:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: 3px;
	}
}

.message {
	@include fontSize(14px);
	opacity: 0.7;
	margin: 0.75rem 0;
}
</style>
