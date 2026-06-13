# Day Timer — Workspace Phase 1 Spec

## Syfte

Det här dokumentet beskriver den första konkreta implementationsfasen för att gå från dagens `AppState`-styrda sync till en tydligare workspace-modell.

Målet i fas 1 är inte att göra en full omskrivning. Målet är att skapa en stabil mellanlandning där:

- syncad data blir tydligare definierad
- `/api/sync` börjar arbeta mot ett sammanhållet workspace payload
- lokal UI-state skiljs från syncad användardata
- framtida versionering och snapshots blir lätta att lägga till

Detta dokument ska vara tillräckligt konkret för att kunna användas som grund för kommande implementation.

Läs tillsammans med:

- [`VISION_FRAMEWORK.md`](./VISION_FRAMEWORK.md)
- [`WORKSPACE_SYNC_ARCHITECTURE.md`](./WORKSPACE_SYNC_ARCHITECTURE.md)

---

## Fas 1 i en mening

Inför en tydlig klientmodell för `WorkspaceData`, klassificera nuvarande `AppState`, och låt `/api/sync` läsa och skriva workspace-data som ett sammanhållet objekt utan att ännu kräva full revisionsbackend.

---

## Problemet idag

Nuvarande lösning har tre svagheter:

1. Syncad data är utspridd som lösa fält i `AppState`.
2. `AppState` blandar domändata, UI-state och sessions-/delningslogik.
3. `/api/sync` arbetar med ett begränsat payload som historiskt inte täckt hela den verkliga produktdatan.

Resultatet blir att det är lätt att:

- glömma att synka viktiga fält
- råka skriva över data
- bygga vidare på en otydlig ansvarsfördelning

---

## Mål för fas 1

Efter fas 1 ska följande vara sant:

1. Det finns en tydlig `WorkspaceData`-typ i klientkoden.
2. Det finns tydliga helpers för:
   - `workspaceDataFromAppState()`
   - `applyWorkspaceDataToAppState()`
3. `/api/sync` arbetar mot ett sammanhållet workspace payload i stället för lösa fält.
4. Syncad data är tydligt avgränsad från lokal UI-state.
5. Koden är förberedd för att lägga till:
   - `version`
   - `updatedAt`
   - snapshots

Fas 1 behöver inte ännu innehålla full konfliktlösning eller restore-UI.

---

## Klassificering av nuvarande `AppState`

Följande klassificering ska vara styrande för fortsatt arbete.

### A. Syncad workspace-data

Dessa fält hör till användarens verkliga produktdata och ska följa mellan enheter:

| Fält | Status | Kommentar |
|---|---|---|
| `flows` | syncad | Mallbibliotek / återanvändbara sessioner |
| `agendaText` | syncad | Skolagendan |
| `agendaDate` | syncad | Senast vald skol-dag om produkten vill minnas detta |
| `agendaText2` | syncad | Privat agenda |
| `agendaDate2` | syncad | Privat vald dag om det bedöms värdefullt |
| `agendaMeta` | syncad | Källa/metadata för agenda-flows |
| `actualTimeLog` | syncad | Lärande/rekommendationsdata |
| `nowDraft` | syncad | Arbetsutkast för Nu |
| `planDraft` | syncad | Arbetsutkast för Planera |
| `palette` | syncad | Produktnära preferens som gärna följer mellan enheter |
| `dark` | syncad | Visuell preferens |
| `clockSpan` | syncad | Beteende-/visningspreferens |
| `endMode` | syncad | Hur tiden redigeras |
| `agendaView` | syncad | Öppet/privat läge om detta ska följa användaren |
| `showSegNotes` | syncad | Preferens |
| `showExtraInfo` | syncad | Preferens |
| `showSegLabels` | syncad | Preferens |
| `showLeft` | syncad eller lokal | Kan temporärt få följa med om enklare nu |
| `showCenterEnd` | syncad eller lokal | Samma princip |
| `hollow` | syncad eller lokal | Samma princip |
| `textOutside` | syncad eller lokal | Samma princip |
| `showMin` | syncad eller lokal | Samma princip |
| `showFive` | syncad eller lokal | Samma princip |
| `showQuarter` | syncad eller lokal | Samma princip |
| `segMinutesMode` | syncad eller lokal | Bedöm som preferens, men dokumentera beslutet |

