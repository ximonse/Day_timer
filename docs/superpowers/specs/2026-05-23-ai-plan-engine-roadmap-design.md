# AI Plan Engine Roadmap Design

## Syfte

Day Timer ska lyfta AI-stodet fran textgenerator till en planeringsmotor som forstar tid, energi och genomforbarhet. Anvandaren ska kunna skriva eller prata rorigt, och fa tillbaka en plan som fungerar i Day Timers visuella tidsmodell.

Karnloftet ar:

> Skriv som du tanker. Day Timer gor det tidsmassigt mojligt.

AI ska inte bli en fristaende chatt bredvid appen. Den ska vara en produktnara motor som dyker upp dar anvandaren redan fastnar: nar en lektion ska fyllas inom en fast ram, nar en arbetsdag ska byggas runt ankare, eller nar en privat dag behover bli startbar utan att kannas som ett schemafangelse.

## Malgrupper och tidslogik

### Fast pass

For lektioner, workshops, moten, traningspass och andra sessioner dar start och slut oftast redan ar satta.

AI-vardet ligger inte framst i att skapa fler tider, utan i att anpassa innehall inom ramen:

- progression
- variation
- overgangar
- rimligt tempo
- korta blocknamn
- elev- eller deltagaraktivitet
- exit ticket eller avslut
- reservsteg om passet gar fortare eller langsammare

Exempel:

> Ak 4, 60 min, procent, efter lunch, de brukar vara trotta, behover exit ticket.

Day Timer ska kunna skapa ett 60-minuterspass som haller ramen och kanns genomforbart for gruppen.

### Dag med ankare

For arbetsdagar dar vissa tider ar fasta, men mycket av arbetet ar formbart.

AI-vardet ligger i att bygga runt fasta punkter:

- moten
- deadlines
- hamtning eller lamning
- energifonster
- behov av fokusarbete
- smasaker som bor samlas
- buffert fore och efter ankare

Exempel:

> Mote 10 och 14, rapporten maste bli klar, eposten ligger efter, vill ga 16.

AI ska skapa en realistisk arbetsdag dar fasta tider respekteras och resten prioriteras.

### Fri dag

For hem, privatliv, rutiner och dagar dar exakt klockslag ar mindre viktigt.

AI-vardet ligger i att gora roran startbar:

- mjuk ordning
- sma steg
- paminnelser
- rimliga pauser
- forberedelser
- mindre press pa exakt schema
- stod for startmotstand

Exempel:

> Jag maste tvatta, handla, ringa mamma, fixa mat och ar helt slut.

AI ska inte overplanera, utan ge en mild, genomforbar struktur.

## Produktprinciper

### 1. Ratt hjalp for ratt tidsram

AI ska styra beteende efter tidsram, inte bara efter anvandarroll. En larare kan anvanda Fri dag hemma. En privatperson kan ha Fast pass for ett traningspass. Tidsramen ar produktens centrala signal.

### 2. Synligt snabbval plus AI-gissning

Appen far gissa lage fran text och kontext, men anvandaren ska kunna byta direkt.

Exempel:

- "Verkar vara: Fast pass 60 min"
- "Verkar vara: Dag med ankare"
- "Verkar vara: Fri dag"

Det ger enkelhet utan att ta bort kontroll.

### 3. Planen ar sanningen

AI-resultat ska inte bli en parallell verklighet. Nar anvandaren accepterar ett forslag sparas det som vanlig Day Timer-data. AI-metadata kan sparas som kallsignal och hjalp for transparens, men den godkanda planen ar produktdatan.

### 4. Agent-redo, inte agent-forst

Fas 1 och 2 ska byggas med strukturerade modell-anrop via befintliga provider-nycklar. Arkitekturen ska daremot ha en tydlig grans sa att ett framtida agentlage kan anvanda samma request- och responsemodell.

## Fas 1: Rorig text till genomforbar plan

Fas 1 ska ge forsta tydliga wow-kanslan.

Malscenario:

1. Anvandaren skriver eller pratar rorigt.
2. Appen gissar tidslage.
3. Anvandaren kan andra lage med ett klick.
4. AI skapar en plan i Day Timer-format.
5. Appen visar forhandsgranskning och vad AI gjorde.
6. Anvandaren accepterar planen.

### Funktionell scope

Fas 1 ska införa en intern AI Plan Engine ovanpa dagens `/api/plan`.

Requesten ska uttrycka:

- `planningMode`: `fixed-session`, `anchored-day`, `free-day`
- `intent`: initialt `create`
- `userInput`
- `timeFrame`
- `currentPlan`
- `workspaceContext`

Responsen ska uttrycka:

- plantext i Day Timer-format
- antaganden
- andringar
- varningar

### Nara UI-beteende

I Planera och Agenda ska AI-panelen kunna visa ett enkelt lageval:

- Fast pass
- Dag med ankare
- Fri dag

AI-panelen ska fortfarande kannas latt. Den ska inte bli en stor konfigurationsyta.

Nar resultatet kommer ska anvandaren fa se:

- sjalva plantexten
- diskreta markorer som forklarar vad AI gjorde
- mojlighet att anvanda resultatet utan att forsta metadata

Exempel pa markorer:

