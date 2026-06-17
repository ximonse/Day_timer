import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { isPrivateHost, safeErrorMessage } from '$lib/server/ai-shared.js';

type Provider = 'anthropic' | 'openai' | 'gemini' | 'custom';

const SYSTEM_PROMPT_BASE = `Du är en assistent som läser klassscheman (svenska skolor) och konverterar dem till Day Timer-agendaformat.

**Agendaformat:**
- Varje dag börjar med en dagtoken: @MÅNDAG, @TISDAG, @ONSDAG, @TORSDAG eller @FREDAG (exakt dessa tokens — ingen annan datumformat)
- Varje pass: #Ämnesnamn HH:MM-HH:MM
- Aktivitetsrader under passet (utan tidformat)
- Sessionskommentar: && klasskod · sal · lärarkod (hoppa över fält som saknas)

**Ämneskoder (expandera alltid till fullständigt namn i #-rubriken):**
SV=Svenska, MA=Matematik, EN=Engelska, NO=Natur och teknik, TK=Teknik, SO=Samhällskunskap,
Slöjd=Slöjd, Bild=Bild, HKK=Hemkunskap, IDR=Idrott, MU=Musik, SVA=Svenska som andraspråk,
ML=Modersmål, SPR=Språkval, BIO=Biologi, FY=Fysik, KE=Kemi, HIS=Historia, RE=Religion,
GEO=Geografi, DA=Data, PR=Programmering

**Regler:**
1. Läs kolumnerna noggrant — varje kolumn är en veckodag (Måndag–Fredag).
2. Använd EXAKT de start- och sluttider som står i schemat.
3. Inga datum i dagtokens — använd @MÅNDAG, @TISDAG osv.
4. Tomma celler = ingen lektion = inget pass den tid.
5. Identifiera raster/lunch ur tidsglapp (15+ min utan lektion) — skriv inte ut dem som pass.
6. Returnera BARA agendatext — inga förklaringar, inga markdown-markeringar, ingen inledning.`;

const STANDARD_PARTS_ADDITION = `
**Standarddelar per lektion (lägg alltid in dessa om inget annat anges):**
- Närvaro 5m (alltid första aktiviteten)
- Arbete (resten av lektionstiden, ingen tidangivelse = opinnad/flytande)
- Avslut/städ 10m (sista aktiviteten; 15m för praktiska ämnen: TK, Slöjd, Bild, HKK, IDR, MU)

**För- och efterarbetspass:**
- Lägg ett "Förberedelse" 20m-pass (med aktiviteten "Planera lektionen 20m") omedelbart FÖRE dagens allra första lektion.
- Lägg ett "Efterarbete" 20m-pass (med aktiviteten "Reflektera och dokumentera 20m") omedelbart EFTER dagens sista lektion.

**Avsluta alltid varje dag med en tom rad.**`;

const RAW_ADDITION = `
**Råa lektioner (inga standarddelar):**
- Skriv varje pass med enbart ämnesnamn och tider — inga aktivitetsrader, inga standarddelar.`;

function buildSystemPrompt(addStandardParts: boolean): string {
  return SYSTEM_PROMPT_BASE + (addStandardParts ? STANDARD_PARTS_ADDITION : RAW_ADDITION);
}

async function callAnthropicVision(
  apiKey: string,
  systemPrompt: string,
  fileData: string,
  mediaType: string
): Promise<string> {
  const client = new Anthropic({ apiKey });

  type ContentBlock =
    | { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'; data: string } }
    | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } }
    | { type: 'text'; text: string };

  let contentBlock: ContentBlock;
  if (mediaType === 'application/pdf') {
    contentBlock = {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: fileData }
    };
  } else {
    const imgType = mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    contentBlock = {
      type: 'image',
      source: { type: 'base64', media_type: imgType, data: fileData }
    };
  }

  const res = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          contentBlock,
          { type: 'text', text: 'Läs schemat och returnera agendatexten.' }
        ]
      },
      {
        role: 'assistant',
        content: [{ type: 'text', text: '@' }]
      }
    ]
  });

  const raw = res.content[0].type === 'text' ? res.content[0].text : '';
  const truncated = res.stop_reason === 'max_tokens';
  return '@' + raw + (truncated ? '\n\n// OBS: svaret verkar avkortat — kontrollera att alla dagar kom med' : '');
}

