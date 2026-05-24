import { describe, expect, test } from 'vitest';
import { getAiPromptAgenda } from './ai.js';

describe('ai prompt helpers', () => {
	test('agenda prompt includes the concrete compact date', () => {
		const prompt = getAiPromptAgenda('2026-05-25');

		expect(prompt).toContain('@260525');
		expect(prompt).not.toContain('${todayISO');
	});
});
