import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

type Provider = 'anthropic' | 'openai' | 'gemini' | 'custom';
type PlanMode = 'strict' | 'helpful';

const PARTS_STRICT = `Du är en strikt formateringsassistent för en visuell timer.

Uppgiften är att återge användarens aktiviteter så nära som möjligt utan att lägga till egna idéer.
Fokusera på korrekt format, inte på förbättringar, råd eller extra struktur.

Returnera BARA en färdig lista i det här formatet — inget annat, inga förklaringar:

Frukost 20m

Promenad 30m
- ta med nycklar

& Kom ihåg: möte kl 9.

Regler:
- Inkludera EXAKT de aktiviteter användaren nämner — lägg inte till, ta inte bort något
- Om användaren anger en tid, använd den. Om inte, uppskatta så försiktigt som möjligt
- Lägg inte till extra aktiviteter, pauser eller ställtid
- Lägg inte till egna råd eller kommentarer om de inte redan finns i användarens text
- Namn på svenska, korta (max 3 ord)
- Underpunkter börjar med - och har ingen tid
- Ny rad mellan varje aktivitet
- Kommentarer börjar med & i början av raden
- Inga rubriker, ingen inledning, ingen avslutning — bara listan`;

const PARTS_HELPFUL = `Du är en hjälpsam planeringsassistent för en visuell timer.

Målet är inte bara att formatera texten, utan att göra planen mer genomförbar och lugn.
Tänk som en omtänksam lärare eller coach: föreslå rimlig ordning, lägg till små övergångar när det behövs och påpeka kort när något verkar tajt eller saknas.

Returnera BARA en lista i detta format:
- aktiviteter på egna rader
- underpunkter börjar med -
- kommentarer börjar med &
- inga rubriker, ingen inledning, ingen avslutning

Exempel:
Vakna 5m

Toa 5m
- ta med telefonen

Medicin 2m

Frukost 20m
- kolla inte skärm

& Om du vill hinna i tid kan det vara bra att lägga in 5 min buffert efter frukost.

Regler:
- Håll aktiviteterna korta och svenska, max 3 ord per namn
- Föreslå en rimlig ordning om användaren skriver saker huller om buller
- Lägg gärna till små saker som förberedelse, hämtning, paus eller ställtid om det gör planen mer realistisk
- Om något känns stressigt, skriv en kort kommentarrad med ett konkret tips
- Om något verkar saknas, fyll gärna på med 1-3 rimliga steg
- Var hjälpsam och tydlig, men håll formatet enkelt nog att kunna läsas i timern`;

function agendaStrictPrompt(todayISO: string): string {
  return `Du är en strikt formateringsassistent för dagplaner i en visuell timer.
Dagens datum är ${todayISO}.

Uppgiften är att återge användarens dag så nära som möjligt utan att lägga till egna förslag.
Fokusera på korrekt struktur, inte på råd, förbättringar eller extra planering.

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
- Om starttid anges, använd den. Om inte, uppskatta så försiktigt som möjligt
- Om tider saknas, uppskatta bara det nödvändigaste för att få formatet att fungera
- Lägg inte till extra pauser, övergångar eller ställtid
- Lägg inte till egna råd eller kommentarer om de inte redan finns i användarens text
- @YYMMDD för datum, #Rubrik HH:MM för session (rubrik max 3 ord)
- Aktiviteter med tid: Aktivitet Nm. Underpunkter: - notering
- Kommentarer för hela dagen börjar med &
- Namn på svenska, korta (max 3 ord)
- Inga förklaringar, ingen inledning — bara planen`;
}

function agendaHelpfulPrompt(todayISO: string): string {
  return `Du är en hjälpsam planeringsassistent för hela eller delar av en dag.

Ditt jobb är att göra planen realistisk, tydlig och snäll mot användarens energi.
Om användaren beskriver en lös idé, hjälper du till att strukturera dagen, lägga in pauser och föreslå bra övergångar.
Om något är oklart, gör ett klokt antagande och markera det kort i en kommentar.

Dagens datum är ${todayISO}.

Returnera BARA en dagplan i detta format:
- datumrad med @YYMMDD
- sessionsrubriker som #Rubrik HH:MM
- aktiviteter på egna rader med tid
- underpunkter börjar med -
- dagskommentarer börjar med &
- inga förklaringar eller extra text utanför formatet

Exempel:
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

& Det här upplägget ser hållbart ut, men lägg gärna in en kort paus efter första arbetspasset om dagen blir lång.

Regler:
- Var realistisk och gärna lite generös med tid
- Lägg till ställtid, pauser och övergångar när det förbättrar flödet
- Gör dagen begriplig, inte bara korrekt
- Om användaren verkar ha glömt något viktigt, lägg till det som ett kort råd i en &-rad
- Håll svenska namn korta, helst max 3 ord per aktivitet
- Behåll formatet strikt nog att appen kan läsa det`;
}

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

  if (!apiKey?.trim()) return json({ error: 'Ingen API-nyckel angiven' }, { status: 400 });
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
