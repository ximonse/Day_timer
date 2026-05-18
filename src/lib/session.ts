import type { Block, Flow } from './state.svelte.js';

export function ensureRenderableBlocks(blocks: Block[], createId: () => string): Block[] {
	if (blocks.some(block => Number.isFinite(block.minutes) && block.minutes > 0)) return blocks;
	return [{ id: createId(), title: 'Lektion', minutes: 45, note: '', warning: true, pinned: false }];
}

export interface FlowBlockOptions {
	pinned?: boolean | ((minutes: number, index: number) => boolean);
	warning?: boolean | ((minutes: number, index: number) => boolean);
}

function resolveFlowBlockFlag(
	value: FlowBlockOptions[keyof FlowBlockOptions] | undefined,
	minutes: number,
	index: number
) {
	return typeof value === 'function' ? value(minutes, index) : Boolean(value);
}

export function flowToBlocks(flow: Flow, createId: () => string, options: FlowBlockOptions = {}): Block[] {
	return flow.parts.map((title, index) => {
		const minutes = flow.minutes[index] ?? 45;
		return {
			id: createId(),
			title,
			minutes,
			note: flow.notes?.[index] ?? '',
			warning: resolveFlowBlockFlag(options.warning, minutes, index),
			pinned: resolveFlowBlockFlag(options.pinned, minutes, index),
		};
	});
}

export function makeFlowFromSession(
	session: { id?: string; startMin?: number; title: string; blocks: Block[]; extraInfo?: string },
	createId: () => string
): Flow {
	return {
		id: session.id ?? createId(),
		title: session.title.trim() || 'Utan rubrik',
		parts: session.blocks.map(block => block.title),
		minutes: session.blocks.map(block => block.minutes),
		warnings: session.blocks.map(block => block.warning),
		notes: session.blocks.map(block => block.note),
		extraInfo: session.extraInfo || '',
		...(session.startMin !== undefined ? { startMin: session.startMin } : {}),
	};
}

export function createCurrentFallbackSession(nowMinutes: number, createId: () => string) {
	return {
		dayTitle: '',
		extraInfo: '',
		startMin: Math.round(nowMinutes / 5) * 5,
		blocks: ensureRenderableBlocks([], createId),
	};
}
