# Lägen & beteende (sanningskälla)

> Detta dokument beskriver hur Day Timers olika lägen ska bete sig. Det är **sanningskällan** — koden ska följa detta, och detta uppdateras när vi ändrar beteende. Läs detta före ändringar i kör-/flödeslogik.
>
> Status-märkning: ✅ byggt · 🟡 kvarstår/ska byggas · ❓ öppen fråga.

---

## 1. Grundbegrepp

- **Pass (session):** en rubrik + en lista aktiviteter. Kallas **block** när det ligger i agendan (det ser ut som ett block).
- **Aktivitet:** titel + planerad längd (minuter).
- **Plan (`s.blocks`):** sanningskällan för aktuellt pass. Allt som visas (timer, aktivitetslista, planera-vy, agenda) härleds härifrån. Ändringar skrivs hit och propageras ut — aldrig kors och tvärs mellan vyer.
- **Aktivitetslistan:** vänster sidopanel.
- **Agendan:** höger sidopanel — dagens pass (block) på en tidslinje. Härleds från/skrivs till planen via `syncTimerToAgenda`.

---

## 2. Genomförandelägen (Static vs Flow)

Planen och dess tider är samma i båda lägena. Bara körmotorn skiljer.

### Static (tidsstyrt) ✅
- Tiden avslutar aktiviteten automatiskt.
- **%-läge** (kör-tills-avbockad) finns på aktiviteter, men påverkar **aldrig** något utanför passet — bara intern omfördelning i passet.
- Klockan visar passet från `s.startMin`, passerad tid dämpad, aktiv aktivitet delad, kommande framåt.

### Flow (flöde) ✅
- **Användaren** avbockar aktiviteten manuellt; den är aktiv tills den bockas.
- **Kör man över** en aktivitets tid: både aktiviteten **och följande pass (block i agendan) skjuts framåt automatiskt, live under körningen**. ✅ (`adjustAgendaItemsForFlowRun`)
- **Bockar man av tidigare** än planerat: efterföljande tider ändras **inte** automatiskt. Den sparade tiden går till en **platshållare i slutet av passet** (`*`), inte till nästa aktivitet eller följande pass. ✅
  - Aktiviteten **krymper till faktisk tid** på klockan. ✅
  - Sparad tid används först för att beta av en befintlig försening, resten till platshållaren. ✅
- **Platshållaren ska vara som ett vanligt block — ibockningsbart.** När man bockar av den visas avslutsvalen igen (§4). 🟡
- **Klockan i Flow** ankras vid passets planerade start (`plannedStartMin`), så 1h-vyn visar timmens redan passerade aktiviteter dämpade + aktiv + kommande — som vanliga timern. ✅
- Originalplanens tider skrivs aldrig över i tysthet; återskrivning till planen sker bara vid medvetet avslut (§4). ✅

---

## 3. Kör-läge (run mode)

- Startas/stoppas med mittknappen (▶/■) i minimenyn.
- Run mode är **inte** främst ett låst läge (det finns ett separat, specifikt låst läge). Run mode är ett **minimalistiskt halvlåst läge**: vissa ikoner/menyer döljs för att rensa ytan. Agenda-block går **inte** att dra i run (de är låsta då), men det är inte huvudpoängen.
- **Stopp av kör-läge ska alltid öppna Planera-vyn med det valda passet** — både i Static och Flow. 🟡
  - (Nuläge: återgår till den meny som var öppen när man startade. Ska ändras till Planera/Valt pass.)

---

## 4. Avbockning & avslut i Flow

### Vanlig aktivitet (inte sista) ✅
- Bockas av → krymper till faktisk tid, sparad tid till platshållaren, ev. övertid skjuter följande framåt live. Nästa aktivitet blir aktiv.
- 3 sekunders ångra-fönster innan bekräftelse.

### Sista aktiviteten → avslutsval (overlay) ✅
När sista planerade aktiviteten bockas av visas tre val:

