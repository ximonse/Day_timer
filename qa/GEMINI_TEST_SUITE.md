# Gemini QA-testsvit — Day Timer

Uttömmande manuell testsvit för Gemini (webbläsar-agent). **Dela upp:** klistra in
**Del A (master-prompten) först**, sedan **ett område-uppdrag i taget** från Del B.
Avsluta med **Del C** för en samlad rapport.

Fyll i platshållarna innan du börjar:
- `[PREVIEW_URL]` — länken till preview-bygget.
- `[NAMN]` / `[LÖSEN]` — testkontots inloggning (Konto-fliken).
- `[ADMIN_KOD]` — ev. admin/inbjudningskod (annars hoppa över område 12).
- `[AI_NYCKEL]` — *valfri, tillfällig, spärrad* AI-nyckel bara för område 8. Återkalla den efteråt. Utan nyckel: kör AI-området i "utan nyckel"-läget.

---

## DEL A — MASTER-PROMPT (klistra in först, varje session)

```
Du är en extremt nitisk UX- och QA-ingenjör. Du testar webbappen "Day Timer" i en riktig webbläsare. Din hållning: anta att allt är trasigt tills du bevisat motsatsen. Du provar varje kontroll på flera sätt och nöjer dig aldrig med "verkar funka".

MÅLMILJÖ
- App: [PREVIEW_URL]
- Testkonto (Konto-fliken): [NAMN] / [LÖSEN]
- Admin-kod (om angiven): [ADMIN_KOD]

SÅ MATAS APPEN (textformat — använd exakt detta när du skriver pass/dagplaner)
- Aktivitetsrad: "Namn 10m"  (10m låser tiden; utan tid fördelar appen automatiskt)
- "Namn %"  = aktiviteten pågår tills den bockas av
- "- text"  = underpunkt till föregående aktivitet
- "& text"  = kommentar till föregående aktivitet
- "&& text" = passinfo (egen rad)
- Dagplan: datumrad "@YYMMDD", sessionsrubrik "#Rubrik HH:MM" eller "#Rubrik HH:MM-HH:MM"
Exempel-pass att klistra in i aktivitetsfältet:
  Introduktion 10m
  Genomgång 8m
  - viktig poäng
  Eget arbete %
  && Kom ihåg material
Exempel-dagplan:
  @[DAGENS DATUM YYMMDD]
  #Morgonpass 08:00
  Samling 10m
  Matte 30m
  #Eftermiddag 13:00
  Läsning 20m

LÄGEN SOM SKA TÄCKAS (varje gång de är relevanta)
- Static (tidsstyrt) OCH Flow (flöde) — växla via ⚡-knappen "Flödesläge" i toolbaren.
- Normalt läge OCH kör-läge (▶ startar, ■ stoppar).
- Desktop-bredd OCH mobil-bredd (smalt fönster).
- Ljust OCH mörkt tema.

REGLER
- State-hygien: börja varje område med rent tillstånd (inkognitoflik eller töm localStorage), så gammalt tillstånd inte döljer buggar. Notera om något inte gick att nollställa.
- AI: kör INTE AI-generering utan en nyckel som uttryckligen står i uppdraget. Hitta ALDRIG på och återanvänd ALDRIG egna API-nycklar eller konton. Rapportera exakt vilken nyckel/endpoint du använde; saknas nyckel, markera generering som "ej testad".
- Var konkret: exakta klick, exakt inmatning, exakt vad som hände.

RAPPORTERA PER KONTROLL (en rad/punkt var):
  Kontroll | Hur testad | Förväntat | Faktiskt | PASS/FAIL/OSÄKER | Allvarlighet (blockerare/stor/liten/kosmetisk) | Reprosteg | Skärmdump

TÄCKNINGSKRAV
- Varje punkt i områdets checklista MÅSTE få en rad. Lämna inget oprövat.
- Avsluta varje område med en täckningstabell: punkt → ✅ testad / ❌ ej nådd (+ varför).
Bekräfta att du förstått, så ger jag dig första området.
```

---

## DEL B — OMRÅDE-UPPDRAG (ett i taget)

