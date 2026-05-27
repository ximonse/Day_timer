import { describe, expect, test } from 'vitest';
import { Ri, polar } from './clock.js';
import { buildBlockClockGeometry } from './clock-geometry.js';
import type { Block } from './state.svelte.js';

function block(id: string, title: string, minutes: number): Block {
	return { id, title, minutes, note: '', warning: true, pinned: false };
}

function geometry(nowOffset: number) {
	return buildBlockClockGeometry({
		blocks: [
			block('a', 'A', 20),
			block('b', 'B', 50),
			block('c', 'C', 20)
		],
		startMin: 12 * 60,
		clockSpan: 60,
		elapsed: nowOffset,
		totalMin: 90,
		innerR: Ri,
		textOutside: false,
		sectorColors: ['#111111', '#222222', '#333333'],
		palette: 'sansad',
		dark: false,
		segMinutesMode: 'planned'
	});
}

describe('clock geometry', () => {
	test('splits a 90 minute session across the main ring and future ring', () => {
		const result = geometry(15);

		expect(result.blockSectors.map(sector => [sector.id, sector.a0, sector.a1, sector.showLabel])).toEqual([
			['block-a-0-0', 0, 120, true],
			['block-b-0-20', 120, 360, true],
			['block-b-1-0', 0, 60, false],
			['block-c-1-10', 60, 90, false]
		]);
		expect(result.overflowSectors.map(sector => [sector.id, sector.a0, sector.a1, sector.boundaryIndex, sector.isEnd])).toEqual([
			['overflow-c-1', 90, 180, 1, true]
		]);
	});

	test('centers the wrapped label on the visible wrapped span', () => {
		const b = geometry(15).blockSectors.find(sector => sector.id === 'block-b-0-20');
		expect(b).toBeDefined();
		const [expectedX, expectedY] = polar(270, (155 + Ri) / 2);

		expect(b?.showLabel).toBe(true);
		expect(b?.lx).toBeCloseTo(expectedX, 5);
		expect(b?.ly).toBeCloseTo(expectedY, 5);
	});

	test('exposes invisible handles for wrapped boundaries and wrapped end', () => {
		const result = geometry(15);

		expect(result.wrappedBoundaryHandles).toEqual([
			{ id: 'wrap-boundary-1', i: 1, ang: 60 }
		]);
		expect(result.wrappedEndHandle).toEqual({ ang: 180 });
	});

	test('does not expose future inner-ring sectors after the hand has passed them', () => {
		const result = geometry(45);

		expect(result.overflowSectors).toEqual([]);
	});

	test('does not advance wrapped sectors before the session has started', () => {
		const result = geometry(-40);

		expect(result.blockSectors.map(sector => sector.id)).toEqual([
			'block-a-0-0',
			'block-b-0-20'
		]);
		expect(result.overflowSectors.map(sector => [sector.id, sector.a0, sector.a1])).toEqual([
			['overflow-b-1', 0, 60],
			['overflow-c-1', 60, 180]
		]);
	});

	test('uses segment order so repeated titles do not merge into one color', () => {
		const result = buildBlockClockGeometry({
			blocks: [
				block('a', 'Samma', 10),
				block('b', 'Samma', 10),
				block('c', 'Samma', 10)
			],
			startMin: 12 * 60,
			clockSpan: 60,
			elapsed: 0,
			totalMin: 30,
			innerR: Ri,
			textOutside: false,
			sectorColors: ['#111111', '#222222', '#333333'],
			palette: 'sansad',
			dark: false,
			segMinutesMode: 'planned'
		});

		expect(result.blockSectors.map(sector => sector.baseColor)).toEqual(['#111111', '#222222', '#333333']);
	});
});
