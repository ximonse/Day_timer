export interface AiConversationInput {
	input: string;
	fallback: string;
	seed: string;
	questions: string;
}

export function buildAgendaAiContext(date: string, currentPlan: string) {
	return { date, currentPlan };
}

export function composeAiConversationInput({
	input,
	fallback,
	seed,
	questions
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

	return answer || fallback.trim();
}
