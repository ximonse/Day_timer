import { type Flow } from './state.svelte.js';
import { readSessionValue, writeSessionValue, removeSessionValue } from './storage.js';
import type { AiPlanIntent, AiPlanningMode, AiPlanResponse } from './ai-plan-engine.js';

export type AiProvider = 'anthropic' | 'openai' | 'gemini' | 'custom';
export type AiPlanMode = 'strict' | 'helpful';

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  baseUrl: string;
  customModel: string;
  planMode: AiPlanMode;
}

export type PersistedAiConfig = Omit<AiConfig, 'apiKey'>;

export const DEFAULT_AI_CONFIG: AiConfig = {
  provider: 'anthropic',
  apiKey: '',
  baseUrl: '',
  customModel: '',
  planMode: 'helpful'
};

const AI_CONFIG_STORAGE = 'daytimer_ai_config';
const AI_KEY_SESSION_STORAGE = 'daytimer_ai_api_key';
const AI_KEY_LEGACY_STORAGE = 'daytimer_ai_key';

export function loadAiConfig(): AiConfig {
  let config: AiConfig = { ...DEFAULT_AI_CONFIG };
  const savedConfig = localStorage.getItem(AI_CONFIG_STORAGE);
  if (savedConfig) {
    try { config = { ...config, ...JSON.parse(savedConfig) }; } catch { /* ignore */ }
  }
  const savedKey = readSessionValue(AI_KEY_SESSION_STORAGE) ?? localStorage.getItem(AI_KEY_LEGACY_STORAGE);
  if (savedKey) {
    config = { ...config, apiKey: savedKey };
    writeSessionValue(AI_KEY_SESSION_STORAGE, savedKey);
    localStorage.removeItem(AI_KEY_LEGACY_STORAGE);
  }
  return config;
}

export function persistAiConfig(config: AiConfig): void {
  const persistedConfig: PersistedAiConfig = {
    provider: config.provider,
    baseUrl: config.baseUrl,
    customModel: config.customModel,
    planMode: config.planMode
  };
  localStorage.setItem(AI_CONFIG_STORAGE, JSON.stringify(persistedConfig));
  if (config.apiKey.trim()) writeSessionValue(AI_KEY_SESSION_STORAGE, config.apiKey);
  else removeSessionValue(AI_KEY_SESSION_STORAGE);
  localStorage.removeItem(AI_KEY_LEGACY_STORAGE);
}

export function clearStoredAiConfig(): void {
  localStorage.removeItem(AI_CONFIG_STORAGE);
  localStorage.removeItem(AI_KEY_LEGACY_STORAGE);
  removeSessionValue(AI_KEY_SESSION_STORAGE);
}

export const AI_PROMPT_PARTS = `Du är en hjälpsam planeringsassistent för en visuell timer.

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
- Var hjälpsam och tydlig, men håll formatet enkelt nog att kunna läsas i timern

---

[Klistra in dina aktiviteter här]`;

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
- dagskommentarer börjar med &
- inga förklaringar eller extra text utanför formatet

Exempel:
@\${todayISO.replace(/-/g, '').slice(2)}
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
- dagskommentarer börjar med &
- inga förklaringar eller extra text utanför formatet

Instruktion: Hämta mina kalenderhändelser (om du har tillgång till dem, annars konvertera den text jag klistrar in nedan) och formatera dem strikt enligt reglerna ovan.

Data / Anteckningar:
---
`;

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
  intent: AiPlanIntent = 'create'
): Promise<AiPlanResponse> {
  const res = await fetch('/api/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildAiPayload(config, { message, mode, context, planningMode, intent }))
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
