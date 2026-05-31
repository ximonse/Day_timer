import { describe, expect, test } from 'vitest';
import { halfDayClockStart } from './clock.js';

describe('halfDayClockStart', () => {
	test('anchors 12 hour clock view at 06 and 18', () => {
		expect(halfDayClockStart(0)).toBe(-6 * 60);
		expect(halfDayClockStart(5 * 60 + 59)).toBe(-6 * 60);
		expect(halfDayClockStart(6 * 60)).toBe(6 * 60);
		expect(halfDayClockStart(17 * 60 + 59)).toBe(6 * 60);
		expect(halfDayClockStart(18 * 60)).toBe(18 * 60);
		expect(halfDayClockStart(23 * 60 + 59)).toBe(18 * 60);
	});
});
