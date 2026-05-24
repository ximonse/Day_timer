import { R, polar, truncate, isOnlyEmoji } from './clock.js';
import { labelColorFor, type Palette } from './theme.js';
import { colorForTitle, hasColorDirective, paletteIndexForTitle, stripColorDirective } from './title-color.js';
import type { Block } from './state.svelte.js';

export interface BlockClockSector {
	id: string;
	b: Block;
	i: number;
	a0: number;
	a1: number;
	baseColor: string;
	isPast: boolean;
	isActive: boolean;
	opacity: number;
	lx: number;
	ly: number;
	splitAngle: number;
	fillText: string;
	label: string;
	fontSize: number;
	pureEmoji: boolean;
	showBoundaryHandle: boolean;
	showLabel: boolean;
}

export interface OverflowClockSector {
	id: string;
	a0: number;
	a1: number;
	baseColor: string;
	opacity: number;
	boundaryIndex: number | null;
	isEnd: boolean;
}

export interface WrappedClockHandle {
	id: string;
	i: number;
	ang: number;
}

export interface WrappedClockEndHandle {
	ang: number;
}

export interface BlockClockGeometry {
	blockSectors: BlockClockSector[];
	overflowSectors: OverflowClockSector[];
	wrappedBoundaryHandles: WrappedClockHandle[];
	wrappedEndHandle: WrappedClockEndHandle | null;
}

export interface BuildBlockClockGeometryOptions {
	blocks: Block[];
	startMin: number;
	clockSpan: number;
	elapsed: number;
	totalMin: number;
	innerR: number;
	textOutside: boolean;
	sectorColors: string[];
	palette: Palette;
	dark: boolean;
	segMinutesMode: 'off' | 'planned' | 'remaining';
}

export function buildBlockClockGeometry(options: BuildBlockClockGeometryOptions): BlockClockGeometry {
	const startAngle = ((options.startMin % options.clockSpan) / options.clockSpan) * 360;
	const currentCycle = options.elapsed > 0 ? Math.floor(options.elapsed / options.clockSpan) : 0;
	const currentLocalMin = ((options.elapsed % options.clockSpan) + options.clockSpan) % options.clockSpan;
	return {
		blockSectors: buildBlockSectors(options, startAngle, currentCycle, currentLocalMin),
		overflowSectors: buildOverflowSectors(options, startAngle, currentCycle, currentLocalMin),
		wrappedBoundaryHandles: buildWrappedBoundaryHandles(options.blocks, options.clockSpan, startAngle),
		wrappedEndHandle: buildWrappedEndHandle(options.totalMin, options.clockSpan, startAngle)
	};
}

function buildBlockSectors(
	options: BuildBlockClockGeometryOptions,
	startAngle: number,
	currentCycle: number,
	currentLocalMin: number
): BlockClockSector[] {
	let cumMin = 0;
	return options.blocks.flatMap((b, i) => {
		const segStartMin = cumMin;
		const segEndMin = cumMin + b.minutes;
		const displayTitle = stripColorDirective(b.title);
		const baseColor = colorForTitle(b.title, options.sectorColors);
		const colorIndex = paletteIndexForTitle(b.title, options.sectorColors);
		const explicitColor = hasColorDirective(b.title);
		const pureEmoji = isOnlyEmoji(displayTitle);
		const labelText = pureEmoji ? displayTitle : truncate(displayTitle, 14);
		const wrappedVisibleEnd = currentCycle === 0 && segStartMin < options.clockSpan && segEndMin > options.clockSpan
			? Math.min(segEndMin, options.clockSpan + currentLocalMin)
			: null;
		const wrappedLabelMin = wrappedVisibleEnd !== null && wrappedVisibleEnd > options.clockSpan
			? (segStartMin + wrappedVisibleEnd) / 2
			: null;
		cumMin = segEndMin;
		const sectors: BlockClockSector[] = [];
		for (
			let chunkStart = segStartMin;
			chunkStart < segEndMin;
			chunkStart = Math.min(segEndMin, (Math.floor(chunkStart / options.clockSpan) + 1) * options.clockSpan)
		) {
			const chunkCycle = Math.floor(chunkStart / options.clockSpan);
			const chunkEnd = Math.min(segEndMin, (chunkCycle + 1) * options.clockSpan);
			if (chunkEnd <= chunkStart || (chunkCycle !== 0 && chunkCycle < currentCycle)) continue;
			const cycleStart = chunkCycle * options.clockSpan;
			const localStart = chunkStart - cycleStart;
			const localEnd = chunkEnd - cycleStart;
			const isFutureCycle = chunkCycle > currentCycle;
			const visibleEnd = isFutureCycle ? Math.min(localEnd, currentLocalMin) : localEnd;
			if (visibleEnd <= localStart) continue;
			for (let sliceStart = localStart; sliceStart < visibleEnd; sliceStart = visibleEnd) {
				const sliceEnd = visibleEnd;
				const a0 = startAngle + (sliceStart / options.clockSpan) * 360;
				const a1 = startAngle + (sliceEnd / options.clockSpan) * 360;
				const labelMin = wrappedLabelMin ?? (!isFutureCycle ? (chunkStart + chunkEnd) / 2 : null);
				const labelCycle = labelMin !== null ? Math.floor(labelMin / options.clockSpan) : null;
				const labelLocalMin = labelMin !== null ? ((labelMin % options.clockSpan) + options.clockSpan) % options.clockSpan : null;
				const showLabel = labelCycle === chunkCycle && labelLocalMin !== null && labelLocalMin >= sliceStart && labelLocalMin <= sliceEnd;
				const isPast = options.elapsed >= chunkEnd;
				const isActive = options.elapsed >= chunkStart && options.elapsed < chunkEnd;
				const midAngle = showLabel && labelLocalMin !== null ? startAngle + (labelLocalMin / options.clockSpan) * 360 : (a0 + a1) / 2;
				const [lx, ly] = options.textOutside ? polar(midAngle, R + 22) : polar(midAngle, options.innerR > 0 ? (R + options.innerR) / 2 : R / 2);
				let chunkLabel = labelText;
				if (!pureEmoji) {
					if (options.segMinutesMode === 'planned') {
						chunkLabel += ` ${b.minutes}m`;
					} else if (options.segMinutesMode === 'remaining') {
						const mins = options.elapsed >= segEndMin ? 0 : options.elapsed >= segStartMin && options.elapsed < segEndMin ? Math.max(0, Math.ceil(segEndMin - options.elapsed)) : b.minutes;
						chunkLabel += ` ${mins}m kvar`;
					}
				}
				sectors.push({
					id: `block-${b.id}-${chunkCycle}-${sliceStart}`,
					b,
					i,
					a0,
					a1,
					baseColor,
					isPast,
					isActive,
					opacity: 1,
					lx,
					ly,
					splitAngle: startAngle + (((options.elapsed - cycleStart) / options.clockSpan) * 360),
					fillText: explicitColor ? baseColor : labelColorFor(baseColor, colorIndex, isPast, options.palette, options.dark),
					label: chunkLabel,
					fontSize: pureEmoji ? 48 : (options.textOutside ? 14 : 13),
					pureEmoji,
					showBoundaryHandle: chunkStart === segStartMin && i > 0,
					showLabel
				});
			}
		}
		return sectors;
	});
}

