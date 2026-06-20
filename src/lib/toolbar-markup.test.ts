import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const pageSource = readFileSync('src/routes/+page.svelte', 'utf8');

describe('mini toolbar markup', () => {
	test('keeps only current toolbar controls and clear state labels', () => {
		expect(pageSource).not.toContain('Skapa och planera timers');
		expect(pageSource).not.toContain('Widget-läge');
		expect(pageSource).not.toContain('>⊡</button>');
		expect(pageSource).toContain("{s.clockSpan === 720 ? '1h' : '12h'}");
		expect(pageSource).toContain("{locked ? '🔒' : '🔓'}");
	});
});
