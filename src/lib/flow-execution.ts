import type { Block } from './state.svelte.js';

export type FlowExecutionStatus = 'running' | 'rest' | 'complete';

export interface FlowCompletion {
	blockId: string;
	title: string;
	plannedMinutes: number;
	actualMinutes: number;
	startedAtMin: number;
	completedAtMin: number;
	delayBeforeMin: number;
	delayAfterMin: number;
	bonusMinutes: number;
}

export interface FlowExecutionState {
	planKey: string;
	contextKey: string;
	plannedStartMin: number;
	displayStartMin: number;
	blocks: Block[];
	allocations: number[];
	actualMinutes: Array<number | null>;
	currentIndex: number;
	currentStartedAtMin: number;
	currentWorkedMin: number;
	runningSinceMin: number | null;
	delayMin: number;
	bufferMinutes: number;
	restMinutes: number;
	restStartedAtMin: number | null;
	status: FlowExecutionStatus;
	completions: FlowCompletion[];
}

export interface CompleteFlowActivityResult {
	state: FlowExecutionState;
	completion: FlowCompletion | null;
}

export type CompleteFlowActivityOptions = Record<string, never>;

function cloneBlocks(blocks: Block[]): Block[] {
	return blocks.map(block => ({ ...block }));
}

export function flowPlanKey(blocks: Block[], plannedStartMin: number, contextKey = ''): string {
	return JSON.stringify({
		contextKey,
		plannedStartMin: Math.round(plannedStartMin * 1000) / 1000,
		blocks: blocks.map(block => ({
			title: block.title,
			minutes: block.minutes,
			note: block.note
		}))
	});
}

export function createFlowExecution(
	blocks: Block[],
	plannedStartMin: number,
	nowMin: number,
	contextKey = ''
): FlowExecutionState {
	const displayStartMin = Math.max(plannedStartMin, Math.floor(nowMin));
	const workStartMin = Math.max(plannedStartMin, nowMin);
	const status: FlowExecutionStatus = blocks.length > 0 ? 'running' : 'complete';
	return {
		planKey: flowPlanKey(blocks, plannedStartMin, contextKey),
		contextKey,
		plannedStartMin,
		displayStartMin,
		blocks: cloneBlocks(blocks),
		allocations: blocks.map(block => Math.max(1, block.minutes)),
		actualMinutes: blocks.map(() => null),
		currentIndex: 0,
		currentStartedAtMin: workStartMin,
		currentWorkedMin: 0,
		runningSinceMin: status === 'running' ? workStartMin : null,
		delayMin: Math.max(0, Math.floor(displayStartMin - plannedStartMin)),
		bufferMinutes: 0,
		restMinutes: 0,
		restStartedAtMin: null,
		status,
		completions: []
	};
}

export function rebindFlowExecutionBlocks(state: FlowExecutionState, blocks: Block[]): FlowExecutionState {
	if (blocks.length !== state.blocks.length) return state;
	const idMap = new Map(state.blocks.map((block, index) => [block.id, blocks[index].id]));
	const nextBlocks = blocks.map(block => ({ ...block }));
	const unchanged = nextBlocks.every((block, index) => block.id === state.blocks[index].id);
	if (unchanged) return state;
	return {
		...state,
		blocks: nextBlocks,
		completions: state.completions.map(completion => ({
			...completion,
			blockId: idMap.get(completion.blockId) ?? completion.blockId
		}))
	};
}

export function currentFlowWorkedMinutes(state: FlowExecutionState, nowMin: number): number {
	const running = state.runningSinceMin === null ? 0 : Math.max(0, nowMin - state.runningSinceMin);
	return Math.max(0, state.currentWorkedMin + running);
}

export function pauseFlowExecution(state: FlowExecutionState, nowMin: number): FlowExecutionState {
	if (state.status !== 'running' || state.runningSinceMin === null) return state;
	return {
		...state,
		currentWorkedMin: currentFlowWorkedMinutes(state, nowMin),
		runningSinceMin: null
	};
}

export function resumeFlowExecution(state: FlowExecutionState, nowMin: number): FlowExecutionState {
	if (state.status !== 'running' || state.runningSinceMin !== null) return state;
	return {
		...state,
		runningSinceMin: nowMin
	};
}

