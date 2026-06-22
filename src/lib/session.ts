import type { Block, Flow } from './state.svelte.js';

export interface SegmentCompletion {
	minutes: number[];
	savedMinutes: number;
}

export function completeActiveSegment(
	minutes: number[],
	activeIndex: number,
	elapsedInSegment: number
): SegmentCompletion {
	const nextMinutes = [...minutes];
	if (activeIndex < 0 || activeIndex >= nextMinutes.length) {
		return { minutes: nextMinutes, savedMinutes: 0 };
	}

	const completedMinutes = Math.min(nextMinutes[activeIndex], Math.max(1, Math.round(elapsedInSegment)));
	const savedMinutes = nextMinutes[activeIndex] - completedMinutes;
	nextMinutes[activeIndex] = completedMinutes;
	if (savedMinutes > 0 && activeIndex < nextMinutes.length - 1) {
		nextMinutes[activeIndex + 1] += savedMinutes;
	}

	return { minutes: nextMinutes, savedMinutes };
}

export function effectiveRunUntilCheckedBlocks(blocks: Block[], elapsedMin: number): Block[] {
	let cum = 0;
	return blocks.map(block => {
		if (!block.runUntilChecked) {
			cum += block.minutes;
			return block;
		}
		const segStart = cum;
		const plannedEnd = segStart + block.minutes;
		const activePastPlannedEnd = elapsedMin >= segStart && elapsedMin >= plannedEnd;
		const minutes = activePastPlannedEnd ? Math.max(block.minutes, Math.ceil(elapsedMin - segStart + 1)) : block.minutes;
		cum += minutes;
		return minutes === block.minutes ? block : { ...block, minutes };
	});
}

export function finalizeRunUntilCheckedSegment(
	blocks: Block[],
	activeIndex: number,
	elapsedInSegment: number
): { blocks: Block[]; deltaMin: number } {
	if (activeIndex < 0 || activeIndex >= blocks.length || !blocks[activeIndex].runUntilChecked) {
		return { blocks, deltaMin: 0 };
	}
	const next = blocks.map(block => ({ ...block }));
	const actualMinutes = Math.max(1, Math.round(elapsedInSegment));
	const previousMinutes = next[activeIndex].minutes;
	next[activeIndex].minutes = actualMinutes;
	delete next[activeIndex].runUntilChecked;
	const deltaMin = actualMinutes - previousMinutes;
	if (deltaMin < 0 && activeIndex < next.length - 1) {
		next[activeIndex + 1].minutes += Math.abs(deltaMin);
		return { blocks: next, deltaMin: 0 };
	}
	return { blocks: next, deltaMin };
}

export function undoCompletedSegment(
	minutes: number[],
	completedIndex: number,
	savedMinutes: number
): number[] {
	const nextMinutes = [...minutes];
	if (completedIndex < 0 || completedIndex >= nextMinutes.length || savedMinutes <= 0) {
		return nextMinutes;
	}

	nextMinutes[completedIndex] += savedMinutes;
	if (completedIndex < nextMinutes.length - 1) {
		nextMinutes[completedIndex + 1] -= savedMinutes;
	}
	return nextMinutes;
}

export function showSegmentDoneControl(
	blockId: string,
	activeBlockId: string | null,
	doneBlockIds: string[]
): boolean {
	return blockId === activeBlockId || blockId === doneBlockIds[doneBlockIds.length - 1];
}

export function allocateBlockMinutes(blocks: Block[], newTotal: number): number[] {
	if (blocks.length === 0) return [];
	const minTotal = blocks.length * 2;
	const targetTotal = Math.max(minTotal, Math.round(newTotal));
	const pinnedBlocks = blocks.filter(block => block.pinned);
	const unpinnedBlocks = blocks.filter(block => !block.pinned);

	if (unpinnedBlocks.length > 0) {
		const pinnedSum = pinnedBlocks.reduce((sum, block) => sum + block.minutes, 0);
		const unpinnedTotal = Math.max(unpinnedBlocks.length * 2, targetTotal - pinnedSum);
		const base = Math.floor(unpinnedTotal / unpinnedBlocks.length);
		let remainder = unpinnedTotal - base * unpinnedBlocks.length;
		return blocks.map(block => {
			if (block.pinned) return block.minutes;
			const extra = remainder > 0 ? 1 : 0;
			if (remainder > 0) remainder -= 1;
			return base + extra;
		});
	}

	const oldTotal = blocks.reduce((sum, block) => sum + block.minutes, 0);
	const factor = oldTotal > 0 ? targetTotal / oldTotal : targetTotal / blocks.length;
	const minutes = blocks.map(block => Math.max(2, Math.round(block.minutes * factor)));
	const drift = targetTotal - minutes.reduce((sum, minutes) => sum + minutes, 0);
	minutes[minutes.length - 1] = Math.max(2, minutes[minutes.length - 1] + drift);
	return minutes;
}

