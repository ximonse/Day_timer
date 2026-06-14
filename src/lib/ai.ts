import { type Flow } from './state.svelte.js';
import { readSessionValue, writeSessionValue, removeSessionValue } from './storage.js';
import type { AiAgendaPromptMode, AiPlanIntent, AiPlanningMode, AiPlanResponse } from './ai-plan-engine.js';

export type AiProvider = 'anthropic' | 'openai' | 'gemini' | 'custom';
export type AiPlanMode = 'strict' | 'helpful';

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  baseUrl: string;
  customModel: string;
  planMode: AiPlanMode;
  rememberApiKey: boolean;
}

export type PersistedAiConfig = Omit<AiConfig, 'apiKey'>;

export const DEFAULT_AI_CONFIG: AiConfig = {
  provider: 'anthropic',
  apiKey: '',
  baseUrl: '',
  customModel: '',
  planMode: 'helpful',
  rememberApiKey: false
};

const AI_CONFIG_STORAGE = 'daytimer_ai_config';
const AI_KEY_SESSION_STORAGE = 'daytimer_ai_api_key';
const AI_KEY_PERSIST_STORAGE = 'daytimer_ai_api_key_persisted';
const AI_KEY_LEGACY_STORAGE = 'daytimer_ai_key';

export function loadAiConfig(): AiConfig {
  let config: AiConfig = { ...DEFAULT_AI_CONFIG };
  const savedConfig = localStorage.getItem(AI_CONFIG_STORAGE);
  if (savedConfig) {
    try { config = { ...config, ...JSON.parse(savedConfig) }; } catch { /* ignore */ }
  }
  const savedKey = config.rememberApiKey
    ? localStorage.getItem(AI_KEY_PERSIST_STORAGE) ?? readSessionValue(AI_KEY_SESSION_STORAGE) ?? localStorage.getItem(AI_KEY_LEGACY_STORAGE)
    : readSessionValue(AI_KEY_SESSION_STORAGE) ?? localStorage.getItem(AI_KEY_LEGACY_STORAGE);
  if (savedKey) {
    config = { ...config, apiKey: savedKey };
    if (config.rememberApiKey) localStorage.setItem(AI_KEY_PERSIST_STORAGE, savedKey);
    else writeSessionValue(AI_KEY_SESSION_STORAGE, savedKey);
    localStorage.removeItem(AI_KEY_LEGACY_STORAGE);
  }
  return config;
}

export function persistAiConfig(config: AiConfig): void {
  const persistedConfig: PersistedAiConfig = {
    provider: config.provider,
    baseUrl: config.baseUrl,
    customModel: config.customModel,
    planMode: config.planMode,
    rememberApiKey: config.rememberApiKey
  };
  localStorage.setItem(AI_CONFIG_STORAGE, JSON.stringify(persistedConfig));
  if (config.apiKey.trim()) {
    if (config.rememberApiKey) {
      localStorage.setItem(AI_KEY_PERSIST_STORAGE, config.apiKey);
      removeSessionValue(AI_KEY_SESSION_STORAGE);
    } else {
      writeSessionValue(AI_KEY_SESSION_STORAGE, config.apiKey);
      localStorage.removeItem(AI_KEY_PERSIST_STORAGE);
    }
  } else {
    removeSessionValue(AI_KEY_SESSION_STORAGE);
    localStorage.removeItem(AI_KEY_PERSIST_STORAGE);
  }
  localStorage.removeItem(AI_KEY_LEGACY_STORAGE);
}

export function clearStoredAiConfig(): void {
  localStorage.removeItem(AI_CONFIG_STORAGE);
  localStorage.removeItem(AI_KEY_LEGACY_STORAGE);
  localStorage.removeItem(AI_KEY_PERSIST_STORAGE);
  removeSessionValue(AI_KEY_SESSION_STORAGE);
}

const sessionLengthNote = (totalMin?: number) =>
  typeof totalMin === 'number' && totalMin > 0
    ? `Passet är ungefär ${totalMin} minuter långt – sikta på att helheten ryms inom den ramen.\n\n`
    : '';