### B. Lokal UI-state

Dessa fält ska inte vara del av workspace i fas 1:

| Fält | Status | Kommentar |
|---|---|---|
| `sbCollapsed` | lokal | Layoutläge |
| `agendaOpen` | lokal | Panelöppen/stängd |
| `agendaDimPast` | lokal eller preferens | Bör tills vidare hållas lokal om osäkerhet finns |
| `showControls` | lokal | UI-layout |
| `showHelpHints` | lokal | Hjälpvisning |
| `activeSection` | lokal | Navigationsläge per enhet |
| `onboardingStep` | lokal | Tillfällig progress |
| `firstVisit` | lokal | Enhet-/webbläsarupplevelse |
| `isLocked` | lokal | Sessionellt skydd, inte workspace-sanning |

### C. Ej del av workspace eller lokal syncmodell

Dessa ska uttryckligen inte räknas som workspace-data:

| Fält | Status | Kommentar |
|---|---|---|
| `syncKey` | ej workspace | Auth-/kopplingsnyckel |
| `userLevel` | ej workspace | Kontoprofil från server |
| `blocks` | derivat / editor-state | Aktiv editor-state, ska på sikt komma från draft eller vald agenda |
| `dayTitle` | derivat / editor-state | Samma princip |
| `extraInfo` | derivat / editor-state | Samma princip |
| `startMin` | derivat / editor-state | Samma princip |

---

## Viktig tolkningsregel

Vissa fält ligger i gränslandet mellan preferens och lokal UI.

Om ett beslut är osäkert i fas 1 gäller:

- välj enkelhet
- dokumentera beslutet
- håll gränsen tydlig

Det är bättre att tillfälligt låta några visningspreferenser följa med i workspace än att fortsätta blanda ihop kärndata och UI-state utan struktur.

---

## Rekommenderad typ i fas 1

Följande riktning är tillräcklig i första steget:

```ts
interface WorkspaceData {
  flows: Flow[];
  agenda: {
    schoolText: string;
    schoolDate: string;
    privateText: string;
    privateDate: string;
    meta: Record<string, AgendaFlowMeta>;
  };
  drafts: {
    now: EditorDraft;
    plan: EditorDraft;
  };
  history: {
    actualTimeLog: ActualTimeEntry[];
  };
  preferences: {
    palette: Palette;
    dark: boolean;
    clockSpan: 60 | 720;
    endMode: 'end' | 'len';
    agendaView: 'school' | 'private';
    showSegNotes: boolean;
    showExtraInfo: boolean;
    showSegLabels: boolean;
  };
}
```

I fas 1 kan denna modell gärna kompletteras med några extra visningspreferenser om det förenklar migrationen. Men strukturen ovan ska vara kärnan.

---

## Rekommenderade nya hjälpfunktioner

Fas 1 bör introducera separata hjälpare i klientkoden.

### 1. `workspaceDataFromAppState(state)`

Syfte:

- extrahera syncbar workspace-data från nuvarande `AppState`

Ansvar:

- inkludera endast workspace-relevanta fält
- klona data där det behövs
- undvika lokal UI-state

### 2. `applyWorkspaceDataToAppState(state, workspace)`

Syfte:

- skriva tillbaka workspace-data till app-state på kontrollerat sätt

Ansvar:

- uppdatera syncade fält
- inte skriva över lokal UI-state
- återställa editorutkast korrekt

### 3. `isWorkspaceMeaningfullyEmpty(workspace)`

Syfte:

- skilja tomt workspace från verkligt innehåll
- skydda mot destruktiva tomma loads

---

## `/api/sync` i fas 1

