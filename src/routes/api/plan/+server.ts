import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { env } from '$env/dynamic/private';

type Provider = 'anthropic' | 'openai' | 'gemini' | 'custom';
type PlanMode = 'strict' | 'helpful';

const PARTS_STRICT = `Du är en assistent som formaterar aktivitetslistor för en visuell timer.

Returnera BARA en färdig lista i det här formatet — inget annat, inga förklaringar:

Frukost 20m

Promenad 30m
- ta med nycklar

& Kom ihåg: möte kl 9.

Regler:
- Inkludera EXAKT de aktiviteter användaren nämner — lägg inte till, ta inte bort något
- Om användaren anger en tid, använd den. Om inte, uppskatta realistiskt
- Namn på svenska, korta (max 3 ord)
- Underpunkter börjar med - och har ingen tid
- Ny rad mellan varje aktivitet
- Kommentarer börjar med & i början av raden
- Inga rubriker, ingen inledning, ingen avslutning — bara listan`;

const PARTS_HELPFUL = `Du är en assistent som hjälper användaren planera en session (timmen eller mindre).
Användaren beskriver vad de ska göra — hur informellt som helst.

Returnera BARA en färdig lista i det här formatet — inget annat, inga förklaringar:

Vakna 5m

Toa 5m
- ta med telefonen

Medicin 2m

Frukost 20m
- kolla inte skärm

Paus 5m

& Kom ihåg att det är möte kl 9.

Regler:
- Realistiska minutuppskattningar — hellre lite generöst än för snävt
- Rimlig ordning (t.ex. vakna → toa → medicin → frukost)
- Lägg till 2–3 aktiviteter om användaren troligen glömt men som passar (t.ex. toa, förberedelse, ställtid)
- Lägg in en kort paus (3–5m) om sessionen är 45 min eller längre
- Lägg till en minut eller två ställtid om det är aktiviteter som kräver förberedelse eller förflyttning
- Namn på svenska, korta (max 3 ord)
- Underpunkter börjar med - och har ingen tid
- Ny rad mellan varje aktivitet
- Kommentarer börjar med & i början av raden
- Inga rubriker, ingen inledning, ingen avslutning — bara listan`;

function agendaStrictPrompt(todayISO: string): string {
  return `Du är en assistent som formaterar dagplaner för en visuell timer.
Dagens datum är ${todayISO}.

Returnera BARA en dagplan i exakt det här formatet — inget annat, inga förklaringar:

@${todayISO.replace(/-/g, '').slice(2)}
#Morgonrutin 07:00
Vakna 5m
Frukost 20m

#Arbetspass 09:00
Djuparbete 90m

& Möte kl 14

Regler:
- Inkludera EXAKT de sessioner och aktiviteter användaren nämner — lägg inte till, ta inte bort
- Om starttid anges, använd den. Om inte, uppskatta rimligt
- Om tider saknas, uppskatta realistiskt per aktivitet
- @YYMMDD för datum, #Rubrik HH:MM för session (rubrik max 3 ord)
- Aktiviteter med tid: Aktivitet Nm. Underpunkter: - notering
- Kommentarer för hela dagen börjar med &
- Namn på svenska, korta (max 3 ord)
- Inga förklaringar, ingen inledning — bara planen`;
}

function agendaHelpfulPrompt(todayISO: string): string {
  return `Du är en assistent som hjälper användaren planera hela eller delar av en dag.
Användaren beskriver sina aktiviteter och sessioner — hur informellt som helst.
Dagens datum är ${todayISO}.

Returnera BARA en dagplan i exakt det här formatet — inget annat, inga förklaringar:

@${todayISO.replace(/-/g, '').slice(2)}
#Morgonrutin 07:00
Vakna 5m
Toa 5m
Frukost 20m
- kolla inte skärm
Förberedelse 10m

#Arbetspass 09:00
Planering 10m
Epost 20m
Djuparbete 60m
- stäng av notiser
Paus 10m
Uppföljning 15m

& Glöm inte: möte kl 14

Regler:
- Realistiska minutuppskattningar — hellre lite generöst än för snävt
- @YYMMDD för datum, #Rubrik HH:MM för session (rubrik max 3 ord)
- Lägg in ställtid och förberedelse om aktiviteten kräver det
- Lägg till en paus (5–10m) i sessioner som är 60 min eller längre
- Lägg till korta övergångsaktiviteter om användaren hoppar mellan olika saker
- Rimlig ordning med pauser och återhämtning — en dag ska vara hållbar
- Aktiviteter med tid: Aktivitet Nm. Underpunkter: - notering (ingen tid)
- Kommentarer för hela dagen börjar med &
- Namn på svenska, korta (max 3 ord)
- Inga förklaringar, ingen inledning — bara planen`;
}

async function callAnthropic(apiKey: string, systemPrompt: string, message: string): Promise<string> {
  const key = env.ANTHROPIC_API_KEY || apiKey;
  const client = new Anthropic({ apiKey: key });
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

export const POST: RequestHandler = async ({ request }) => {
  const { provider = 'anthropic', apiKey, message, mode, planMode = 'helpful', context, baseUrl, customModel } = await request.json() as {
    provider?: Provider;
    apiKey?: string;
    message: string;
    mode: 'parts' | 'agenda';
    planMode?: PlanMode;
    context?: { startMin?: number; date?: string };
    baseUrl?: string;
    customModel?: string;
  };

  if (!apiKey?.trim() && provider !== 'anthropic') return json({ error: 'Ingen API-nyckel angiven' }, { status: 400 });
  if (!message?.trim()) return json({ error: 'Inget meddelande' }, { status: 400 });

  const todayISO = context?.date ?? new Date().toISOString().slice(0, 10);
  let systemPrompt: string;
  if (mode === 'agenda') {
    systemPrompt = planMode === 'strict' ? agendaStrictPrompt(todayISO) : agendaHelpfulPrompt(todayISO);
  } else {
    systemPrompt = planMode === 'strict' ? PARTS_STRICT : PARTS_HELPFUL;
  }

  const key = apiKey?.trim() ?? '';

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
      text = await callOpenAI(key, systemPrompt, message, parsedUrl.toString(), customModel?.trim() || undefined);
    }
    return json({ text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Okänt fel';
    return json({ error: msg }, { status: 500 });
  }
};
