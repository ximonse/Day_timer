# AI Plan Engine Handoff

Senast uppdaterad: 2026-05-24  
Aktuell arbetsgren: `codex/ai-plan-preview`  
Aktuell PR: <https://github.com/ximonse/Day_timer/pull/28>

Det här dokumentet är en praktisk överlämning för nästa utvecklare eller kodnings-AI. Det ska förklara var Day Timers AI-stöd står just nu, varför det är byggt så, vilka beslut som redan är tagna och vad som bör göras härnäst.

## Kort produktbild

Day Timer ska inte bli en chatt bredvid en timer. AI ska vara en planeringsmotor inne i den befintliga produkten.

Kärnlöftet är:

> Skriv som du tänker. Day Timer gör det tidsmässigt möjligt.

AI ska hjälpa när användaren har en rörig tanke, en lektion som ska rymmas i ett redan tidsatt pass, en arbetsdag med några fasta ankare, eller en fri dag som behöver bli startbar utan att kännas hårdplanerad.

Det viktiga är inte att AI skriver mycket text. Det viktiga är att resultatet blir en användbar Day Timer-plan.

## Beslut som redan är tagna

1. Ingen full agent i första steget.

   Vi använder vanliga modell-API:er via användarens egen nyckel. Arkitekturen ska däremot vara agent-redo genom tydliga request- och responsekontrakt.

2. Tre tidslogiker styr AI-beteendet.

   `fixed-session` används för lektioner, workshops, möten och pass där tiden redan är satt. `anchored-day` används för arbetsdagar med fasta punkter. `free-day` används för privatdagar och mjuk planering.

3. Planen är sanningen.

   AI-resultatet är bara ett förslag tills användaren accepterar det. När det accepteras ska det bli vanlig Day Timer-data, inte en separat AI-verklighet.

4. Förhandsgranskning före applicering.

   PR #28 ändrar AI-flödet så att förslag visas först och användaren väljer `Använd förslag` eller `Kasta`.

5. Metadata ska vara stöd, inte huvudnummer.

   `assumptions`, `changes` och `warnings` får visas diskret för transparens, men användaren ska inte behöva förstå metadata för att använda funktionen.

## Vad som finns på main

PR #27 är mergead till `main` som `8fe6c68 Add AI Plan Engine phase 1`.

Den innehåller:

- Design/roadmap: `docs/superpowers/specs/2026-05-23-ai-plan-engine-roadmap-design.md`
- Implementationsplan: `docs/superpowers/plans/2026-05-23-ai-plan-engine-phase1.md`
- Typad AI Plan Engine i `src/lib/ai-plan-engine.ts`
- Tester för promptbygge och normalisering
- `/api/plan` kopplad till planeringslägen
- UI-kontroller för planeringsläge i pass- och agendapaneler
- Metadata från AI-svaret synlig i AI-panelerna

Main-läget är alltså en första strukturerad AI-motor, men utan preview-flödet och utan de senare robusthetsfixarna från PR #28.

## Vad som finns i PR #28

PR #28 bygger ovanpå fas 1 och är den aktiva fortsättningen.

De viktigaste ändringarna:

- AI-förslag appliceras inte direkt utan visas som preview.
- Pass- och agendaflöden har `Använd förslag` och `Kasta`.
- Admin kan komma åt AI-inställningar utan att behöva låsa upp nivå 2 separat.
- Admin kan skapa invite-koder även utan sync-inloggning.
- Invite-koder normaliseras gemensamt i `src/lib/invites.ts`.
- Admin-endpointen verifierar Redis read-back efter skapad invite.
- Upgrade-endpointen använder samma normalisering och ger tydligare felmeddelande.
- Synlig sektion `Lås upp nivå 2` ersätter tidigare svårupptäckt invite-input.
- AI-parsern hanterar modellrespons inpackad i fenced JSON, till exempel ```json.
- AI-parsern sanerar nakna tidsmarkörer som `895 Te` och gör dem till duration-rader när det går.
- AI-prompten för `free-day` har justerats för att klustra naturliga moment och bevara ritualer.

Det här är fortfarande ett arbets-PR. Nästa steg är att testa kvaliteten med verkliga prompts, särskilt `Fri dag` + `Hjälpsam`.

## Viktiga filer

`src/lib/ai-plan-engine.ts`

Kärnan för AI Plan Engine. Innehåller typer, labels, promptbygge, normalisering, metadatahjälpare och sanering av modelloutput.

`src/routes/api/plan/+server.ts`

Server-endpoint för AI-generering. Väljer provider, bygger systemprompt via AI Plan Engine, anropar modell och normaliserar svaret.

`src/lib/ai.ts`

Klienthjälpare för AI-konfiguration och `requestAiPlan`.

`src/routes/+page.svelte`

Håller app-state, valt AI-planeringsläge, AI-preview-state och kopplar panelerna till parsing/applicering.

`src/lib/components/PlanEditorPanel.svelte`

AI-panel för ett pass/session. Relevant för `fixed-session` och ibland `free-day`.

`src/lib/components/AgendaImportPanel.svelte`

AI-panel för hel dag/agendatext. Relevant för `anchored-day` och `free-day`.

`src/lib/components/WorkspacePanel.svelte`

Konto, sync, API-nyckel, nivåer och unlock-flöde.

`src/lib/components/AdminPanel.svelte`

Adminverktyg, bland annat invite-koder.

`src/lib/invites.ts`

Gemensam normalisering av invite-koder.

`src/lib/access.ts`

Accessnivåer och admin/nivålogik.

## Nuvarande AI-kontrakt

Planmotorn använder dessa centrala typer:

```ts
type AiPlanningMode = 'fixed-session' | 'anchored-day' | 'free-day';

