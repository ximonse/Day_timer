# AI Plan Quality Review Design

## Syfte

AI Plan Engine ska få ett första regelbaserat kvalitetslager som fångar uppenbart orimliga AI-svar innan användaren accepterar dem som plan.

Det här ska inte vara en extra agent, ett andra AI-anrop eller en blockerande validering. Det ska vara en liten, testbar granskare som lägger till varningar i befintlig `AiPlanResponse`.

## Problem

Efter hardening-arbetet är formatet stabilare, men modellen kan fortfarande skapa planer som är tekniskt parsade men svaga i planeringsomdöme.

Exempel:

- `Fri dag` får många små mikroblock och känns som ett hårt schema.
- Te, frukost, meditation eller vila får orimligt kort tid.
- En huvudrad har flera underpunkter men bara några få minuter.
- Passläge får starttider trots att passoutput ska vara aktivitetsrader med minuter.
- Trasig strukturerad output ger tom plantext och behöver tydlig varning.

## Design

Lägg till `reviewAiPlanResponse(response, context)` i `src/lib/ai-plan-engine.ts`.

Input:

- `response`: normaliserad `AiPlanResponse`
- `context.planningMode`: `fixed-session`, `anchored-day` eller `free-day`
- `context.contextMode`: `plan`, `agenda` eller `now`

Output:

- samma `AiPlanResponse`
- nya varningar läggs till i `warnings`
- befintliga `assumptions` och `changes` bevaras
- dubbletter i warnings undviks

## Regler i första versionen

För alla planlägen:

- Om plantexten är tom: varna att AI-svaret saknar användbar plantext.
- Om pass-/planläge innehåller starttid på aktivitetsrad, till exempel `09:05 Meditation`: varna att pass ska använda minuter, inte starttider.

För `free-day`:

- Om planen har fler än 7 huvudblock: varna att dagen kan vara för uppsplittrad.
- Om ett huvudblock har minst 3 underpunkter men under 10 minuter: varna att blocket verkar för kort för innehållet.
- Om te, frukost, meditation, andning, vila eller återhämtning har under 15 minuter: varna att återhämtande eller ritualbetonade moment kan behöva mer tid.

## Avgränsningar

Granskaren ska inte:

- skriva om planen
- stoppa användaren från att använda planen
- göra AI-anrop
- försöka förstå hela pedagogiska kvaliteten
- lägga till nya UI-knappar

UI:t visar redan warning-chip via metadata, så första versionen behöver inte nytt gränssnitt.

## Teknisk koppling

I `/api/plan` ska flödet vara:

```ts
const normalized = normalizeAiPlanResponse(text);
const reviewed = reviewAiPlanResponse(normalized, {
  planningMode,
  contextMode: mode === 'parts' ? 'plan' : 'agenda'
});
return json(reviewed);
```

## Testning

Lägg tester i `src/lib/ai-plan-engine.test.ts` för:

- tom plantext
- starttider i passläge
- för många huvudblock i `free-day`
- många underpunkter på för kort tid
- kort te/frukost/meditation/vila
- inga duplicerade warnings