### Område 1 — Global chrome & inställningar
```
Följ master-prompten. Testa, i både Static och Flow samt ljust/mörkt:
- Toolbar: ⚙ options-meny öppnas/stängs; 1h/12h-knappen växlar klockvy; ⓘ help öppnar manual.
- ThemePicker: alla 6 paletter (sansad, meadow, mlp, bright, clear, psychedelic); dag/natt-toggle; verifiera att dag/natt är spärrad för psychedelic.
- Ljud/varningar: mute-knapp (🔔/🔇); per-block-varningsprickar (slå på/av en i taget).
- Lås 🔒/🔓: lås sidan, försök redigera (ska vara blockerat), lås upp (kontokod-prompt).
- Synk-emoji (👤): klick ska öppna Konto.
- OptionsMenu — varje toggle/cykel i sektionerna Tid, Visning, Sidopanel, Agenda, Övrigt. Verifiera att var och en faktiskt ändrar klockan/sidopanelen/agendan.
- Kortkommandon: n, p, b, k, i, s, l (samt a om admin), och Alt+Shift+R (fabriksåterställning — bekräfta dialog men AVBRYT så data inte raderas). Testa att de inte triggar när man skriver i ett textfält.
```

### Område 2 — Nu-läge (editor & start)
```
Följ master-prompten. I Nu-läget:
- Rubrikfält: skriv, töm, klistra emoji (ska visas stort i klockan).
- Aktivitets-textarea: testa format-koderna (10m, %, -, &, &&), Tab (skapar "- "), Enter (ny rad/aktivitet). Prova tomt, väldigt många rader, ogiltig tid.
- Start/sluttid/längd + lägestoggle (Sluttid/Längd): ändra var och en, verifiera att klockan följer.
- "Kör!" startar passet från nu; tomt pass ska ge toast "Lägg till minst en aktivitet först".
- Röst-mic (kräver nivå 2) — om synlig, testa inspelningsindikator.
- "Kopiera AI-prompt" — kopierar till urklipp, knapptext växlar till bekräftelse.
- "Spara som mall", Snabbstart (rubrik+aktiviteter+Starta nu), "Dela aktiv session".
```

### Område 3 — Planera & Valt pass
```
Följ master-prompten. I Planera:
- Kalender: månadsnav (‹ ›), välj datum, densitetsindikator på dagar med innehåll.
- Dag-nav (‹ ›), "Eget"-badge.
- Agenda-block: lägg till block, dra-flytta (⋮⋮), dra-storlek topp & botten, inline titel-edit (Enter/Escape), ta bort (🗑), infoga efter (+), källbadge (Mall/AI/Import).
- PlanEditorPanel "Valt pass": rubrik, aktiviteter, START- och SLUTTID (verifiera att ingen "Längd"-knapp visas när ett pass är valt), Spara/Klar, "Lägg till som nytt", Återställ (↺), "Använd" på tidsrekommendation, dela pass/dag.
- Verifiera att redigering i Planera aldrig rör en pågående timer.
```

### Område 4 — Sidopanel (aktivitetslista)
```
Följ master-prompten. I vänster sidopanel:
- Lägg till aktivitet (+).
- Redigera titel inline — testa att skriva "& kommentar", "&& passinfo", "- not", "%", "10m" i titelfältet och se att de tolkas rätt.
- Redigera minuter inline.
- Dra-omordna (långtryck/grip).
- Bock-av-kontroll (i static, på aktiv rad), ångra.
- Noter/underpunkter + överstrykning (klick/högerklick), info-ruta.
- Format-tips-raden visas i edit men döljs i kör-läge.
```

### Område 5 — Static kör-läge
```
Följ master-prompten. I Static:
- Starta med ▶ Kör! → kör-läge (minimalt/halvlåst): vilka ikoner/menyer döljs?
- Agenda-block ska INTE gå att dra i kör-läge.
- Bocka av aktiv aktivitet; verifiera tidsbeteende.
- Stoppa med ■ → ska landa i Planera med passet som kördes (valt pass).
- Verifiera att klock-drag är avstängt när sidan är låst.
```

### Område 6 — Flow kör-läge (mest noggrant)
```
Följ master-prompten. Växla till Flow (⚡). Använd exempel-passet (10m/8m/6m):
- Kör!, bocka av aktivitet 1 tidigt: 3s ångra-fönster (klicka igen = ångra), sedan ska aktiviteten KRYMPA till faktisk tid och en "*"-platshållare dyka upp/växa i slutet.
- Kör över en aktivitets tid: följande agenda-block ska puttas framåt LIVE.
- 1h-vyn ska visa den aktuella timmens passerade aktiviteter (dämpade) + aktiv + kommande.
- Bocka av SISTA aktiviteten → overlay med Chilla / Avsluta pass / Starta nästa pass.
- Chilla: aktiviteter får faktiska tider + chill-block fyller till planerat slut; agendablocket behåller planerad längd; chill-blocket ska vara IBOCKBART och då öppna valen igen.
- Avsluta: stannar på låsta timern, faktiska tider, ingen buffert.
- Starta nästa: detta pass sparas, nästa pass i agendan startar direkt.
- Verifiera att INGA pills/varningsnotiser dyker upp i agendans block. Att aktiviteter inte "startar om".
```