export function ensureRenderableBlocks(blocks: Block[], createId: () => string): Block[] {
	if (blocks.some(block => Number.isFinite(block.minutes) && block.minutes > 0)) return blocks;
	return [];
}

export function hasRunnableSessionContent(blocks: Block[]): boolean {
	return blocks.some(block =>
		Number.isFinite(block.minutes) &&
		block.minutes > 0 &&
		(Boolean(block.title.trim()) || Boolean(block.note.trim()))
	);
}

export interface FlowBlockOptions {
	pinned?: boolean | ((minutes: number, index: number) => boolean);
	warning?: boolean | ((minutes: number, index: number) => boolean);
}

export interface SessionFromFlowOptions extends FlowBlockOptions {
	startMin?: number;
	clockSpan?: 60 | 720;
}

function resolveFlowBlockFlag(
	value: FlowBlockOptions[keyof FlowBlockOptions] | undefined,
	minutes: number,
	index: number
) {
	return typeof value === 'function' ? value(minutes, index) : Boolean(value);
}

function resolveFlowWarning(flow: Flow, index: number, minutes: number, override?: FlowBlockOptions['warning']) {
	if (override !== undefined) return resolveFlowBlockFlag(override, minutes, index);
	return flow.warnings?.[index] ?? false;
}

export function flowToBlocks(flow: Flow, createId: () => string, options: FlowBlockOptions = {}): Block[] {
	return flow.parts.map((title, index) => {
		const minutes = flow.minutes[index] ?? 5;
		const block: Block = {
			id: createId(),
			title,
			minutes,
			note: flow.notes?.[index] ?? '',
			warning: resolveFlowWarning(flow, index, minutes, options.warning),
			pinned: resolveFlowBlockFlag(options.pinned, minutes, index),
		};
		if (flow.runUntilChecked?.[index]) block.runUntilChecked = true;
		return block;
	});
}

export function createSessionStateFromFlow(flow: Flow, createId: () => string, options: SessionFromFlowOptions = {}) {
	return {
		dayTitle: flow.title,
		blocks: flowToBlocks(flow, createId, options),
		extraInfo: flow.extraInfo || '',
		startMin: options.startMin ?? flow.startMin ?? 8 * 60,
		...(options.clockSpan !== undefined ? { clockSpan: options.clockSpan } : {}),
	};
}

export function makeFlowFromSession(
	session: { id?: string; startMin?: number; title: string; blocks: Block[]; extraInfo?: string },
	createId: () => string
): Flow {
	const runUntilChecked = session.blocks.map(block => Boolean(block.runUntilChecked));
	return {
		id: session.id ?? createId(),
		title: session.title.trim() || 'Utan rubrik',
		parts: session.blocks.map(block => block.title),
		minutes: session.blocks.map(block => block.minutes),
		warnings: session.blocks.map(block => block.warning),
		notes: session.blocks.map(block => block.note),
		...(runUntilChecked.some(Boolean) ? { runUntilChecked } : {}),
		extraInfo: session.extraInfo || '',
		...(session.startMin !== undefined ? { startMin: session.startMin } : {}),
	};
}

export function createCurrentFallbackSession(nowMinutes: number, createId: () => string) {
	return {
		dayTitle: 'Inget pass just nu',
		extraInfo: '',
		startMin: Math.round(nowMinutes / 5) * 5,
		blocks: ensureRenderableBlocks([], createId),
	};
}
