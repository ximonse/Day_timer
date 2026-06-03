import type { AgendaFlowRef } from './agenda.js';
import type { SessionSource } from './session-agenda-binding.js';
import type { AppSection } from './state.svelte.js';

export interface CanWriteBackInput {
	source: SessionSource;
	activeSection: AppSection;
	planSelectionExplicit: boolean;
	forceUpdate: boolean;
}

export function canWriteActiveSessionBack(input: CanWriteBackInput): boolean {
	if (input.source.kind !== 'agenda') return false;
	if (input.forceUpdate) return true;
	return input.activeSection === 'plan' && input.planSelectionExplicit;
}

export interface SectionChangeBindingInput {
	oldSection: AppSection;
	nextSection: AppSection;
	planSelectionExplicit: boolean;
	source: SessionSource;
}

export interface SectionChangeBindingResult {
	source: SessionSource;
	activeAgendaFlowRef: AgendaFlowRef | null | 'keep';
	planSelectionExplicit: boolean;
	resetPlanDraft: boolean;
}

export function nextBindingAfterSectionChange(input: SectionChangeBindingInput): SectionChangeBindingResult {
	if (
		input.oldSection === 'now' &&
		input.nextSection === 'plan' &&
		!input.planSelectionExplicit &&
		input.source.kind === 'agenda'
	) {
		return {
			source: { kind: 'unscheduled' },
			activeAgendaFlowRef: null,
			planSelectionExplicit: false,
			resetPlanDraft: true
		};
	}

	return {
		source: input.source,
		activeAgendaFlowRef: 'keep',
		planSelectionExplicit: input.planSelectionExplicit,
		resetPlanDraft: false
	};
}
