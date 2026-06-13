# Day Timer — Workspace & Sync Architecture

## Syfte

Det här dokumentet översätter projektets långsiktiga vision till en konkret teknisk riktning för:

- sync mellan enheter
- dataägarskap
- versionshantering
- återställning
- framtida skalning

Dokumentet ska hjälpa utvecklingen att vara:

- enkel nog för nuvarande produktfas
- robust nog för att undvika dataförlust
- flexibel nog för att växa utan stor ombyggnad

Läs tillsammans med [`VISION_FRAMEWORK.md`](./VISION_FRAMEWORK.md).
För den konkreta första implementationsfasen, se även [`WORKSPACE_PHASE1_SPEC.md`](./WORKSPACE_PHASE1_SPEC.md).

---

## Kärnprincip

Day Timer ska på sikt bygga runt ett tydligt **workspace**.

Ett workspace är den syncade helheten för en användare eller ett konto. Det är den centrala enheten för save/load mellan enheter.

Appen ska inte långsiktigt tänka i lösa fält som råkar sparas till molnet, utan i ett definierat dokument med version, metadata och historik.

---

## Vad som är rätt att bygga nu

Det här är värt att göra tidigt:

- tydlig workspace-modell
- tydlig skillnad mellan lokal state och syncad state
- versionsnummer och tidsstämplar
- snapshots / återställning
- serverstyrd save/load-logik

Det här ska vänta:

- realtidssamarbete på dokumentnivå
- avancerad konfliktlösning per tecken eller block
- mikroservicearkitektur
- tung plattformsabstraktion

---

## Målbegrepp

### User

En användare eller kontonyckel som äger ett workspace.

### Workspace

Den syncade produktdatan som ska följa mellan enheter.

### Workspace Revision

En versionssatt sparning av workspace-datan.

### Workspace Snapshot

En sparad återställningspunkt, exempelvis en tidigare revision som går att ladda tillbaka.

### Device

En klient eller webbläsare som arbetar mot samma workspace.

### Share Session

En separat, tidsbegränsad delningsresurs. Detta ska inte blandas ihop med workspace-datan.

---

## Rekommenderad state-separation

### A. Lokal UI-state

Ska inte vara del av workspace om det inte finns starkt produktskäl.

Exempel:

- öppna paneler
- onboarding-visning
- hjälpsektioner
- menyflaggor
- viewportrelaterade val

### B. Syncad workspace-data

Ska följa mellan enheter.

Exempel:

- agenda
- `nowDraft`
- `planDraft`
- flows / mallar
- relevanta användarinställningar
- eventuell vald dag, om den har tydligt produktvärde mellan enheter

### C. Delnings- och sessionsdata

Ska hållas separat från workspace.

Exempel:

- live share
- snapshot share
- share-tokens
- publika läslänkar

---

## Rekommenderad workspace-modell

Det viktiga är inte exakt JSON-form, utan att modellen är tydlig och stabil.

Exempel på riktning:

