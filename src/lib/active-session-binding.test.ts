import { describe, expect, test } from 'vitest';
import { canWriteActiveSessionBack, nextBindingAfterSectionChange } from './active-session-binding.js';

describe('active session binding', () => {
	test('unscheduled and template sessions do not write back to agenda', () => {
		expect(canWriteActiveSessionBack({
			source: { kind: 'unscheduled' },
			activeSection: 'plan',
			planSelectionExplicit: true,
			forceUpdate: true
		})).toBe(false);

		expect(canWriteActiveSessionBack({
			source: { kind: 'template', templateId: 't1', title: 'Mall' },
			activeSection: 'plan',
			planSelectionExplicit: true,
			forceUpdate: true
		})).toBe(false);
	});

	test('agenda-bound sessions always write back regardless of section or explicit selection', () => {
		const source = { kind: 'agenda' as const, date: '2026-06-03', title: 'Pass', startMin: 9 * 60 };

		expect(canWriteActiveSessionBack({
			source,
			activeSection: 'plan',
			planSelectionExplicit: true,
			forceUpdate: false
		})).toBe(true);

		expect(canWriteActiveSessionBack({
			source,
			activeSection: 'plan',
			planSelectionExplicit: false,
			forceUpdate: false
		})).toBe(true);

		expect(canWriteActiveSessionBack({
			source,
			activeSection: 'now',
			planSelectionExplicit: false,
			forceUpdate: false
		})).toBe(true);
	});

	test('moving from implicit now inspection to plan clears agenda binding', () => {
		expect(nextBindingAfterSectionChange({
			oldSection: 'now',
			nextSection: 'plan',
			planSelectionExplicit: false,
			source: { kind: 'agenda', date: '2026-06-03', title: 'Pass', startMin: 9 * 60 }
		})).toEqual({
			source: { kind: 'unscheduled' },
			activeAgendaFlowRef: null,
			planSelectionExplicit: false,
			resetPlanDraft: true
		});
	});

	test('keeps explicit agenda binding when moving from now to plan', () => {
		expect(nextBindingAfterSectionChange({
			oldSection: 'now',
			nextSection: 'plan',
			planSelectionExplicit: true,
			source: { kind: 'agenda', date: '2026-06-03', title: 'Pass', startMin: 9 * 60 }
		})).toEqual({
			source: { kind: 'agenda', date: '2026-06-03', title: 'Pass', startMin: 9 * 60 },
			activeAgendaFlowRef: 'keep',
			planSelectionExplicit: true,
			resetPlanDraft: false
		});
	});
});