export const getAiPromptParts = (totalMin?: number) => `Du är en hjälpsam planeringsassistent för en visuell timer.

Målet är inte bara att formatera texten, utan att göra planen mer genomförbar och lugn.
Tänk som en omtänksam lärare eller coach: föreslå rimlig ordning, lägg till små övergångar när det behövs och påpeka kort när något verkar tajt eller saknas.

${sessionLengthNote(totalMin)}Returnera BARA en lista i detta format:
- aktiviteter på egna rader, tid i minuter (t.ex. 20m) – tid är valfri, appen fördelar automatiskt
- en enda emoji som titel visas stor i klockans sektor
- underpunkter börjar med -
- passkommentarer längst ner börjar med &&
- inga rubriker, ingen inledning, ingen avslutning

Exempel:
Vakna 5m

Toa 5m
- ta med telefonen

Medicin 2m

Frukost 20m
- kolla inte skärm

&& Passet är lugnast om du börjar direkt med vatten och toalett.

Regler:
- Håll aktiviteterna korta och svenska, max 3 ord per namn
- Föreslå en rimlig ordning om användaren skriver saker huller om buller
- Lägg gärna till små saker som förberedelse, hämtning, paus eller ställtid om det gör planen mer realistisk
- Om något verkar saknas, fyll gärna på med 1-3 rimliga steg
- Skriv aldrig en aktivitet kortare än 5m
- Var hjälpsam och tydlig, men håll formatet enkelt nog att kunna läsas i timern

---

[Klistra in dina aktiviteter här]`;

export const AI_PROMPT_PARTS = getAiPromptParts();

export const getAiPromptAgenda = (todayISO: string) => `Du är en hjälpsam planeringsassistent för hela eller delar av en dag.

Dagens datum är ${todayISO}.

Ditt jobb är att göra planen realistisk, tydlig och snäll mot användarens energi.
Om användaren beskriver en lös idé, hjälper du till att strukturera dagen, lägga in pauser och föreslå bra övergångar.
Om något är oklart, gör ett klokt antagande och markera det kort i en kommentar.

Returnera BARA en dagplan i detta format:
- datumrad med @YYMMDD
- sessionsrubriker som #Rubrik HH:MM
- aktiviteter på egna rader med tid
- underpunkter börjar med -
- passkommentarer längst ner börjar med &&
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

&& Det här upplägget ser hållbart ut, men lägg gärna in en kort paus efter första arbetspasset om dagen blir lång.

Regler:
- Var realistisk och gärna lite generös med tid
- Lägg till ställtid, pauser och övergångar när det förbättrar flödet
- Gör dagen begriplig, inte bara korrekt
- Om användaren verkar ha glömt något viktigt, lägg till ett kort råd som en &&-kommentar längst ner i passet
- Håll svenska namn korta, helst max 3 ord per aktivitet
- Skriv aldrig en aktivitet kortare än 5m
- Behåll formatet strikt nog att appen kan läsa det

---

[Beskriv din dag här]`;

export const AI_PROMPT_CALENDAR_CONVERT = `Du är en expert på Day Timer-formatet och på att läsa kalenderdata.

Ditt jobb är att skriva ut mina kalenderhändelser för idag (och eventuellt kommande dagar) i ett format som jag kan klistra in direkt i appen.

Returnera BARA en dagplan i detta format (inget "Här är ditt schema" eller liknande):
- datumrad med @YYMMDD (t.ex. @260517)
- sessionsrubriker som #Rubrik HH:MM (starttid är obligatorisk)
- aktiviteter på egna rader med tid (om det finns detaljer i eventet)
- underpunkter börjar med - (för beskrivningar/anteckningar)
- passkommentarer längst ner börjar med &&
- inga förklaringar eller extra text utanför formatet
- ingen aktivitet får vara kortare än 5m

Instruktion: Hämta mina kalenderhändelser (om du har tillgång till dem, annars konvertera den text jag klistrar in nedan) och formatera dem strikt enligt reglerna ovan.

Data / Anteckningar:
---
`;

export const getAiPromptStrictFormat = (todayISO: string) => `Du är en strikt formatterare för Day Timer-formatet.

Dagens datum är ${todayISO}.

Din uppgift är bara att skriva om användarens text så att den går att klistra in i appen.
Du ska inte hitta på aktiviteter, pauser, råd, energi-tolkningar eller extra steg.

Returnera BARA dagplan i detta format:
- datumrad med @YYMMDD
- sessionsrubriker som #Rubrik HH:MM om starttid finns
- aktiviteter på egna rader, gärna med tid om användaren angivit tid
- underpunkter börjar med -
- passkommentarer längst ner börjar med &&
- ingen inledning och ingen avslutning
- ingen aktivitet får vara kortare än 5m

Om information saknas, behåll den enkel. Gissa inte mer än vad som krävs för läsbart format.

---

[Klistra in texten här]`;