```ts
interface WorkspaceEnvelope {
  workspaceId: string;
  version: number;
  updatedAt: string;
  updatedBy?: string;
  schemaVersion: number;
  data: WorkspaceData;
}

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

### Viktigt

- UI-state ska inte ligga här bara för att det råkar finnas i `AppState` idag.
- Share-data ska inte ligga här.
- Sync-token ska inte vara del av workspace-datan.

---

## Nya tumregler för save/load

### Save

Klienten ska inte bara skicka “senaste state” blint. Den ska skicka:

- workspace-data
- `baseVersion`
- gärna `deviceId`

Servern ska:

- acceptera om `baseVersion` matchar senaste version
- skapa ny version
- spara snapshot vid behov
- returnera ny version

### Load

Servern ska returnera:

- senaste workspace
- aktuell version
- metadata som hjälper klienten förstå vad som hänt

### Conflict

Om klienten försöker spara med gammal `baseVersion` ska servern kunna svara:

- `409 conflict`

Klienten kan då:

- ladda molnversion
- behålla lokal version
- skapa kopia

Konflikter behöver inte lösas “smart” tidigt. Det räcker att de upptäcks tydligt.

---

## Återställning

Day Timer bör byggas så att dataförlust inte bara “försöks undvikas”, utan faktiskt går att återhämta från.

Miniminivå:

- spara senaste N snapshots
- kunna lista snapshots för ett workspace
- kunna återställa en snapshot till ny aktuell version

Detta är mycket mer värdefullt tidigt än avancerad samtidighetslogik.

---

## Rekommenderade API-kontrakt på sikt

### 1. Läs workspace

`GET /api/workspace`

Returnerar:

- `workspaceId`
- `version`
- `updatedAt`
- `schemaVersion`
- `data`

### 2. Spara workspace

`PUT /api/workspace`

Body:

- `baseVersion`
- `data`
- `deviceId`

Svar:

- `ok`
- `version`
- `updatedAt`

eller:

- `conflict`
- `currentVersion`
- `currentData`

### 3. Lista snapshots

`GET /api/workspace/snapshots`

### 4. Återställ snapshot

`POST /api/workspace/restore`

Body:

- `snapshotId`

---

## Lagringsstrategi över tid

### Fas 1: Nuvarande produktfas

Acceptabelt:

- Redis som enkel dokumentlagring

Men:

- lagra workspace som tydligt envelope
- versionssätt writes
- lagra snapshots separat

### Fas 2: Växande användning

Fortsätt gärna använda Redis för:

- delning
- cache
- kortlivad state

Men börja förbereda för att primärdata senare ska kunna flytta.

### Fas 3: Större användning

Primärdata bör kunna ligga i relationsdatabas, t.ex. Postgres:

- `workspaces`
- `workspace_revisions`
- `workspace_snapshots`
- `share_tokens`

Redis kan då fortsatt användas för:

- live share
- cache
- rate limiting
- korttidsdata

---

## Skalningsnivåer

### 10 användare

Fokus:

- produktklarhet
- undvika dataförlust
- enkel drift

Behov:

- workspace-envelope
- versionsnummer
- snapshots
- tydlig save/load-status

### 100 användare

Fokus:

- supportbarhet
- bättre auth
- bättre felsökning

Behov:

- revisionshistorik
- bättre loggning
- adminstöd för restore
- tydligare serveransvar

### 1000+ användare

Fokus:

- observabilitet
- driftbarhet
- datamigreringar
- förutsägbar backend

Behov:

- relationsdatabas för primärdata
- metrics och larm
- migrationsstrategi
- tydligare konto- och workspace-modell

---

## Observabilitet som bör finnas

När sync blir viktig måste backend kunna svara på:

- hur ofta writes misslyckas
- hur ofta konflikter uppstår
- hur ofta tom molndata försöker laddas
- hur ofta restore används
- hur många snapshots som sparas

Detta behöver inte vara avancerat från dag ett, men det måste finnas som riktning.

---

## Konkreta beslut för fortsatt kodarbete

### Gör nu

1. Tydliggör vilka fält i nuvarande `AppState` som är:
   - lokal UI-state
   - syncad workspace-data
   - delningsdata
2. Inför en tydlig `WorkspaceData`-form i klientkoden.
3. Låt sync-API arbeta mot workspace-formen, inte lösa fält.
4. Lägg till `version` och `updatedAt`.
5. Spara snapshots vid explicita, viktiga saves.

### Vänta med

1. Realtime-samarbete.
2. Avancerad merge per block.
3. Flera backendtjänster.
4. Generella abstraktionslager utan tydligt behov.

---

## Rekommenderad implementationsordning

### Steg 1

Skapa en tydlig klientmodell för workspace utan att riva hela appen.

### Steg 2

Låt `/api/sync` utvecklas mot en versionssatt workspace-endpoint.

### Steg 3

Inför snapshots och restore.

### Steg 4

Bryt ut synclogik i egna servermoduler, men håll allt i samma app.

### Steg 5

När faktisk tillväxt kräver det: flytta primärdata till relationsdatabas.

---

## Beslutsregel

Om ett tekniskt förslag gör arkitekturen mer komplicerad men inte tydligt förbättrar:

- datatrygghet
- tydlighet
- framtida flexibilitet

ska det sannolikt inte byggas ännu.

Det rätta målet för Day Timer är inte maximal teknisk imponeringsgrad. Det rätta målet är en trygg produkt som kan växa utan att kollapsa under sin egen komplexitet.
