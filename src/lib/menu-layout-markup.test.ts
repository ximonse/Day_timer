import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const pageSource = readFileSync('src/routes/+page.svelte', 'utf8');
const layoutSource = readFileSync('src/routes/+layout.svelte', 'utf8');
const librarySource = readFileSync('src/lib/components/LibraryPanel.svelte', 'utf8');
const workspaceSource = readFileSync('src/lib/components/WorkspacePanel.svelte', 'utf8');

describe('wide menu layout markup', () => {
	test('widens library and workspace menus without widening now', () => {
		expect(pageSource).toContain("class:controls--wide={activeSection === 'library' || activeSection === 'workspace'}");
		expect(pageSource).toContain("class:mini-menu-shell--wide={activeSection === 'library' || activeSection === 'workspace'}");
		expect(pageSource).not.toContain("activeSection === 'now' || activeSection === 'library'");
		expect(layoutSource).toContain('.controls--wide');
		expect(layoutSource).toContain('.mini-menu-shell--wide');
	});

	test('keeps wide and planner menus wide on touch and portrait layouts', () => {
		expect(layoutSource).toContain('.mini-menu-shell.mini-menu-shell--planner');
		expect(layoutSource).toContain('.mini-menu-shell.mini-menu-shell--wide');
		expect(layoutSource).toContain('width: min(760px, 100%)');
	});

	test('organizes library and workspace panels as workspaces', () => {
		expect(librarySource).toContain('library-menu-workspace');
		expect(librarySource).toContain('library-menu-primary');
		expect(librarySource).toContain('library-menu-list');
		expect(workspaceSource).toContain('workspace-menu-workspace');
		expect(workspaceSource).toContain('workspace-menu-account');
		expect(workspaceSource).toContain('workspace-menu-ai');
	});
});
