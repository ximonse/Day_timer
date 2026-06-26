import { describe, expect, test } from 'vitest';
import { formatFlowSegmentMinutes } from './flow-display.js';

describe('flow display helpers', () => {
	test('shows remaining planned minutes for the active segment', () => {
		expect(formatFlowSegmentMinutes({
			active: true,
			plannedMinutes: 45,
			displayMinutes: 45,
			elapsedMinutes: 11.2
		})).toBe('34m');
	});

	test('shows overrun minutes after the active segment passes its plan', () => {
		expect(formatFlowSegmentMinutes({
			active: true,
			plannedMinutes: 30,
			displayMinutes: 35,
			elapsedMinutes: 34.2
		})).toBe('+4m');
	});

	test('keeps non-active segments as plain minute labels', () => {
		expect(formatFlowSegmentMinutes({
			active: false,
			plannedMinutes: 30,
			displayMinutes: 38,
			elapsedMinutes: 0
		})).toBe('38m');
	});
});
