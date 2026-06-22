import type { Block } from './state.svelte.js';
import {
	activeFlowBlockId,
	completeFlowActivity,
	createFlowExecution,
	flowExecutionBlocks,
	flowPlanKey,
	rebindFlowExecutionBlocks,
	tickFlowExecution,
	type FlowCompletion,
	type FlowExecutionState
} from './flow-execution.js';

export type ExecutionMode = 'timed' | 'flow';

const MODE_STORAGE_KEY = 'day_timer_execution_mode_v1';
const RUNTIME_STORAGE_KEY = 'day_timer_flow_runtime_v1';

function loadMode(): ExecutionMode {
	if (typeof localStorage === 'undefined') return 'timed';
	return localStorage.getItem(MODE_STORAGE_KEY) === 'flow' ? 'flow' : 'timed';
}

function loadRuntime(): FlowExecutionState | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		const value = JSON.parse(localStorage.getItem(RUNTIME_STORAGE_KEY) || 'null');
		return value && typeof value === 'object' ? value as FlowExecutionState : null;
	} catch {
		return null;
	}
}

export function createFlowRuntime() {
	let mode = $state<ExecutionMode>(loadMode());
	let execution = $state<FlowExecutionState | null>(loadRuntime());

	function persistMode() {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(MODE_STORAGE_KEY, mode);
	}

	function persistExecution() {
		if (typeof localStorage === 'undefined') return;
		if (execution) localStorage.setItem(RUNTIME_STORAGE_KEY, JSON.stringify(execution));
		else localStorage.removeItem(RUNTIME_STORAGE_KEY);
	}

	return {
		get mode() { return mode; },
		get execution() { return execution; },
		get activeBlockId() { return execution ? activeFlowBlockId(execution) : null; },
		get completedBlockIds() { return execution?.completions.map(item => item.blockId) ?? []; },
		setMode(next: ExecutionMode) {
			mode = next;
			if (next === 'timed') execution = null;
			persistMode();
			persistExecution();
		},
		ensureStarted(blocks: Block[], plannedStartMin: number, nowMin: number, contextKey = '') {
			const key = flowPlanKey(blocks, plannedStartMin, contextKey);
			if (!execution || execution.planKey !== key) {
				execution = createFlowExecution(blocks, plannedStartMin, nowMin, contextKey);
				persistExecution();
			} else {
				const rebound = rebindFlowExecutionBlocks(execution, blocks);
				if (rebound !== execution) {
					execution = rebound;
					persistExecution();
				}
			}
			return execution;
		},
		complete(blockId: string, nowMin: number): FlowCompletion | null {
			if (!execution) return null;
			const result = completeFlowActivity(execution, blockId, nowMin);
			execution = result.state;
			persistExecution();
			return result.completion;
		},
		tick(nowMin: number) {
			if (!execution) return;
			const next = tickFlowExecution(execution, nowMin);
			if (next !== execution) {
				execution = next;
				persistExecution();
			}
		},
		displayBlocks(nowMin: number): Block[] {
			return execution ? flowExecutionBlocks(execution, nowMin) : [];
		},
		clear() {
			execution = null;
			persistExecution();
		}
	};
}
