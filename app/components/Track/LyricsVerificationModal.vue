<script setup lang="ts">
const props = withDefaults(defineProps<{
	mode?: "minor-changes" | "review"
	trackName?: string
	lyricsSynced?: boolean
}>(), {
	mode: "minor-changes",
	lyricsSynced: false,
})

const open = defineModel<boolean>("open", { required: true })
const note = defineModel<string>("note", { required: true })
const emit = defineEmits<{
	approve: []
	approveWithChanges: []
	deny: []
	dismiss: []
}>()

const presets = ["Censored lyrics", "Misaligned lyrics", "Completely wrong lyrics"]
</script>

<template>
	<Modal v-model:open="open" :dismissible="mode !== 'review'" :priority="mode === 'review'">
		<form v-if="mode === 'minor-changes'" class="lyrics-verification-form" @submit.prevent="emit('approveWithChanges')">
			<h2>Minor lyric changes required</h2>
			<p>Optionally describe the changes needed.</p>
			<Input v-model:value="note" type="textarea" textarea full placeholder="Describe the required changes" />
			<div class="lyrics-verification-presets">
				<Button v-for="preset in presets" :key="preset" type="button" variant="ghost" @click="note = preset">{{ preset }}</Button>
			</div>
			<div class="lyrics-verification-actions">
				<Button type="button" variant="ghost" @click="open = false">Cancel</Button>
				<Button type="submit">Approve</Button>
			</div>
		</form>
		<div v-else class="lyrics-verification-form">
			<h2>Review lyrics</h2>
			<p v-if="trackName">Did you notice anything about the lyrics for {{ trackName }}?</p>
			<label class="lyrics-verification-label" for="fullscreen-lyrics-review-note">Changes required (optional)</label>
			<Input v-model:value="note" type="textarea" textarea full name="fullscreen-lyrics-review-note" placeholder="Describe any minor changes" />
			<div class="lyrics-verification-presets">
				<Button v-for="preset in presets" :key="preset" type="button" variant="ghost" @click="note = preset">{{ preset }}</Button>
			</div>
			<div class="lyrics-verification-actions">
				<Button v-if="lyricsSynced" @click="emit('approve')">Approve</Button>
				<Button v-if="lyricsSynced" @click="emit('approveWithChanges')">Minor changes required</Button>
				<Button @click="emit('deny')">Deny</Button>
				<Button variant="ghost" @click="emit('dismiss')">I don't know</Button>
			</div>
		</div>
	</Modal>
</template>

<style lang="scss" scoped>
.lyrics-verification-form {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
}

.lyrics-verification-form h2 {
	font-weight: 700;
}

.lyrics-verification-label {
	font-weight: 600;
}

.lyrics-verification-presets,
.lyrics-verification-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
}

.lyrics-verification-actions {
	justify-content: flex-end;
}
</style>