- Lade till paus
- Höll inom 60 min
- Kortade titlar
- Skapade overgang
- Antog start 09:00
- Saknar tydligt slut

### Fas 1-avgransning

Fas 1 ska inte bygga:

- full agent
- automatisk workspace-reparation
- langsiktig larandeprofil
- kalenderintegration bortom befintlig import/prompt
- komplex elevdatabas
- chattminne som produktkärna

## Fas 2: Foradla befintlig plan

Fas 2 ska anvanda samma AI Plan Engine men lagga till fler intents.

Relevanta intents:

- `calm`: gor planen lugnare
- `compress`: korta inom samma ram
- `expand`: gor mer detaljerad
- `add-transitions`: lagg till overgangar
- `make-teachable`: gor passet mer pedagogiskt
- `reduce-switching`: farre vaxlingar
- `prioritize`: hjalp anvandaren valja vad som ar viktigast

Det viktiga ar att dessa visas som enkla produktknappar, inte som tekniska AI-kommandon.

Exempel:

- Gor lugnare
- Kortare
- Mer elevaktivitet
- Farre vaxlingar
- Lagg till buffert
- Vad kan vanta?

## Fas 3: Reparera nar verkligheten spricker

Fas 3 bor anvanda aktuell tid, aterstaende plan, faktisk tidslogg och prioritet.

Exempel:

- "Vi ligger 12 min efter."
- "Mötet drog över."
- "Eleverna fastnade pa forsta delen."
- "Jag ar trottare an jag trodde."

AI ska kunna foresla alternativ:

- behall malet
- behall avslutet
- gor minsta mojliga
- flytta resten
- korta oviktiga block

Detta bor byggas nar fas 1 och 2 har visat verkligt vardde och datamodellen ar redo.

## Teknisk design

### API-niva

Dagens `/api/plan` kan utvecklas utan att byta grundstrategi. Anvandaren fortsatter med OpenAI, Anthropic, Gemini eller custom provider via egen nyckel.

Ny intern grans:

```ts
type AiPlanningMode = 'fixed-session' | 'anchored-day' | 'free-day';
type AiPlanIntent = 'create' | 'calm' | 'compress' | 'expand' | 'add-transitions' | 'make-teachable' | 'reduce-switching' | 'prioritize';

interface AiPlanRequest {
  planningMode: AiPlanningMode;
  intent: AiPlanIntent;
  userInput: string;
  currentPlan?: string;
  timeFrame?: {
    startMin?: number;
    endMin?: number;
    totalMin?: number;
    date?: string;
  };
  workspaceContext?: {
    mode?: 'now' | 'plan' | 'agenda';
    dayTitle?: string;
    extraInfo?: string;
  };
}

interface AiPlanResponse {
  text: string;
  assumptions: string[];
  changes: string[];
  warnings: string[];
}
```

### Outputformat

Modeller ska styras mot JSON runt plantexten i API-lagret, men UI ska fortsatta arbeta med Day Timer-format.

Exempel:

```json
{
  "text": "#Procent 12:30\nStart 5m\n...",
  "assumptions": ["Antog 60 minuter eftersom passet har fast ram."],
  "changes": ["Lade till en kort overgang efter genomgang."],
  "warnings": ["Planen ar tajt om gruppen behover mycket stod."]
}
```

Om en provider returnerar ogiltig JSON ska servern kunna falla tillbaka till ren text med tom metadata. Planen far inte krascha pa grund av metadata.

### Datamodell

Fas 1 ska spara anvandargodkand plan som vanlig workspace-data. AI-metadata kan folja med i befintlig kallsignal eller agenda metadata, men ska hallas liten.

Rekommenderad minimal metadata:

```ts
{
  source: 'ai',
  aiMode: 'fixed-session',
  aiIntent: 'create',
  detail: 'Lade till paus, overgang och exit ticket'
}
```

## Teststrategi

Fas 1 ska testas pa tre nivaer:

1. Ren prompt/request-byggnad utan API-anrop.
2. Servervalidering och fallback for ogiltig metadata.
3. UI-funktioner som mappar lage och visar metadata utan att spara fel data.

Det ar viktigare att testa strukturen runt AI an att testa exakta modelltexter.

## Risker

### Overdriven komplexitet

Risk: AI blir en egen produkt i produkten.

Motdrag: Hall fas 1 till create-intent och tre tidslagen.

### Oforutsagbar modelloutput

Risk: AI returnerar fel format eller for mycket text.

Motdrag: Strikt server-normalisering, JSON-fallback och bevarande av befintligt Day Timer-format.

### Fel kontrollkansla

Risk: Anvandaren kanner att AI tar over planen.

Motdrag: Forhandsgranskning, synliga antaganden och godkannande innan sparning.

### Fel for larare

Risk: AI skapar en lektion som later bra men inte fungerar i klassrummet.

Motdrag: Fast pass-prompten ska prioritera tempo, overgangar, elevaktivitet, reservsteg och att halla ramen.

## Beslut

Day Timer ska ga vidare med strukturerade modell-anrop och en AI Plan Engine. Agent byggs inte i fas 1. Arkitekturen ska daremot forbereda en framtida agent genom tydliga request- och responsekontrakt.
