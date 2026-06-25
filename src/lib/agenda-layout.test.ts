import { describe, expect, test } from 'vitest';
import { buildAgendaLayout, computeAgendaOverlaps, minuteToY, yToMinute } from './agenda-layout.js';

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

	test('flags overlapping sessions with the overlap minutes and the clashing titles', () => {
		const overlaps = computeAgendaOverlaps([
			{ title: 'Morgonrutin', startMin: 8 * 60, totalMin: 40 },
			{ title: 'Bildlektion', startMin: 8 * 60 + 15, totalMin: 40 },
			{ title: 'Lunch', startMin: 12 * 60, totalMin: 30 }
		]);

		expect(overlaps[0]).toEqual({ overlapMin: 25, overlapsWith: ['Bildlektion'] });
		expect(overlaps[1]).toEqual({ overlapMin: 25, overlapsWith: ['Morgonrutin'] });
		expect(overlaps[2]).toEqual({ overlapMin: 0, overlapsWith: [] });
	});

	test('treats back-to-back sessions as non-overlapping', () => {
		const overlaps = computeAgendaOverlaps([
			{ title: 'A', startMin: 8 * 60, totalMin: 40 },
			{ title: 'B', startMin: 8 * 60 + 40, totalMin: 40 }
		]);

		expect(overlaps[0].overlapMin).toBe(0);
		expect(overlaps[1].overlapMin).toBe(0);
	});

	test('exposes overlap data on the built layout items', () => {
		const layout = buildAgendaLayout([
			{ id: 'a', title: 'A', startMin: 8 * 60, totalMin: 40 },
			{ id: 'b', title: 'B', startMin: 8 * 60 + 15, totalMin: 40 }
		]);

		expect(layout.items[0].overlapMin).toBe(25);
		expect(layout.items[0].overlapsWith).toEqual(['B']);
	});

	test('converts between minutes and y coordinates using the same window', () => {
		const layout = buildAgendaLayout([{ id: 'a', title: 'Kort', startMin: 9 * 60, totalMin: 20 }]);

		expect(minuteToY(9 * 60, layout.window)).toBe(52.5);
		expect(yToMinute(52.5, layout.window)).toBe(9 * 60);
		expect(yToMinute(60, layout.window, 5)).toBe(9 * 60 + 5);
	});
});
