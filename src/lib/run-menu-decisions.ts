import type { AppSection } from './state.svelte.js';
import type { SessionSource } from './session-agenda-binding.js';

export interface RunMenuSnapshot {
	section: AppSection;
	locked: boolean;
	agendaOpen: boolean;
	agendaInputOpen: boolean;
	agendaCalendarOpen: boolean;
}

export interface DecideRunMenuCloseInput {
	currentSection: AppSection;
	locked: boolean;
	agendaOpen: boolean;
	agendaInputOpen: boolean;
	agendaCalendarOpen: boolean;
	hasRunnableSession: boolean;
}

export function decideRunMenuClose(input: DecideRunMenuCloseInput) {
	const snapshot: RunMenuSnapshot = {
		section: input.currentSection,
		locked: input.locked,
		agendaOpen: input.agendaOpen,
		agendaInputOpen: input.agendaInputOpen,
		agendaCalendarOpen: input.agendaCalendarOpen
	};
	if (!input.hasRunnableSession) {
		return {
			action: 'stay-open' as const,
			snapshot: null,
			locked: false,
			miniMenuOpen: true,
			showControls: true,
			mobileTab: 'now' as AppSection,
			persistRunMode: false
		};
	}
	return {
		action: 'enter-run' as const,
		snapshot,
		locked: true,
		miniMenuOpen: false,
		showControls: false,
		persistRunMode: true
	};
}

export interface DecideRunMenuOpenInput {
	currentSection: AppSection;
	sessionSourceKind: SessionSource['kind'];
	snapshot: RunMenuSnapshot | null;
}

export type RunMenuOpenDecision =
	| {
		action: 'open-menu';
		sectionToRestore: AppSection | null;
		snapshotToRestore: RunMenuSnapshot | null;
		clearSnapshot: boolean;
		locked: false;
		miniMenuOpen: true;
		showControls: true;
		persistRunMode: false;
		keepInspectedAgendaBlock: false;
	}
	| {
		action: 'open-menu';
		sectionToRestore: null;
		snapshotToRestore: RunMenuSnapshot | null;
		clearSnapshot: boolean;
		locked: false;
		miniMenuOpen: true;
		showControls: true;
		persistRunMode: false;
		keepInspectedAgendaBlock: true;
		agendaOpen: true;
		agendaInputOpen: true;
		planSelectionExplicit: true;
	};

export function decideRunMenuOpen(input: DecideRunMenuOpenInput): RunMenuOpenDecision {
	const keepInspectedAgendaBlock = input.sessionSourceKind === 'agenda' && input.currentSection === 'plan';
	if (keepInspectedAgendaBlock) {
		return {
			action: 'open-menu',
			sectionToRestore: null,
			snapshotToRestore: input.snapshot,
			clearSnapshot: Boolean(input.snapshot),
			locked: false,
			miniMenuOpen: true,
			showControls: true,
			persistRunMode: false,
			keepInspectedAgendaBlock: true,
			agendaOpen: true,
			agendaInputOpen: true,
			planSelectionExplicit: true
		};
	}
	return {
		action: 'open-menu',
		sectionToRestore: input.snapshot && input.currentSection !== input.snapshot.section
			? input.snapshot.section
			: null,
		snapshotToRestore: input.snapshot,
		clearSnapshot: Boolean(input.snapshot),
		locked: false,
		miniMenuOpen: true,
		showControls: true,
		persistRunMode: false,
		keepInspectedAgendaBlock: false
	};
}