1. **Chilla** — gör ingenting resten av passets planerade tid.
   - Aktiviteterna får sina faktiska (korta) tider; ett **chill-block** fyller ut till passets ursprungliga sluttid → agendablocket **behåller sin planerade längd**. ✅
   - Passet startar inte om; chill-tiden ligger kvar och räknas ned. ✅
2. **Avsluta pass** — avsluta där man är. Faktiska tider skrivs till planen; kvarvarande tid försvinner. Stannar på timern med faktiska tider. ✅
3. **Starta nästa pass** — som Avsluta, men nästa pass i agendan laddas och startar direkt. ✅

Chill-/platshållarblocket är självt ibockbart och visar då valen igen (§2). 🟡

I alla tre fallen skrivs faktiska tider till planen (`s.blocks`) och synkas ut till agenda/aktivitetslista/timer. ✅

---

## 5. Tider & omlott

- Faktiska tider efter en flow-körning propageras till agenda, aktivitetslista, planera-vy och timer. ✅
- **Inga pills, badges eller varningsnotiser** i agendans block för ändrade/överlappande tider. ✅ (clash-styling/tooltip får finnas, men ingen ⚠️-ruta.)
- **Flow:** följande block puttas framåt live vid övertid (§2). ✅
- **Static / manuell redigering:** ingen automatisk push. Användaren flyttar själv pass som är i vägen, alternativt skriver in dagplanen eller ber AI flytta passen. ✅

### Dygnsgränsen (midnatt) ✅
- Agendan är ett långt flöde. **Ett pass syns på den dag det startar.**
- Ett pass som börjar före men slutar efter midnatt **bryts inte** — dygnsfönstret förlängs så passet ritas helt, med en streckad midnatts-linje som markerar dygnsgränsen.
- Ett pass vars **start** hamnar på/efter midnatt (via drag, shift eller flow-övertid) flyttas i datan till nästa dag (`startMin −= 1440`, kaskad för flera dygn) så lagrade tider alltid är giltiga (0–1439). `redistributeFlowsAcrossDays` körs vid varje agenda-serialisering.

---

## 6. Planera-vyn ("Valt pass")

- Visar det valda passet för redigering.
- **Ingen passlängd-knapp.** Visa **starttid och sluttid** (inte längd-i-minuter-läget). 🟡
- (Tiden behöver inte stå i rubriken.)

---

## 7. Lagring, synk & statistik

- Hela arbetsytan lagras som **ett JSON-dokument** i Upstash Redis (`daytimer:sync:<token>`). Varje sparning skriver hela dokumentet (inte deltan).
- Snapshots/backuper tas vid **manuell sparning** (max 10, varje en full kopia).
- Ett **pågående** flöde lagras enhetslokalt i `localStorage` (`day_timer_flow_runtime_v1`), utanför synk-/revisionsmodellen — accepterat eftersom det är kortlivat.
- **Completions** skrivs till den synkade `actualTimeLog` (`executionMode: 'flow'`) → utfallet tappas aldrig.
- **Framtid:** aktiviteters faktiska längd ska lagras för rekommendationer och statistik (per-aktivitet-lärande). Idag exkluderas aktivitetsposter från sessionsrekommendationer men ligger kvar i historiken. 🟡 (framtid)

---

## 8. Arkitektur

- `flow-execution.ts` — ren domänlogik för flödesmotorn.
- `flow-runtime.svelte.ts` — lokal, återupptagningsbar runtime-state.
- `flow-agenda.ts` — `adjustAgendaItemsForFlowRun` (live-push), `nextAgendaItemForFlowRun`.
- `run-menu-decisions.ts` — beslut om kör-läge öppna/stänga.
- `session-agenda-binding.ts` — synk mellan plan och agenda.
- `PlanEditorPanel.svelte` / `SessionEditorPanel.svelte` — planera-vyns kontroller.
- `+page.svelte` — orkestrering (ny logik ska ligga i `src/lib/`, inte här).