export function completeFlowActivity(
	state: FlowExecutionState,
	blockId: string,
	nowMin: number,
	_options: CompleteFlowActivityOptions = {}
): CompleteFlowActivityResult {
	if (state.status !== 'running') return { state, completion: null };
	const block = state.blocks[state.currentIndex];
	if (!block || block.id !== blockId) return { state, completion: null };

	const plannedMinutes = state.allocations[state.currentIndex];
	const actualMinutes = Math.max(1, Math.round(currentFlowWorkedMinutes(state, nowMin)));
	const savedMinutes = Math.max(0, plannedMinutes - actualMinutes);
	const overrunMinutes = Math.max(0, actualMinutes - plannedMinutes);
	const delayBeforeMin = state.delayMin;
	const caughtUpMinutes = Math.min(delayBeforeMin, savedMinutes);
	const bonusMinutes = savedMinutes - caughtUpMinutes;
	const delayAfterMin = delayBeforeMin - caughtUpMinutes + overrunMinutes;
	const allocations = [...state.allocations];
	const actuals = [...state.actualMinutes];
	actuals[state.currentIndex] = actualMinutes;

	const nextIndex = state.currentIndex + 1;
	const hasNext = nextIndex < state.blocks.length;
	const status: FlowExecutionStatus = hasNext ? 'running' : 'complete';
	const bufferMinutes = state.bufferMinutes + bonusMinutes;

	const completion: FlowCompletion = {
		blockId: block.id,
		title: block.title,
		plannedMinutes,
		actualMinutes,
		startedAtMin: state.currentStartedAtMin,
		completedAtMin: nowMin,
		delayBeforeMin,
		delayAfterMin,
		bonusMinutes
	};

	return {
		state: {
			...state,
			allocations,
			actualMinutes: actuals,
			currentIndex: nextIndex,
			currentStartedAtMin: nowMin,
			currentWorkedMin: 0,
			runningSinceMin: hasNext ? nowMin : null,
			delayMin: delayAfterMin,
			bufferMinutes,
			status,
			completions: [...state.completions, completion]
		},
		completion
	};
}

export function startFlowRest(
	state: FlowExecutionState,
	restMinutes: number,
	startedAtMin: number
): FlowExecutionState {
	const minutes = Math.max(0, restMinutes);
	if (minutes <= 0) return state;
	return {
		...state,
		bufferMinutes: 0,
		restMinutes: minutes,
		restStartedAtMin: startedAtMin,
		status: 'rest',
		runningSinceMin: null
	};
}

export function finishFlowExecution(state: FlowExecutionState): FlowExecutionState {
	return {
		...state,
		bufferMinutes: 0,
		restMinutes: 0,
		restStartedAtMin: null,
		runningSinceMin: null,
		status: 'complete'
	};
}

export function tickFlowExecution(state: FlowExecutionState, nowMin: number): FlowExecutionState {
	if (state.status !== 'rest' || state.restStartedAtMin === null) return state;
	if (nowMin < state.restStartedAtMin + state.restMinutes) return state;
	return { ...state, status: 'complete' };
}

export function flowExecutionBlocks(state: FlowExecutionState, nowMin: number): Block[] {
	const blocks: Block[] = state.blocks.map((block, index) => {
		const actual = state.actualMinutes[index];
		if (actual !== null) return { ...block, minutes: actual, runUntilChecked: false };
		if (index === state.currentIndex && state.status === 'running') {
			const workedMinutes = currentFlowWorkedMinutes(state, nowMin);
			return {
				...block,
				minutes: Math.max(state.allocations[index], Math.floor(workedMinutes) + 1),
				runUntilChecked: true
			};
		}
		return { ...block, minutes: state.allocations[index], runUntilChecked: false };
	});

	if (state.bufferMinutes > 0) {
		blocks.push({
			id: `${state.blocks[0]?.id ?? 'flow'}:buffer`,
			title: '*',
			minutes: state.bufferMinutes,
			note: '',
			warning: false,
			pinned: true
		});
	}

	if (state.restMinutes > 0) {
		blocks.push({
			id: `${state.blocks[0]?.id ?? 'flow'}:rest`,
			title: '*',
			minutes: state.restMinutes,
			note: '',
			warning: false,
			pinned: true
		});
	}

	return blocks;
}

export function activeFlowBlockId(state: FlowExecutionState): string | null {
	if (state.status !== 'running') return null;
	return state.blocks[state.currentIndex]?.id ?? null;
}
