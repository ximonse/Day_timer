# Day Timer — Vision & Framework

## Varför detta dokument?

Day Timer kan bli en stor produkt. Det här dokumentet finns för att hålla fast vid rätt mindset under utvecklingen:

- bygg inte tungt i onödan
- bygg inte in appen i ett hörn
- prioritera produktkänsla och datatrygghet
- fatta tidiga beslut som fortfarande är bra vid 10, 100 eller 1000+ användare

Målet är inte att bygga enterprise-infrastruktur tidigt. Målet är att bygga en produkt som kan växa utan att behöva tänkas om från grunden.

För den konkreta tekniska riktningen kring workspace och sync, se även [`WORKSPACE_SYNC_ARCHITECTURE.md`](./WORKSPACE_SYNC_ARCHITECTURE.md).

---

## Produktvision

Day Timer ska vara det mest intuitiva sättet att:

- starta ett pass snabbt
- planera en hel dag visuellt
- återanvända fungerande upplägg
- känna att data och synk är trygga

Om appen blir populär kommer det sannolikt först att bero på:

- tydlig användarupplevelse
- låg friktion
- vacker och trygg planering
- pålitlig data mellan enheter

Det betyder att produktklarhet och datatillit väger tyngre än tidig komplex infrastruktur.

---

## Grundhållning

### 1. Bygg smått i implementation, stort i datamodell

Kodvägar får gärna vara enkla. Men kärnbegreppen måste vara tydliga:

- workspace
- agenda
- drafts
- flows / mallar
- share
- revisioner

Det är bättre att ha en enkel implementation av rätt modell än en avancerad implementation av en otydlig modell.

### 2. Optimera för evolution

Bra beslut nu är beslut som:

- gör dagens utveckling enklare
- minskar dagens buggrisk
- gör framtida byte av lagring eller auth möjligt

Undvik lösningar som känns snabba nu men låser fast produktens struktur.

### 3. Modulär monolit först

Strategin är:

- en app
- ett backend
- en tydlig datamodell
- tydliga moduler

Inte:

- microservices
- distribuerad komplexitet
- flera backendspår för tidigt

En modulär monolit räcker långt och är lättare att hålla samman under snabb produktutveckling.

---

## Vad som måste tas på allvar tidigt

### Dataägarskap

Det måste vara tydligt:

- vad som bara är lokalt UI-state
- vad som är användardata
- vad som är delnings- eller sessionsdata

### Synk

Synk får inte vara en lös knappfunktion. Synk är en kärndel av produkten.

Den syncade datan ska ha:

- tydlig server-sanning
- versionsnummer eller revision
- tidsstämplar
- möjlighet till återställning

### Identitet

Viktiga objekt ska ha stabil identitet:

- workspace
- dag
- block
- flow
- share-token

Det minskar risken för svårdebuggade sync- och mergeproblem senare.

---

## Tre typer av state

För att appen ska kunna växa utan att bli rörig ska state alltid tänkas i tre nivåer:

### 1. Lokal UI-state

Exempel:

- paneler öppna/stängda
- hjälptexter
- pågående menyer
- viewportrelaterade val

Detta ska normalt inte synkas.

### 2. Syncad användardata

Exempel:

- agenda
- `nowDraft`
- `planDraft`
- mallar / flows
- användarinställningar som bör följa mellan enheter

Detta ska ha tydlig server-sanning.

### 3. Tillfällig delnings- eller sessionsdata

Exempel:

- live-delning
- snapshot-delning
- view-tokens
- temporära publika sessioner

Detta ska hållas separat från vanlig användardata.

---

## Arkitekturhållning över tid

### Nuvarande riktning

Det är rimligt att börja med:

- SvelteKit-app
- enkel backend i samma repo
- Redis för vissa funktioner

Men den långsiktiga riktningen bör vara:

- primär produktdata i en tydlig workspace-modell
- versionsstyrd sync
- snapshots / historik
- Redis främst för cache, share, temporär state och livefunktioner

### När appen växer

Vid större användning bör primärdata kunna flyttas till en relationsdatabas utan att produktmodellen måste uppfinnas på nytt.

Målet är att kunna gå från:

- enkel dokumentlagring

till:

- `users`
- `workspaces`
- `workspace_revisions`
- `workspace_snapshots`
- `share_tokens`

utan att behöva skriva om hela klientlogiken.

---

## Vad vi gärna bygger tidigt

- tydlig workspace-modell
- versionsnummer / `updatedAt`
- snapshots och återställning
- trygg save/load/logout
- bra syncstatus i UI
- tydlig separation mellan domändata och UI-state
- bra namn och tydliga moduler i koden

---

## Vad vi medvetet väntar med

- microservices
- avancerad realtidssamarbeten
- websocket-arkitektur överallt
- CRDT/OT-lösningar
- tung plattformskomplexitet
- abstraktionslager “för säkerhets skull”

Om sådant byggs för tidigt riskerar det att bromsa produktutvecklingen mer än det hjälper.

---

## När det är dags att växla upp

Följande signaler betyder att infrastrukturen bör bli mer avancerad:

- återkommande synckonflikter mellan enheter
- behov av revisionshistorik i support
- många delningar samtidigt
- behov av bättre auth och kontostruktur
- verklig databasbelastning
- behov av team/fleranvändarflöden

Skala på faktisk smärta, inte på fantasi.

---

## Beslutsfilter för fortsatt utveckling

När större ändringar föreslås, ställ alltid dessa frågor:

1. Gör detta produkten tydligare eller bara mer teknisk?
2. Förbättrar det datatrygghet eller bara intern “elegans”?
3. Är detta ett verkligt behov nu, eller ett hypotetiskt framtidsproblem?
4. Gör beslutet framtida byte lättare eller svårare?
5. Är detta modulär enkelhet eller tidig överdesign?

Om svaret lutar mot otydlighet, överdesign eller tidig komplexitet ska arbetet bromsas och omvärderas.

---

## Praktisk princip

Den viktigaste långsiktiga principen för Day Timer är:

**Bygg inte stort för tidigt. Bygg rent tidigt.**

Det betyder:

- enkel implementation där det går
- stark datamodell där det behövs
- tydliga gränser mellan lokal state, syncad data och delningsdata
- trygghet före teknisk prestige
