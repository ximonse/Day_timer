import { describe, expect, it } from 'vitest';
import { getAiSessionPrompt, getAiAgendaPrompt } from './ai.js';
import type { AiAgendaPromptMode } from './ai-plan-engine.js';

const MODES: AiAgendaPromptMode[] = ['notes', 'calendar', 'strict-format', 'helpful-questions'];
const TODAY = '2026-06-26';

describe('AI prompt format contract', () => {
  for (const mode of MODES) {
    it(`session-prompten (${mode}) lär ut passformatet parse.ts läser`, () => {
      const prompt = getAiSessionPrompt(mode, TODAY, 30);
      expect(prompt).toMatch(/\d+\s*m/);
      expect(prompt).toContain('-');
      expect(prompt).toContain('&&');
    });

    it(`agenda-prompten (${mode}) lär ut dagformatet parse.ts läser`, () => {
      const prompt = getAiAgendaPrompt(mode, TODAY);
      expect(prompt).toContain('@');
      expect(prompt).toContain('#');
      expect(prompt).toContain('-');
      expect(prompt).toContain('&&');
    });
  }
});