type AiPlanIntent =
  | 'create'
  | 'calm'
  | 'compress'
  | 'expand'
  | 'add-transitions'
  | 'make-teachable'
  | 'reduce-switching'
  | 'prioritize';

interface AiPlanResponse {
  text: string;
  assumptions: string[];
  changes: string[];
  warnings: string[];
}
```

I praktiken är bara `create` produktifierat än så länge. De andra intents finns för nästa fas.

Modellen instrueras att returnera JSON:

```json
{
  "text": "Day Timer-format",
  "assumptions": ["kort antagande"],
  "changes": ["kort ändring"],
  "warnings": ["kort varning"]
}
```

Servern måste alltid tåla att modellen gör fel. Därför finns fallback till ren text och sanering av vissa kända felmönster.

## Tidslägen och kvalitetskrav

### Fast pass

Används när start och slut oftast redan är satta.

Bra output:

- håller totalramen så långt det går
- delar upp passet i undervisningsmässigt rimliga steg
- skapar progression
- har övergångar när det behövs
- innehåller elev- eller deltagaraktivitet
- har tydligt avslut
- använder korta svenska aktivitetsnamn

Viktigt: AI ska inte hitta på nya klockslag inne i passet. Den ska skapa aktivitetsrader med minuter.

### Dag med ankare

Används för arbetsdagar med fasta tider men flexibel struktur runt omkring.

Bra output:

- respekterar möten, deadlines, hämtning/lämning och andra ankare
- lägger buffert runt fasta punkter
- samlar småsaker hellre än att splittra för mycket
- ger fokusblock när användaren behöver få något viktigt gjort
- gör prioriteringen tydlig

### Fri dag

Används för privatliv, hem, rutiner, återhämtning och mjukare planering.

Bra output:

- är mild och startbar
- klustrar naturligt sammanhängande moment
- skapar 3-6 lugna huvudblock
- använder 2-5 underpunkter för detaljer
- bevarar ritualer och återhämtning
- undviker att pressa in upplevelser i för korta tidsrutor
- undviker att splittra allt i mikroblock

Exempel på bättre `free-day`-form:

```text
Mjuk start 15m
- vakna
- drick vatten
- andas några minuter

Toalett & hygien 15m
- toalett
- tvätt eller dusch
- medicin

Frukost på trappen 30m
- koka vatten
- välj te
- ta med frukost
- sitt ute i lugn