function buildOverflowSectors(
	options: BuildBlockClockGeometryOptions,
	startAngle: number,
	currentCycle: number,
	currentLocalMin: number
): OverflowClockSector[] {
	let cumMin = 0;
	return options.blocks.flatMap((b, i) => {
		const segStartMin = cumMin;
		const segEndMin = cumMin + b.minutes;
		const baseColor = colorForTitle(b.title, options.sectorColors);
		cumMin = segEndMin;
		const sectors: OverflowClockSector[] = [];
		for (
			let chunkStart = segStartMin;
			chunkStart < segEndMin;
			chunkStart = Math.min(segEndMin, (Math.floor(chunkStart / options.clockSpan) + 1) * options.clockSpan)
		) {
			const chunkCycle = Math.floor(chunkStart / options.clockSpan);
			const chunkEnd = Math.min(segEndMin, (chunkCycle + 1) * options.clockSpan);
			if (chunkEnd <= chunkStart || chunkCycle <= currentCycle) continue;
			const cycleStart = chunkCycle * options.clockSpan;
			const localStart = chunkStart - cycleStart;
			const localEnd = chunkEnd - cycleStart;
			const visibleStart = Math.max(localStart, currentLocalMin);
			if (localEnd <= visibleStart) continue;
			sectors.push({
				id: `overflow-${b.id}-${chunkCycle}`,
				a0: startAngle + (visibleStart / options.clockSpan) * 360,
				a1: startAngle + (localEnd / options.clockSpan) * 360,
				baseColor,
				opacity: 1,
				boundaryIndex: chunkEnd === segEndMin && chunkEnd < options.totalMin ? i : chunkStart === segStartMin && i > 0 ? i - 1 : null,
				isEnd: chunkEnd === options.totalMin
			});
		}
		return sectors;
	});
}

function buildWrappedBoundaryHandles(blocks: Block[], clockSpan: number, startAngle: number): WrappedClockHandle[] {
	let cumMin = 0;
	const handles: WrappedClockHandle[] = [];
	for (let i = 0; i < blocks.length - 1; i++) {
		cumMin += blocks[i].minutes;
		if (cumMin <= clockSpan) continue;
		const localMin = ((cumMin % clockSpan) + clockSpan) % clockSpan;
		const ang = startAngle + (localMin / clockSpan) * 360;
		handles.push({ id: `wrap-boundary-${i}`, i, ang });
	}
	return handles;
}

function buildWrappedEndHandle(totalMin: number, clockSpan: number, startAngle: number): WrappedClockEndHandle | null {
	if (totalMin <= clockSpan) return null;
	const localMin = ((totalMin % clockSpan) + clockSpan) % clockSpan;
	return { ang: startAngle + (localMin / clockSpan) * 360 };
}
