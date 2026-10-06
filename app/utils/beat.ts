export function shapeBeatPulse(value: number) {
	const strength = Math.max(0, Math.min(0.4, value))
	if (strength <= 0.2) return strength * 0.4
	if (strength <= 0.35) {
		const progress = (strength - 0.2) / 0.15
		return 0.08 + (1 - (1 - progress) ** 3) * 0.42
	}
	return 0.5 + ((strength - 0.35) / 0.05) * 0.05
}
