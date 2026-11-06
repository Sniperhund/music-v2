<script setup lang="ts">
import type { Album } from "@/utils/types"
import { prefetchRequest } from "@/utils/requestCache"
import { formatAlbumVerificationTooltip, getAlbumVerificationState } from "@/utils/albumVerification"

type AlbumProps = Omit<Omit<Album, "genre">, "artists"> & {
	artists: Array<Omit<Artist, "file">>
	genre?: Genre
}

const props = defineProps<AlbumProps>()

const verificationState = computed(() => getAlbumVerificationState(props))

const verificationTooltip = computed(() => formatAlbumVerificationTooltip(props))

const prefetchAlbum = () => {
	prefetchRequest(`/albums/${props._id}`)
	prefetchRequest(`/albums/${props._id}/tracks`)
}
</script>

<template>
	<article class="card">
		<NuxtLink
			:to="`/album/${props._id}`"
			@pointerenter="prefetchAlbum"
			@focus="prefetchAlbum"
		>
			<NuxtImg
				:src="props.file"
				:alt="props.name"
				placeholder
				width="240"
				height="240"
			/>
			<div class="album-title">
				<p>{{ props.name }}</p>
				<Icon
					v-if="verificationState !== 'approved'"
					name="lucide:badge-check"
					:class="['verification-icon', verificationState]"
					:aria-label="verificationTooltip"
					:title="verificationTooltip"
				/>
			</div>
		</NuxtLink>
		<ArtistName :artists="props.artists" class="artist" />
	</article>
</template>

<style lang="scss" scoped>
@use "@/styles/util" as *;
@use "@/styles/variables" as *;

.card {
	@include fontSize(14px);

	max-width: 240px;

	display: flex;
	flex-direction: column;
	justify-content: start;

	& > a {
		& img {
			border-radius: $border-radius-standard;
		}

		& p {
			margin-top: 0.3rem;
		}
	}
}

.album-title {
	display: flex;
	align-items: center;
	gap: 0.4rem;
	min-width: 0;

	p {
		min-width: 0;
	}
}

.verification-icon {
	flex: 0 0 auto;

	&.denied {
		color: #ff7676;
	}

	&.undecided {
		color: #f6c453;
	}

	&.partial {
		color: #60a5fa;
	}

	&.mixed {
		color: #fb923c;
	}

	&.unapproved {
		color: #ff7676;
	}
}
</style>
