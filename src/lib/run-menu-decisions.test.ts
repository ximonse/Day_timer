import { describe, expect, test } from 'vitest';
import { decideRunMenuClose, decideRunMenuOpen, type RunMenuSnapshot } from './run-menu-decisions.js';

const snapshot: RunMenuSnapshot = {
	section: 'plan',
	locked: false,
	agendaOpen: true,
	agendaInputOpen: true,
	agendaCalendarOpen: false
};

describe('run menu decisions', () => {
	test('entering run mode with no runnable session keeps menu open and clears snapshot', () => {
		expect(decideRunMenuClose({
			currentSection: 'plan',
			locked: false,
			agendaOpen: true,
			agendaInputOpen: true,
			agendaCalendarOpen: false,
			hasRunnableSession: false
		})).toEqual({
			action: 'stay-open',
			snapshot: null,
			locked: false,
			miniMenuOpen: true,
			showControls: true,
			mobileTab: 'now',
			persistRunMode: false
		});
	});

	test('entering run mode with runnable session stores snapshot and locks', () => {
		expect(decideRunMenuClose({
			currentSection: 'plan',
			locked: false,
			agendaOpen: true,
			agendaInputOpen: true,
			agendaCalendarOpen: false,
			hasRunnableSession: true
		})).toEqual({
			action: 'enter-run',
			snapshot,
			locked: true,
			miniMenuOpen: false,
			showControls: false,
			persistRunMode: true
		});
	});

	test('opening menu restores previous snapshot when not inspecting an agenda block', () => {
		expect(decideRunMenuOpen({
			currentSection: 'now',
			sessionSourceKind: 'unscheduled',
			snapshot
		})).toEqual({
			action: 'open-menu',
			sectionToRestore: 'plan',
			snapshotToRestore: snapshot,
			clearSnapshot: true,
			locked: false,
			miniMenuOpen: true,
			showControls: true,
			persistRunMode: false,
			keepInspectedAgendaBlock: false
		});
	});

	test('opening menu keeps inspected agenda block editable in plan mode', () => {
		expect(decideRunMenuOpen({
			currentSection: 'plan',
			sessionSourceKind: 'agenda',
			snapshot
		})).toEqual({
			action: 'open-menu',
			sectionToRestore: null,
			snapshotToRestore: snapshot,
			clearSnapshot: true,
			locked: false,
			miniMenuOpen: true,
			showControls: true,
			persistRunMode: false,
			keepInspectedAgendaBlock: true,
			agendaOpen: true,
			agendaInputOpen: true,
			planSelectionExplicit: true
		});
	});
});
