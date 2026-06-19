import { serializeSelectedAgendaDay } from './agenda.js';
import { parseAgenda } from './parse.js';

export interface AiConversationInput {
	input: string;
	fallback: string;
	seed: string;
	questions: string;
	allowFallback?: boolean;
}

export function buildAgendaAiContext(date: string, currentPlan: string) {
	return { date, currentPlan };
}

export function buildAgendaAiDraftText(targetDate: string, aiPlanText: string): string {
	const days = parseAgenda(aiPlanText).map(day => day.date === null ? { ...day, date: targetDate } : day);
	return serializeSelectedAgendaDay(targetDate, days, { includeIds: false });
}

export function composeAiConversationInput({
	input,
	fallback,
	seed,
	questions,
	allowFallback = true
}: AiConversationInput): string {
	const answer = input.trim();
	const original = seed.trim();
	const pendingQuestions = questions.trim();

	if (original && pendingQuestions && answer) {
		return [
			'Ursprunglig instruktion:',
			original,
			'',
			'AI-frågor:',
			pendingQuestions,
			'',
			'Användarens svar:',
			answer
		].join('\n');
	}

	return answer || (allowFallback ? fallback.trim() : '');
}