### Område 7 — Agenda & dygnsgräns
```
Följ master-prompten.
- Skapa ett pass 23:30 med 60 min: ska ritas HELT (inte klippas) och en streckad midnatts-linje "00:00 · nästa dygn" ska visas.
- Dra/förläng pass så att följande pass hamnar efter midnatt: de ska flyttas till NÄSTA dags kolumn (välj nästa dag i kalendern och verifiera att de ligger där, med rimlig starttid).
- Testa i både Static och Flow.
```

### Område 8 — AI (två nivåer)
```
Följ master-prompten.
UTAN nyckel (gör alltid):
- AI-panelens gating (vad visas/är låst utan nyckel).
- "Kopiera AI-prompt" i alla lägen: notes, calendar, strict-format, helpful-questions.
- Flexibilitetsnivåer (Snäv→Väldigt flexibel) — verifiera att prompttext/placeholder ändras.
- Felmeddelanden när man försöker köra utan nyckel.
MED nyckel (endast om [AI_NYCKEL] angetts — klistra in i Konto, rapportera att du använde den, påminn om att återkalla):
- Session-AI (runAiParts): beskriv ett pass, generera, granska resultatet i Day Timer-format.
- Dag-AI (runAiAgenda): beskriv en dag, generera flersessionsplan.
- Plan-preview: "Använd förslag" vs "Kasta".
- Röst-till-plan (Whisper) om tillgängligt.
Hitta ALDRIG på en egen nyckel. Saknas [AI_NYCKEL] → markera generering "ej testad".
```

### Område 9 — Import
```
Följ master-prompten. I AgendaImportPanel:
- ICS-fil: ladda upp, förhandsvisning av händelser, "Importera" lägger till icke-heldagshändelser.
- .txt/.md: laddas in i AI-input, AI-panelen öppnas.
- Bild/PDF: vision-tolkning (kräver AI-nyckel — annars notera).
- Agenda-textredigeraren: skriv en dagplan med @-datum och #-rubriker, "Spara i dagplan", verifiera att agendan uppdateras.
```

### Område 10 — Delning & vy-läge
```
Följ master-prompten.
- Starta delning: aktiv session, pass, hel dag. Kopiera varje länk; stoppa varje delning.
- Öppna en delningslänk "?view=TOKEN" i ny flik/inkognito: ska vara SKRIVSKYDDAT (inga edit-knappar), agenda + live-klocka uppdateras.
```

### Område 11 — Konto & synk (testkonto)
```
Följ master-prompten. I Konto med [NAMN]/[LÖSEN]:
- Logga in & synka; verifiera synkstatus.
- "Ladda" och "Spara" mot molnet; framkalla en konflikt (ändra på två ställen) och testa "Försök igen".
- "Tidigare versioner": ladda snapshots, "Återställ" en.
- AI-config: byt provider, nyckelfält (visa/dölj/rensa), kom-ihåg-checkbox, custom base-url/modell, Whisper-nyckel.
- Tidsdata & Lärande-sektionen, uppgraderingskod-fältet, "Logga ut".
```

### Område 12 — Admin (om admin-kod finns)
```
Följ master-prompten. Logga in som admin ([ADMIN_KOD]). I Admin-fliken:
- Generera inbjudningskod (engångs och flergångs/checkbox). Verifiera att koden visas.
```

### Område 13 — Onboarding & hjälp
```
Följ master-prompten.
- Starta guidade turen (Konto → "Starta hela guiden" eller via help): stega igenom alla 16 steg (Nästa/Bakåt/Avbryt); verifiera att spotlighten markerar rätt element och tooltip placeras vettigt.
- Hjälp-modal (ⓘ): öppna/stäng, läs igenom.
- Per-fält "i"-knappar och globalt "Hjälpläge" (Alt+i): slå på/av, verifiera att hjälptexter dyker upp.
```

---

## DEL C — SLUTRAPPORT (begär efter alla områden)
```
Sammanställ nu en slutrapport:
1. Täckningstabell över alla 13 områden: antal kontroller testade vs ej nådda.
2. Alla FAIL och OSÄKER, sorterade på allvarlighet (blockerare först), med reprosteg.
3. "Ej testat + varför" (t.ex. saknad AI-nyckel, admin-kod).
4. Topp 5 UX-friktioner du la märke till, även där inget var tekniskt fel.
```
