export const useSong = () => {
	const { currentSong, queue } = usePlayer()

	return computed<Track | undefined>(() => {
		return currentSong.value ?? queue.value[0]
	})
}
