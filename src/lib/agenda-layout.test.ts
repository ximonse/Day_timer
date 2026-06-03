import { describe, expect, test } from 'vitest';
import { buildAgendaLayout, minuteToY, yToMinute } from './agenda-layout.js';

describe('agenda layout', () => {
	test('places the first session near the top with breathing room', () => {
		const layout = buildAgendaLayout([
			{ id: 'a', title: 'Kort', startMin: 9 * 60, totalMin: 20 },
			{ id: 'b', title: 'Längre', startMin: 10 * 60, totalMin: 45 }
		]);

		expect(layout.window.start).toBe(8 * 60 + 30);
		expect(layout.items[0]).toMatchObject({
			id: 'a',
			topPx: 52.5,
			heightPx: 35,
			compact: true
		});
		expect(layout.items[1].topPx).toBe(157.5);
		expect(layout.items[1].heightPx).toBe(78.75);
		expect(layout.items[1].compact).toBe(false);
	});

	test('converts between minutes and y coordinates using the same window', () => {
		const layout = buildAgendaLayout([{ id: 'a', title: 'Kort', startMin: 9 * 60, totalMin: 20 }]);

		expect(minuteToY(9 * 60, layout.window)).toBe(52.5);
		expect(yToMinute(52.5, layout.window)).toBe(9 * 60);
		expect(yToMinute(60, layout.window, 5)).toBe(9 * 60 + 5);
	});
});