async function callOpenAIVision(
  apiKey: string,
  systemPrompt: string,
  fileData: string,
  mediaType: string,
  baseUrl?: string,
  model?: string
): Promise<string> {
  if (mediaType === 'application/pdf') {
    throw new Error('OpenAI stöder inte PDF-filer direkt. Ladda upp en bild (JPEG/PNG) istället.');
  }
  const client = new OpenAI({ apiKey, ...(baseUrl ? { baseURL: baseUrl } : {}) });
  const dataUrl = `data:${mediaType};base64,${fileData}`;
  const res = await client.chat.completions.create({
    model: model || 'gpt-4o',
    max_tokens: 8192,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: dataUrl } },
          { type: 'text', text: 'Läs schemat och returnera agendatexten.' }
        ]
      }
    ]
  });
  return res.choices[0]?.message?.content ?? '';
}

async function callGeminiVision(
  apiKey: string,
  systemPrompt: string,
  fileData: string,
  mediaType: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const res = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    config: { systemInstruction: systemPrompt },
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType: mediaType, data: fileData } },
        { text: 'Läs schemat och returnera agendatexten.' }
      ]
    }]
  });
  return res.text ?? '';
}

function extractAgendaText(raw: string): string {
  const s = raw.trim();
  const fenced = s.replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  if (fenced.startsWith('{')) {
    try {
      const parsed = JSON.parse(fenced);
      if (typeof parsed?.text === 'string') return parsed.text.trim();
    } catch { /* fall through */ }
    const m = fenced.match(/"text"\s*:\s*"([\s\S]*?)"\s*[,}]/);
    if (m) return m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
  }
  return fenced;
}

export const POST: RequestHandler = async ({ request }) => {
  const {
    provider = 'anthropic',
    apiKey,
    baseUrl,
    customModel,
    fileData,
    mediaType,
    addStandardParts = true
  } = await request.json() as {
    provider?: Provider;
    apiKey?: string;
    baseUrl?: string;
    customModel?: string;
    fileData: string;
    mediaType: string;
    addStandardParts?: boolean;
  };

  if (!apiKey?.trim()) return json({ error: 'Ingen API-nyckel angiven' }, { status: 400 });
  if (!fileData?.trim()) return json({ error: 'Ingen fil angiven' }, { status: 400 });

  const key = apiKey.trim();
  const systemPrompt = buildSystemPrompt(addStandardParts);

  try {
    let text = '';
    if (provider === 'anthropic') {
      text = await callAnthropicVision(key, systemPrompt, fileData, mediaType);
    } else if (provider === 'openai') {
      text = await callOpenAIVision(key, systemPrompt, fileData, mediaType);
    } else if (provider === 'gemini') {
      text = await callGeminiVision(key, systemPrompt, fileData, mediaType);
    } else {
      if (!baseUrl?.trim()) return json({ error: 'Bas-URL krävs för anpassad provider' }, { status: 400 });
      let parsedUrl: URL;
      try { parsedUrl = new URL(baseUrl.trim()); } catch { return json({ error: 'Ogiltig bas-URL' }, { status: 400 }); }
      if (parsedUrl.protocol !== 'https:') return json({ error: 'Bas-URL måste använda https://' }, { status: 400 });
      if (isPrivateHost(parsedUrl.hostname)) return json({ error: 'Bas-URL pekar på ett otillåtet nätverk' }, { status: 400 });
      text = await callOpenAIVision(key, systemPrompt, fileData, mediaType, parsedUrl.toString(), customModel?.trim() || undefined);
    }

    return json({ text: extractAgendaText(text) });
  } catch (err: unknown) {
    console.error('[api/schedule] vision call failed:', err instanceof Error ? err.message : err);
    return json({ error: safeErrorMessage(err) }, { status: 500 });
  }
};
