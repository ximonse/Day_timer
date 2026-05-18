import type { Block } from './state.svelte.js';

export function ensureRenderableBlocks(blocks: Block[], createId: () => string): Block[] {
	if (blocks.some(block => Number.isFinite(block.minutes) && block.minutes > 0)) return blocks;
	return [{ id: createId(), title: 'Lektion', minutes: 45, note: '', warning: true, pinned: false }];
}
