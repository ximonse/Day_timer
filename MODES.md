# Lägen & beteende (sanningskälla)

> Detta dokument beskriver hur Day Timers olika lägen ska bete sig. Det är **sanningskällan** — koden ska följa detta, och detta uppdateras när vi ändrar beteende. Läs detta före ändringar i kör-/flödeslogik.
>
> Status-märkning: ✅ byggt · 🟡 kvarstår/ska byggas · ❓ öppen fråga.

---

## 1. Grundbegrepp

- **Pass (session):** en rubrik + en lista aktiviteter (block), med en starttid när det ligger i agendan.
- **Aktivitet (block):** titel + planerad längd (minuter).
- **Plan (s.blocks):** sanningskällan för aktuellt pass i appen. Allt som visas (timer, aktivitetslista, planera-vy, agenda) härleds härifrån. Ändringar skrivs hit och prop ageras ut — aldrig kors och tvärs mellan vyer.
- **Agenda:** dagens pass på en tidslinje. Härleds från/skrivs till planen via `syncTimerToAgenda`.

---

## 2. Genomförandelägen (Static vs Flow)

Planen och dess tider är samma i båda lägena. Bara körmotorn skiljer.

### Static (tidsstyrt) ✅
- Tiden avslutar aktiviteten automatiskt.
- Klockan visar passet från `s.startMin`, med passerad tid dämpad, aktiv aktivitet delad, kommande framåt.

### Flow (flöde) ✅
- **Användaren** avbockar aktiviteten manuellt; den är aktiv tills den bockas.
- När en aktivitet bockas av:
  - Aktiviteten **krymper till faktisk tid** (den tid den verkligen tog). ✅
  - Sparad tid (om man var snabb) flyttas till en **platshållare i slutet av passet** (`*`), inte till nästa aktivitet. ✅
  - Tar en aktivitet längre tid skjuts återstående pass framåt (förseningen ackumuleras). ✅
  - Sparad tid används först för att beta av en befintlig försening, resten till platshållaren. ✅
- **Klockan i Flow** ankras vid passets planerade start (`plannedStartMin`) så att den aktuella timmens (1h-vyn) redan passerade aktiviteter visas dämpade + aktiv + kommande — som vanliga timern. ✅
- Originalplanens tider skrivs aldrig över i tysthet av utfallet; återskrivning till planen sker bara vid medvetet avslut (se §4). ✅

---

## 3. Kör-läge (run mode)

- Startas/stoppas med mittknappen (▶/■) i minimenyn.
- I kör-läge är sidan låst (`page-locked`) — redigering avstängd, bara körkontroller aktiva.
- **Stopp av kör-läge ska alltid öppna Planera-vyn med det valda passet** — både i Static och Flow. 🟡
  - (Nuläge: återgår till den meny som var öppen när man startade. Ska ändras till Planera/Valt pass.)

---

## 4. Avbockning & avslut i Flow

### Vanlig aktivitet (inte sista) ✅
- Bockas av → krymper till faktisk tid, sparad tid till platshållaren, ev. försening hanteras. Nästa aktivitet blir aktiv.
- 3 sekunders ångra-fönster innan det bekräftas.

### Sista aktiviteten → avslutsval (overlay) ✅
När sista planerade aktiviteten bockas av visas tre val:

1. **Chilla** — gör ingenting resten av passets planerade tid.
   - Aktiviteterna får sina faktiska (korta) tider.
   - Ett **chill-block** fyller ut till passets ursprungliga sluttid → agendablocket **behåller sin planerade längd**. ✅
   - Passet startar inte om; chill-tiden ligger kvar och räknas ned. ✅
   - **Chill-blocket ska självt vara ibockbart** så att samma avslutsval kan visas igen (t.ex. för att i stället starta nästa pass). 🟡
2. **Avsluta pass** — avsluta där man är.
   - Faktiska tider skrivs till planen; kvarvarande planerad tid försvinner.
   - Stannar på den låsta timern och visar passet med faktiska tider. ✅
3. **Starta nästa pass** — som Avsluta, men nästa pass i agendan laddas och startar direkt. ✅

I alla tre fallen skrivs faktiska tider till planen (`s.blocks`) och synkas ut till agenda/aktivitetslista/timer. ✅

---

## 5. Agenda-synk & visning

- Faktiska tider efter en flow-körning skrivs till planen och propageras till agenda, aktivitetslista, planera-vy och timer. ✅
- **Inga pills, badges eller varningsnotiser** i agendans passblock för ändrade/överlappande tider. ✅ (clash-styling/tooltip får finnas, men ingen ⚠️-ruta.)

### Tider får inte gå omlott 🟡
- **I Flow:** när tider skulle överlappa ska **allt följande puttas framåt** så att inget överlappar. (Bekräftat av användaren.)
- **I Static / manuell redigering:** ❓ Ska samma push-framåt gälla, eller klämmas fast vid grannen? (Behöver bekräftas.)

---

## 6. Planera-vyn ("Valt pass")

- Visar det valda passet för redigering.
- **Tiden ska stå i rubriken om passet har en tid** (t.ex. starttid eller tidsintervall från agendan). 🟡

---

## 7. Lagring & synk (medvetet val)

- Hela arbetsytan lagras som **ett JSON-dokument** i Upstash Redis (`daytimer:sync:<token>`). Varje sparning skriver hela dokumentet (inte deltan).
- Snapshots/backuper tas vid **manuell sparning** (max 10, varje en full kopia).
- Ett **pågående** flöde lagras enhetslokalt i `localStorage` (`day_timer_flow_runtime_v1`), utanför synk-/revisionsmodellen — accepterat eftersom det är kortlivat.
- **Completions** skrivs till den synkade `actualTimeLog` (`executionMode: 'flow'`) → utfallet tappas aldrig. Aktivitetsposter exkluderas från sessionsrekommendationer.

---

## 8. Arkitektur

- `flow-execution.ts` — ren domänlogik för flödesmotorn.
- `flow-runtime.svelte.ts` — lokal, återupptagningsbar runtime-state.
- `run-menu-decisions.ts` — beslut om kör-läge öppna/stänga.
- `session-agenda-binding.ts` — synk mellan plan och agenda.
- `+page.svelte` — orkestrering (ny logik ska ligga i `src/lib/`, inte här).
