<script setup lang="ts">
interface ReplayCard {
	period: string
	title: string
	playCount: number
	listenedSeconds: number
	topArtists: string[]
}

const { data, status, error, refresh } = await useApiFetch<{ cards: ReplayCard[] }>("/user/replay")
const cards = computed(() => data.value?.cards ?? [])
const gradients = ["gold", "pink", "orange", "green", "blue"]
</script>

<template>
	<section class="replay-section" aria-labelledby="replay-heading">
		<h2 id="replay-heading">Replay: Your Top Music</h2>

		<p v-if="status === 'pending'" class="message" role="status">
			Loading your Replay…
		</p>
		<div v-else-if="error" class="message" role="alert">
			<p>Your Replay cards could not be loaded.</p>
			<Button variant="ghost" @click="refresh">Try again</Button>
		</div>
		<p v-else-if="cards.length === 0" class="message">
			Your Replay cards will appear after you listen to some music.
		</p>
		<div v-else class="replay-cards">
			<NuxtLink
				v-for="(card, index) in cards"
				:key="card.period"
				:to="`/replay/${card.period}`"
				:class="['replay-card', `gradient-${gradients[index % gradients.length]}`]"
			>
				<span class="card-kicker">Replay</span>
				<strong class="card-title">
					<template v-if="card.period === 'all-time'">All<br>Time</template>
					<template v-else>{{ card.title.replace(", ", ",\n") }}</template>
				</strong>
				<span class="card-artists">
					{{ card.topArtists.join(", ") || "Your listening highlights" }}
				</span>
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
	flex: 0 0 18.5rem;
	aspect-ratio: 296 / 394;
	box-sizing: border-box;
	border-radius: 0.75rem;
	padding: 1rem;
	color: white;
	text-decoration: none;
	display: flex;
	flex-direction: column;
	justify-content: flex-start;
	box-shadow: 0 0.25rem 0.75rem rgb(0 0 0 / 18%);

	&:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: 3px;
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
	overflow-wrap: anywhere;
	white-space: pre-line;
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
	background: linear-gradient(145deg, #ffca36 0%, #ec624e 58%, #a876bd 100%);
}

.gradient-pink {
	background:
		linear-gradient(145deg, #32e2c5 0%, #e50073 58%, #ff922d 100%);
}

.gradient-orange {
	background: linear-gradient(145deg, #f4ba18 0%, #f33d43 52%, #f5a900 100%);
}

.gradient-green {
	background: linear-gradient(145deg, #18cfba 0%, #54d885 52%, #faad1b 100%);
}

.gradient-blue {
	background: linear-gradient(145deg, #24d6d0 0%, #29a8ea 52%, #c5d82f 100%);
}

.message {
	@include fontSize(14px);
	opacity: 0.7;
	margin: 0.75rem 0;
}
</style>
