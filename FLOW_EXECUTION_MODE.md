# Flödesläge

Flödesläge är ett separat sätt att genomföra en vanlig Day Timer-plan. Planeringen och dess tider är oförändrade; endast körmotorn byts.

## Lägen

- Tidsstyrt: nuvarande beteende. Tiden avslutar aktiviteten.
- Flöde: användaren avslutar aktiviteten med bocken.

## Tidsregler

1. En aktivitet som tar längre tid skjuter hela återstående passet framåt.
2. Tid som sparas används först för att minska en befintlig försening.
3. Återstående sparad tid läggs till nästa aktivitet.
4. Om sista aktiviteten blir klar med tid över skapas `*` för återhämtning.
5. Originalplanens tider skrivs aldrig över av utfallet.

## Data

Flödesmotorn håller plan och genomförande separerade:

- planerade minuter
- tilldelade minuter efter bonus
- faktisk aktiv tid
- ackumulerad försening
- återhämtningstid

Genomförandet är lokal runtime-state. Bekräftade aktivitetsutfall sparas i tidshistoriken för framtida rekommendationer.

## Arkitektur

- `flow-execution.ts` innehåller ren domänlogik.
- `flow-runtime.svelte.ts` ansvarar för lokal, återupptagningsbar runtime-state.
- `ExecutionModeToggle.svelte` är den enda nya kontrollen i minimenyn.
- Den tidsstyrda körmotorn ändras inte.

Fasta ankare ska kopplas till motorns paus/återuppta-funktioner i en separat implementation. De ska inte byggas genom specialfall i den tidsstyrda motorn.
