# Day_timer — Codex Context

## Vad är det här?

`Day_timer` är en SvelteKit-port av [`the_timer`](https://github.com/ximonse/the_timer) — en visuell klocka för lärare. Appen har vuxit till en fullfjädrad dagplanerare med `Nu`-läge, `Planera`-läge, agenda, kalender, mallbibliotek, AI-stöd och live-delning.

**Sanningskällan:** `/home/user/the_timer/index.html` (för klockans geometri och färger).

---

## 🛑 Utvecklingspolicy (Viktigt!)

- **Polish är prioriterat**: Små UI-förbättringar, mjukare animationer och UX-puts är alltid välkommet.
- **Tänk efter före**: Om användaren vill ändra kärnlogik eller lägga till stora features ska detta **motiveras och genomtänkas noggrant**. Fråga hellre en gång för mycket än att börja riva i stabil kod.
- **Inga kommentarer i kod**: All förklaring ska ligga i dokumentationen eller commit-meddelanden.

### Långsiktigt arbetssätt

För Day Timer gäller följande grundhållning:

- **Bygg inte stort för tidigt. Bygg rent tidigt.**
- **Modulär monolit först**: håll app och backend enkla så länge det går.
- **Datamodellen är viktigare än tidig infra**: produktens kärndata ska vara tydlig även om implementationen är enkel.
- **Skala på faktisk smärta, inte på fantasi**: bygg inte tung infrastruktur utan verkliga signaler.
- **Skydda framtida vägval**: undvik lösningar som låser appen till en viss lagring, syncmodell eller authmodell.

Se även [`VISION_FRAMEWORK.md`](./VISION_FRAMEWORK.md) för full långsiktig riktning.
För konkreta sync- och workspacebeslut, se även [`WORKSPACE_SYNC_ARCHITECTURE.md`](./WORKSPACE_SYNC_ARCHITECTURE.md).
För första praktiska implementationsfasen, se även [`WORKSPACE_PHASE1_SPEC.md`](./WORKSPACE_PHASE1_SPEC.md).

---

## Nuläge (Klar maj 2026)

### Phase A — Grunden
- ✅ Layout & SVG-klocka (Pixel-perfekt kopia)
- ✅ 6 Paletter (sansad, meadow, mlp, bright, clear, psychedelic)
- ✅ Dag/natt-läge & Drag-funktionalitet
- ✅ Audio-varningar & Flash-overlay

### Phase B — Funktioner
- ✅ **Klockvy 1h/12h**: Cykling via toolbar
- ✅ **Agenda & Tidslinje**: Dra block, kalendervy
- ✅ **Live-delning**: Via Redis (`/?view=TOKEN`)
- ✅ **AI-stöd**: Gemini/Claude-integration för pass och dagplaner
- ✅ **Bibliotek**: Mallar för återkommande pass
- ✅ **Emoji-stöd**: Stora emojis i sektorer om titeln bara är en emoji
- ✅ **Kalender**: Lokaliserad till svensk standard (Måndag först)

### Phase C — UI Polish & Guidance
- ✅ **Interaktiv Guide**: 16 steg med intelligent spotlight och auto-panelutfällning
- ✅ **Manual**: Fullständig hjälpmeny ('i') med pedagogiska block
- ✅ **Välkomnande**: Centrerad välkomstvy med forskningskontext och signatur
- ✅ **Beta-branding**: BETA-markeringar och ny SVG-favicon
- ✅ **Prestanda**: SVG-masker och `requestAnimationFrame` för laggfri scroll

---

## Stack & Teknik

- **SvelteKit 5** (TypeScript)
- **Adapter Vercel** + **Upstash Redis** (Cross-device sync)
- **Inga CSS-ramverk**: Allt är ren CSS (Custom Properties)
- **SVG Geometry**: CX=180, CY=180, R=155, Ri=65 (viewBox 360x360)

---

## Datamodell (AppState)

```typescript
interface Block {
  id: string; title: string; minutes: number;
  note: string; warning: boolean; pinned: boolean;
}

interface AppState {
  palette: Palette; dark: boolean; blocks: Block[];
  dayTitle: string; extraInfo: string; startMin: number;
  endMode: 'end' | 'len'; onboardingStep: number;
  firstVisit: boolean; // Spårar om välkomstskärmen ska visas
}
```

---

## Designprinciper

- **Enkel yta, djup under**: Avancerade saker döljs bakom `⚙` eller `✎`.
- **Snabbhet**: Från tanke till startad timer på <10 sekunder.
- **Visuellt språk**: Samma som the_timer (sektorfärger, chip-etiketter).
- **Motivation**: Varje ny feature måste ha ett tydligt "varför".

## Arkitekturprinciper

- **Separera state tydligt**:
  - lokal UI-state
  - syncad användardata
  - tillfällig delnings-/sessionsdata
- **Synk är produktkärna, inte hjälpfunktion**: det som följer mellan enheter ska ha tydligt dataägarskap och på sikt versionering/historik.
- **Workspace först**: syncad data ska på sikt modelleras som ett tydligt workspace-dokument, inte som lösa fristående fält.
- **Stabil identitet före smarta genvägar**: dagar, block, flows och workspaces ska kunna följas robust över tid.
- **Trygg data väger tyngre än teknisk elegans**: beslut som minskar risk för dataförlust prioriteras högt.
