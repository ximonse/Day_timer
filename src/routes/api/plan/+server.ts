import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { buildAiPlanSystemPrompt, normalizeAiPlanResponse, reviewAiPlanResponse, type AiPlanIntent, type AiPlanningMode } from '$lib/ai-plan-engine.js';

type Provider = 'anthropic' | 'openai' | 'gemini' | 'custom';
type PlanMode = 'strict' | 'helpful';

async function callAnthropic(apiKey: string, systemPrompt: string, message: string): Promise<string> {
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: message }]
  });
  return res.content[0].type === 'text' ? res.content[0].text : '';
}

async function callOpenAI(apiKey: string, systemPrompt: string, message: string, baseUrl?: string, model?: string): Promise<string> {
  const client = new OpenAI({ apiKey, ...(baseUrl ? { baseURL: baseUrl } : {}) });
  const res = await client.chat.completions.create({
    model: model || 'gpt-4o-mini',
    max_tokens: 1024,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ]
  });
  return res.choices[0]?.message?.content ?? '';
}

async function callGemini(apiKey: string, systemPrompt: string, message: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const res = await ai.models.generateContent({
    model: 'gemini-2.0-flash-lite',
    config: { systemInstruction: systemPrompt },
    contents: message
  });
  return res.text ?? '';
}

const PRIVATE_IP = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^fc/i,
  /^fe80/i,
  /^0\./,
];

function isPrivateHost(hostname: string): boolean {
  const h = hostname.replace(/^\[|\]$/g, '');
  return PRIVATE_IP.some(r => r.test(h));
}

function safeErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return 'Okänt fel';
  const m = err.message.toLowerCase();
  if (m.includes('401') || m.includes('unauthorized') || m.includes('invalid api key') || m.includes('incorrect api key')) return 'Ogiltig API-nyckel';
  if (m.includes('429') || m.includes('rate limit') || m.includes('quota')) return 'För många förfrågningar — försök igen om en stund';
  if (m.includes('403') || m.includes('forbidden')) return 'Åtkomst nekad av AI-tjänsten';
  if (m.includes('timeout') || m.includes('timed out')) return 'AI-tjänsten svarade inte i tid';
  if (m.includes('network') || m.includes('fetch') || m.includes('econnrefused')) return 'Kunde inte nå AI-tjänsten';
  return 'AI-tjänsten svarade med ett fel';
}

function planningModeFromInput(mode: 'parts' | 'agenda', value: AiPlanningMode | undefined): AiPlanningMode {
  if (value === 'fixed-session' || value === 'anchored-day' || value === 'free-day') return value;
  return mode === 'parts' ? 'fixed-session' : 'anchored-day';
}

function intentFromInput(value: string | undefined): AiPlanIntent {
  return value === 'create' ? value : 'create';
}

export const POST: RequestHandler = async ({ request }) => {
  const { provider = 'anthropic', apiKey, message, mode, planMode = 'helpful', context, baseUrl, customModel, planningMode: bodyPlanningMode, intent: bodyIntent } = await request.json() as {
    provider?: Provider;
    apiKey?: string;
    message: string;
    mode: 'parts' | 'agenda';
    planMode?: PlanMode;
    context?: { startMin?: number; endMin?: number; totalMin?: number; date?: string; currentPlan?: string; dayTitle?: string; extraInfo?: string };
    baseUrl?: string;
    customModel?: string;
    planningMode?: AiPlanningMode;
    intent?: string;
  };

  if (!apiKey?.trim()) return json({ error: 'Ingen API-nyckel angiven' }, { status: 400 });
  if (!message?.trim()) return json({ error: 'Inget meddelande' }, { status: 400 });

  const todayISO = context?.date ?? new Date().toISOString().slice(0, 10);
  const planningMode = planningModeFromInput(mode, bodyPlanningMode);
  const intent = intentFromInput(bodyIntent);
  const systemPrompt = buildAiPlanSystemPrompt({
    planningMode,
    intent,
    planMode,
    userInput: message,
    currentPlan: context?.currentPlan,
    timeFrame: {
      startMin: context?.startMin,
      endMin: context?.endMin,
      totalMin: context?.totalMin,
      date: todayISO
    },
    workspaceContext: {
      mode: mode === 'parts' ? 'plan' : 'agenda',
      dayTitle: context?.dayTitle,
      extraInfo: context?.extraInfo
    }
  });

  const key = apiKey.trim();

  try {
    let text = '';
    if (provider === 'anthropic') {
      text = await callAnthropic(key, systemPrompt, message);
    } else if (provider === 'openai') {
      text = await callOpenAI(key, systemPrompt, message);
    } else if (provider === 'gemini') {
      text = await callGemini(key, systemPrompt, message);
    } else {
      if (!baseUrl?.trim()) return json({ error: 'Bas-URL krävs för anpassad provider' }, { status: 400 });
      let parsedUrl: URL;
      try { parsedUrl = new URL(baseUrl.trim()); } catch { return json({ error: 'Ogiltig bas-URL' }, { status: 400 }); }
      if (parsedUrl.protocol !== 'https:') return json({ error: 'Bas-URL måste använda https://' }, { status: 400 });
      if (isPrivateHost(parsedUrl.hostname)) return json({ error: 'Bas-URL pekar på ett otillåtet nätverk' }, { status: 400 });
      text = await callOpenAI(key, systemPrompt, message, parsedUrl.toString(), customModel?.trim() || undefined);
    }
    const normalized = normalizeAiPlanResponse(text);
    const reviewed = reviewAiPlanResponse(normalized, {
      planningMode,
      contextMode: mode === 'parts' ? 'plan' : 'agenda'
    });
    return json(reviewed);
  } catch (err: unknown) {
    console.error('[api/plan] AI call failed:', err instanceof Error ? err.message : err);
    return json({ error: safeErrorMessage(err) }, { status: 500 });
  }
};