Meditation & andning 15m
- sätt dig bekvämt
- 10 min stillhet
- andning i fokus
```

Det användaren reagerade på var att AI först gav för generiska och stressade resultat, till exempel 10 minuter för att både koka te, välja te och dricka det. Nästa AI-arbete bör därför fokusera på planeringsomdöme, inte bara format.

## Kända problem och risker

1. Prompt-only räcker inte hela vägen.

   Nuvarande förbättringar styr modellen bättre, men det finns ännu ingen andra-pass-kritik som frågar: "Är det här faktiskt rimligt?"

2. Fri dag behöver mest produktkänsla.

   Här är kvaliteten svårast, eftersom målet är balans mellan stöd och frihet. Resultatet får inte kännas som en hård arbetsplan.

3. Parsern är defensiv men inte semantisk.

   Den kan sanera fenced JSON och vissa tidsmarkörer, men den förstår inte ännu om en aktivitet är orimligt kort eller om ritualer har komprimerats för hårt.

4. API-nyckel och nivåflöde är användbart men fortfarande rörigt.

   PR #28 gör admin och invite-flöden tydligare, men området bör testas manuellt i rätt deploymiljö.

5. Preview och produktion kan ha olika env/Redis.

   Om invite-koder fungerar i en miljö men inte en annan är första misstanken olika Redis/env, inte UI:t.

## Rekommenderad nästa implementation

### Steg 1: Testa och stabilisera PR #28

Testa manuellt:

- Admin ser Konto & AI och kan skriva in API-nyckel.
- API-nyckel sparas lokalt i webbläsarsessionen.
- Admin kan skapa invite-kod.
- Nivå 2 kan låsas upp med kod i synliga fältet.
- AI-förslag visas som preview.
- `Kasta` lämnar befintlig plan oförändrad.
- `Använd förslag` applicerar planen.
- Fenced JSON visas inte längre för användaren.
- Svar med `895`, `905`, `940 Slut` blir inte råa starttidsrader i passvyn.

Kör:

```bash
npm test
npm run check
```

Senast känt från arbetet med PR #28: tester passerade och `npm run check` hade 0 fel men ett antal befintliga a11y-varningar.

### Steg 2: Inför en kvalitetsgranskare för AI-resultat

Lägg till en intern funktion i `ai-plan-engine.ts`, till exempel `reviewAiPlanDraft`, som gör regelbaserade kontroller innan svaret visas.

Första enkla regler:

- Flagga huvudblock under 10 minuter i `free-day` om de innehåller flera underpunkter.
- Flagga `free-day` om det finns fler än 7 huvudblock.
- Flagga te/frukost/meditation/vila om tiden verkar extremt kort.
- Flagga passoutput som innehåller starttider.
- Lägg en `warning` om planen verkar för tajt.

Detta behöver inte stoppa svaret först. Det kan börja med att lägga metadata eller justera prompt/feedback.

### Steg 3: Lägg till förbättringsknappar

Nästa stora värde ligger inte i fler inställningar utan i enkla produktknappar efter preview:

- `Gör lugnare`
- `Klustra bättre`
- `Mer konkret`
- `Kortare`
- `Lägg till övergångar`
- `Mer elevaktivitet`
- `Vad kan vänta?`

Tekniskt kan detta använda befintliga `AiPlanIntent` och skicka med `currentPlan`.

### Steg 4: Gör AI-resultat mer redigerbara

Preview bör gärna vara en textyta eller ha en tydlig redigeringsväg innan applicering. Det ger kontroll och minskar kravet på att modellen ska träffa perfekt direkt.

### Steg 5: Förbered framtida agent utan att bygga agent

När fas 1 och 2 fungerar kan en framtida agent använda samma kontrakt men med fler verktyg:

- läsa aktuell plan
- föreslå ändringar
- reparera när tiden spricker
- jämföra med tidigare mallar
- skapa flera alternativ

Bygg inte detta innan preview, intents och kvalitetsgranskning känns stabila.

## Hur nästa AI bör arbeta i koden

1. Läs först:

   - `AGENTS.md`
   - `docs/AI_PLAN_ENGINE_HANDOFF.md`
   - `docs/superpowers/specs/2026-05-23-ai-plan-engine-roadmap-design.md`
   - `src/lib/ai-plan-engine.ts`
   - `src/routes/api/plan/+server.ts`

2. Håll ändringar små och testbara.

   Day Timer ska vara modulär monolit, inte tidig tung infra.

3. Ändra inte kärnlogik utan motivering.

   AI-funktionerna påverkar användarens plan direkt, så preview och tydlig kontroll är viktigare än snabba automatiska appliceringar.

4. Lägg förklaringar i dokumentation och commitmeddelanden.

   Enligt projektets instruktioner ska ny kod inte fyllas med kommentarer.

5. Var konkret i återkoppling till användaren.

   Svara inte bara med PR-rubrik. Förklara vad som faktiskt ändrades, varför, hur det verifierades och vad som bör testas härnäst.

## Produktmålet framåt

Den bästa versionen av AI i Day Timer känns inte som "generera ett schema".

Den känns som:

- Jag skriver rörigt.
- Appen fattar vilken sorts tid jag menar.
- Den föreslår något som är realistiskt.
- Jag kan justera det innan det gäller.
- Planen blir visuellt begriplig direkt.
- Om verkligheten spricker kan appen hjälpa mig rädda dagen eller passet.

Det är dit implementationen ska sikta.
