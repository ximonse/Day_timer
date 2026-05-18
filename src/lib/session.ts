import type { Block, Flow } from './state.svelte.js';

export function ensureRenderableBlocks(blocks: Block[], createId: () => string): Block[] {
	if (blocks.some(block => Number.isFinite(block.minutes) && block.minutes > 0)) return blocks;
	return [{ id: createId(), title: 'Lektion', minutes: 45, note: '', warning: true, pinned: false }];
}

export interface FlowBlockOptions {
	pinned?: boolean | ((minutes: number, index: number) => boolean);
	warning?: boolean | ((minutes: number, index: number) => boolean);
}

export interface SessionFromFlowOptions extends FlowBlockOptions {
	startMin?: number;
	clockSpan?: 60 | 120 | 720;
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
		const minutes = flow.minutes[index] ?? 45;
		return {
			id: createId(),
			title,
			minutes,
			note: flow.notes?.[index] ?? '',
			warning: resolveFlowWarning(flow, index, minutes, options.warning),
			pinned: resolveFlowBlockFlag(options.pinned, minutes, index),
		};
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