I fas 1 kan endpointen fortfarande heta `/api/sync`, men semantiskt ska den börja fungera som workspace-endpoint.

### Nuvarande tänk

Idag:

- GET returnerar lösa fält
- POST sparar lösa fält

### Ny riktning i fas 1

GET ska returnera ett sammanhållet objekt med minst:

```ts
{
  workspace: WorkspaceData,
  userLevel?: number
}
```

POST ska acceptera:

```ts
{
  workspace: WorkspaceData
}
```

Om det behövs för bakåtkompatibilitet kan endpointen temporärt:

- läsa gamla payloads
- skriva nya payloads

Men all ny klientkod bör tänka i `workspace`.

---

## Förslag på serverformat i fas 1

För att göra fas 2 enkel kan serverpayload redan nu bära med sig tomma metadatafält:

```ts
interface WorkspaceSyncResponse {
  workspace: WorkspaceData;
  version?: number;
  updatedAt?: string;
  userLevel?: number;
}
```

I fas 1 får `version` och `updatedAt` vara valfria om implementationen ännu inte är klar. Men klient- och serverkod bör förberedas för dem.

---

## Filriktning i kodbasen

Fas 1 kan genomföras utan stor omskrivning om ansvar delas upp tydligare.

### Rekommenderade nya filer

- `src/lib/workspace.ts`
  - typer för `WorkspaceData`
  - mapping mellan `AppState` och workspace
  - emptiness-checks

- `src/lib/workspace.test.ts`
  - test för mapping och tomhetslogik

### Filer som bör ändras

- `src/lib/state.svelte.ts`
  - ingen stor omskrivning ännu
  - eventuellt tydligare kommentarer i dokumentation, inte nödvändigtvis i kod

- `src/lib/share-state.ts`
  - syncpayload bör sluta definieras som löst fältpaket
  - använd workspace-modell eller börja fasa ut denna del

- `src/routes/+page.svelte`
  - save/load ska använda workspace-helpers

- `src/routes/api/sync/+server.ts`
  - GET/POST ska läsa och skriva `workspace`

---

## Rekommenderad migrationsstrategi

### Steg 1

Inför `WorkspaceData` och helpers utan att ändra användarflödet.

### Steg 2

Låt klienten bygga syncpayload via `workspaceDataFromAppState()`.

### Steg 3

Låt `/api/sync` lagra `workspace` som sammanhållet objekt.

### Steg 4

Låt `syncLoad()` använda `applyWorkspaceDataToAppState()`.

### Steg 5

När detta är stabilt:

- lägg till `version`
- lägg till `updatedAt`
- lägg till snapshots

---

## Viktiga icke-mål i fas 1

Följande ska uttryckligen inte krävas för att fas 1 ska anses klar:

- full konflikthantering i UI
- restoregränssnitt
- byte till Postgres
- realtidssynk
- full moduluppdelning av hela `+page.svelte`

Fas 1 ska ge bättre struktur och mindre risk, inte maximal färdig lösning.

---

## Acceptanskriterier

Fas 1 är lyckad när:

1. Syncbar data kan beskrivas med en enda `WorkspaceData`-typ.
2. Det finns en tydlig och testbar mapping mellan `AppState` och workspace.
3. `syncSave()` och `syncLoad()` arbetar mot workspace-data, inte lösa specialfall.
4. Lokal UI-state skrivs inte över av molnload.
5. Synclogiken är förberedd för versionering utan att behöva tänkas om.

---

## Rekommenderat nästa steg efter detta dokument

Nästa tekniska slice bör vara:

1. skapa `src/lib/workspace.ts`
2. definiera `WorkspaceData`
3. flytta ut mappinglogiken från `+page.svelte`
4. uppdatera `/api/sync` till `workspace`-payload
5. skriva tester för tomhetsfall, roundtrip och load/apply

Det är den minsta rimliga förändringen som flyttar projektet från “sync som specialfall” till “workspace som tydlig produktkärna”.
