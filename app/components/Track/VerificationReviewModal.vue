<script setup lang="ts">
import type { LyricsVerificationStatus, VerificationStatus } from "@/utils/types"

withDefaults(defineProps<{
	trackName?: string
	trackStatus?: VerificationStatus
	albumStatus?: VerificationStatus
	lyricsStatus?: LyricsVerificationStatus
	hasLyrics?: boolean
	lyricsSynced?: boolean
}>(), {
	trackStatus: "undecided",
	albumStatus: "undecided",
	lyricsStatus: "undecided",
	hasLyrics: false,
	lyricsSynced: false,
})

const open = defineModel<boolean>("open", { required: true })
const note = defineModel<string>("note", { required: true })
const trackDecision = defineModel<VerificationStatus>("trackDecision", { required: true })
const albumDecision = defineModel<VerificationStatus>("albumDecision", { required: true })
const lyricsDecision = defineModel<LyricsVerificationStatus>("lyricsDecision", { required: true })
const emit = defineEmits<{
	finish: []
}>()

const presets = ["Censored lyrics", "Misaligned lyrics", "Completely wrong lyrics"]
</script>

<template>
	<Modal v-model:open="open" :dismissible="false" :priority="true">
		<div class="review-form">
			<h2>Final verification</h2>
			<p v-if="trackName">Review {{ trackName }} before continuing.</p>

			<section class="review-section">
				<div class="review-heading">
					<h3>Track audio</h3>
					<span>Current: {{ trackStatus }}</span>
				</div>
				<div class="review-actions">
					<Button type="button" :aria-pressed="trackDecision === 'approved'" :class="{ selected: trackDecision === 'approved' }" @click="trackDecision = 'approved'">Approve audio</Button>
					<Button type="button" variant="ghost" :aria-pressed="trackDecision === 'denied'" :class="{ selected: trackDecision === 'denied' }" @click="trackDecision = 'denied'">Deny audio</Button>
					<Button type="button" variant="ghost" :aria-pressed="trackDecision === 'undecided'" :class="{ selected: trackDecision === 'undecided' }" @click="trackDecision = 'undecided'">I don't know</Button>
				</div>
			</section>

			<section class="review-section">
				<div class="review-heading">
					<h3>Album</h3>
					<span>Current: {{ albumStatus }}</span>
				</div>
				<div class="review-actions">
					<Button type="button" :aria-pressed="albumDecision === 'approved'" :class="{ selected: albumDecision === 'approved' }" @click="albumDecision = 'approved'">Approve album</Button>
					<Button type="button" variant="ghost" :aria-pressed="albumDecision === 'denied'" :class="{ selected: albumDecision === 'denied' }" @click="albumDecision = 'denied'">Deny album</Button>
					<Button type="button" variant="ghost" :aria-pressed="albumDecision === 'undecided'" :class="{ selected: albumDecision === 'undecided' }" @click="albumDecision = 'undecided'">I don't know</Button>
				</div>
			</section>

			<section class="review-section">
				<div class="review-heading">
					<h3>Lyrics</h3>
					<span>Current: {{ lyricsStatus }}</span>
				</div>
				<template v-if="hasLyrics">
					<label class="review-label" for="final-lyrics-review-note">Minor changes (optional)</label>
					<Input v-model:value="note" type="textarea" textarea full name="final-lyrics-review-note" placeholder="Describe any minor changes" />
					<div class="presets">
						<Button v-for="preset in presets" :key="preset" type="button" variant="ghost" @click="note = preset">{{ preset }}</Button>
					</div>
					<div class="review-actions">
						<Button type="button" :disabled="!lyricsSynced" :aria-pressed="lyricsDecision === 'approved'" :class="{ selected: lyricsDecision === 'approved' }" @click="lyricsDecision = 'approved'">Approve lyrics</Button>
						<Button type="button" :disabled="!lyricsSynced" :aria-pressed="lyricsDecision === 'approved-with-changes'" :class="{ selected: lyricsDecision === 'approved-with-changes' }" @click="lyricsDecision = 'approved-with-changes'">Minor changes</Button>
						<Button type="button" variant="ghost" :aria-pressed="lyricsDecision === 'denied'" :class="{ selected: lyricsDecision === 'denied' }" @click="lyricsDecision = 'denied'">Deny lyrics</Button>
						<Button type="button" variant="ghost" :aria-pressed="lyricsDecision === 'undecided'" :class="{ selected: lyricsDecision === 'undecided' }" @click="lyricsDecision = 'undecided'">I don't know</Button>
						<Button type="button" variant="ghost" :aria-pressed="lyricsDecision === 'instrumental'" :class="{ selected: lyricsDecision === 'instrumental' }" @click="lyricsDecision = 'instrumental'">Instrumental</Button>
					</div>
				</template>
				<div v-else class="review-actions">
					<p>{{ lyricsDecision === "instrumental" ? "Marked as instrumental." : "No lyrics on this track." }}</p>
					<Button type="button" variant="ghost" :aria-pressed="lyricsDecision === 'instrumental'" :class="{ selected: lyricsDecision === 'instrumental' }" @click="lyricsDecision = 'instrumental'">Mark instrumental</Button>
				</div>
			</section>

			<div class="review-actions finish-actions">
				<Button type="button" variant="ghost" @click="emit('finish')">Finish review and continue</Button>
			</div>
		</div>
	</Modal>
</template>

<style lang="scss" scoped>
.review-form {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
}

.review-form h2 {
	font-weight: 700;
}

.review-section {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	padding-top: 0.5rem;
	border-top: 1px solid rgba(255, 255, 255, 0.16);
}

.review-heading,
.review-actions,
.presets {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.5rem;
}

.review-heading {
	justify-content: space-between;
}

.review-heading h3,
.review-heading span {
	font-weight: 600;
}

.review-heading span {
	opacity: 0.7;
}

.review-label {
	font-weight: 600;
}

:deep(.selected) {
	outline: 1px solid currentColor;
}

.finish-actions {
	justify-content: flex-end;
}
</style>