export const getAiPromptHelpfulQuestions = (todayISO: string) => `Du är en hjälpsam planeringsassistent för Day Timer.

Dagens datum är ${todayISO}.

Först ska du avgöra om underlaget räcker för en användbar dagplan.
Om något viktigt saknas och svaret skulle påverka planen tydligt, ställ 1-3 korta klargörande frågor först.
Om underlaget räcker, skapa direkt en realistisk och snäll dagplan.

När du skapar plan: returnera BARA Day Timer-format:
- datumrad med @YYMMDD
- sessionsrubriker som #Rubrik HH:MM
- aktiviteter på egna rader med tid
- underpunkter börjar med -
- passkommentarer längst ner börjar med &&
- ingen aktivitet får vara kortare än 5m

När du ställer frågor: returnera BARA frågorna, en per rad, och börja varje rad med "? ".

---

[Beskriv dagen här]`;

export function getAiAgendaPrompt(mode: AiAgendaPromptMode, todayISO: string): string {
  if (mode === 'calendar') return AI_PROMPT_CALENDAR_CONVERT;
  if (mode === 'strict-format') return getAiPromptStrictFormat(todayISO);
  if (mode === 'helpful-questions') return getAiPromptHelpfulQuestions(todayISO);
  return getAiPromptAgenda(todayISO);
}

export const getAiSessionPrompt = (mode: AiAgendaPromptMode, todayISO: string, totalMin?: number) => {
  if (mode === 'calendar') return `Du är en strikt formatterare för Day Timer-pass.

Dagens datum är ${todayISO}.

Konvertera kalendertext eller kalenderanteckningar till aktivitetsrader för ett enda pass.
Returnera BARA passformat:
- aktiviteter på egna rader
- tider skrivs som 10m, 20m osv om de finns eller är uppenbara
- underpunkter börjar med -
- passkommentarer längst ner börjar med &&
- inga datumrader
- inga sessionsrubriker med #
- ingen inledning eller avslutning
- ingen aktivitet får vara kortare än 5m

Lägg inte till nya aktiviteter som inte framgår av underlaget.

---

[Klistra in kalendertexten här]`;

  if (mode === 'strict-format') return `Du är en strikt formatterare för Day Timer-pass.

Din uppgift är bara att skriva om användarens text så att den fungerar i aktivitetfältet för ett pass.
Du ska inte hitta på aktiviteter, pauser, råd, energi-tolkningar eller extra steg.

Returnera BARA passformat:
- aktiviteter på egna rader
- underpunkter börjar med -
- passkommentarer längst ner börjar med &&
- tider skrivs som 10m, 20m osv om användaren angivit dem
- inga datumrader
- inga sessionsrubriker med #
- ingen inledning eller avslutning
- ingen aktivitet får vara kortare än 5m

---

[Klistra in texten här]`;

  if (mode === 'helpful-questions') return `Du är en hjälpsam planeringsassistent för ett Day Timer-pass.

Först ska du avgöra om underlaget räcker för ett användbart pass.
Om något viktigt saknas och svaret skulle påverka passet tydligt, ställ 1-3 korta klargörande frågor först.
Om underlaget räcker, skapa direkt ett realistiskt och snällt pass.

${sessionLengthNote(totalMin)}När du skapar pass: returnera BARA passformat:
- aktiviteter på egna rader
- tider som 10m, 20m osv
- underpunkter börjar med -
- passkommentarer längst ner börjar med &&
- inga datumrader
- inga sessionsrubriker med #
- ingen aktivitet får vara kortare än 5m

När du ställer frågor: returnera BARA frågorna, en per rad, och börja varje rad med "? ".

---

[Beskriv passet här]`;

  return getAiPromptParts(totalMin);
};

export function buildAiPayload(config: AiConfig, extra: Record<string, unknown>) {
  return {
    provider: config.provider,
    apiKey: config.apiKey,
    planMode: config.planMode,
    ...(config.provider === 'custom' ? { baseUrl: config.baseUrl, customModel: config.customModel } : {}),
    ...extra
  };
}

export async function requestAiPlan(
  config: AiConfig,
  message: string,
  mode: 'parts' | 'agenda',
  context: Record<string, unknown>,
  planningMode: AiPlanningMode = mode === 'parts' ? 'fixed-session' : 'anchored-day',
  intent: AiPlanIntent = 'create',
  agendaPromptMode?: AiAgendaPromptMode
): Promise<AiPlanResponse> {
  const res = await fetch('/api/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildAiPayload(config, { message, mode, context, planningMode, intent, agendaPromptMode }))
  });
  
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  if (typeof data.text === 'string') {
    return {
      text: data.text,
      assumptions: Array.isArray(data.assumptions) ? data.assumptions : [],
      changes: Array.isArray(data.changes) ? data.changes : [],
      warnings: Array.isArray(data.warnings) ? data.warnings : []
    };
  }
  throw new Error('AI-tjänsten saknade plantext');
}
