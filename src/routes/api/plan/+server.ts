import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { buildAiPlanSystemPrompt, normalizeAiPlanResponse, reviewAiPlanResponse, type AiAgendaPromptMode, type AiPlanIntent, type AiPlanningMode } from '$lib/ai-plan-engine.js';
import { isPrivateHost, safeErrorMessage } from '$lib/server/ai-shared.js';

type Provider = 'anthropic' | 'openai' | 'gemini' | 'custom';
type PlanMode = 'strict' | 'helpful';

async function callAnthropic(apiKey: string, systemPrompt: string, message: string): Promise<string> {
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: message }]
  });
  return res.content[0].type === 'text' ? res.content[0].text : '';
}

async function callOpenAI(apiKey: string, systemPrompt: string, message: string, baseUrl?: string, model?: string, jsonMode = false): Promise<string> {
  const client = new OpenAI({ apiKey, ...(baseUrl ? { baseURL: baseUrl } : {}) });
  const res = await client.chat.completions.create({
    model: model || 'gpt-4o-mini',
    max_tokens: 4096,
    ...(jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
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
    config: { systemInstruction: systemPrompt, responseMimeType: 'application/json' },
    contents: message
  });
  return res.text ?? '';
}


function planningModeFromInput(mode: 'parts' | 'agenda', value: AiPlanningMode | undefined): AiPlanningMode {
  if (value === 'fixed-session' || value === 'anchored-day' || value === 'free-day') return value;
  return mode === 'parts' ? 'fixed-session' : 'anchored-day';
}

function intentFromInput(value: string | undefined): AiPlanIntent {
  return value === 'create' ? value : 'create';
}

export const POST: RequestHandler = async ({ request }) => {
  const { provider = 'anthropic', apiKey, message, mode, planMode = 'helpful', context, baseUrl, customModel, planningMode: bodyPlanningMode, intent: bodyIntent, agendaPromptMode } = await request.json() as {
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
    agendaPromptMode?: AiAgendaPromptMode;
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
    agendaPromptMode,
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
      text = await callOpenAI(key, systemPrompt, message, undefined, undefined, true);
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
      contextMode: mode === 'parts' ? 'plan' : 'agenda',
      userInput: message
    });
    return json(reviewed);
  } catch (err: unknown) {
    console.error('[api/plan] AI call failed:', err instanceof Error ? err.message : err);
    return json({ error: safeErrorMessage(err) }, { status: 500 });
  }
};
