export function formatFlowSegmentMinutes(input: {
	active: boolean;
	plannedMinutes: number;
	displayMinutes: number;
	elapsedMinutes: number;
}): string {
	if (!input.active) return `${input.displayMinutes}m`;
	const remaining = input.plannedMinutes - input.elapsedMinutes;
	if (remaining > 0) return `${Math.ceil(remaining)}m`;
	const overrun = Math.floor(Math.abs(remaining));
	return overrun > 0 ? `+${overrun}m` : '0m';
}
