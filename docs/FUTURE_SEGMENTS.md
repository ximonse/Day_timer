# Future segments

Detta dokument beskriver hur Day Timer visar och hanterar sessioner som är längre än den aktuella klockvyn, till exempel ett 90-minuterspass i 1h-läge.

## Problem

I 1h-läge kan en session vara längre än ett varv. Om ett senare segment ritas ovanpå första varvet kan användaren se aktivitet från längre fram i passet, medan det som händer närmast tidvisaren skyms.

Målet är att:

- behålla tydligheten kring vad som händer nu och närmast framåt
- visa att det finns mer innehåll efter första varvet
- undvika att segment långt fram i tiden ser ut som om de ska göras direkt
- kunna justera omlottande segment med drag utan att lägga till synliga kontroller

## Lösning

Klockan delar upp 1h/2h-sessioner i varvbaserade sektorer.

- Stora ringen visar första varvet och den del av framtida varv som tidvisaren har nått fram till.
- Lilla innerringen visar kommande fortsättning efter tidvisaren när en session går över första varvet.
- Lilla innerringen är lika klar som segmentets ordinarie färg, men hälften så tjock som tidigare iteration.
- Segmentetiketter visas på den stora ringen. Om ett segment går över varvgränsen centreras etiketten på den synliga delen fram till tidvisaren.
- Segmentnamn för framtida fortsättning dupliceras inte i innerringen eftersom namnen redan finns i vänsterpanelen.

Inställningen `Visa fortsättning` finns under `Visning` och styr om innerringen visas. Den är på som default.

## Dragbeteende

Synliga kontroller har inte lagts till.

I stället finns osynliga dragytor:

- på ordinarie blockgränser i stora ringen
- utanför stora ringen för omlottande gränser och sluttid
- direkt på de små framtidsringarna när de representerar en dragbar gräns eller sluttid

Draglogiken väljer den varvposition som ligger närmast den gräns eller sluttid som användaren började dra. Det gör att en vinkel vid exempelvis 10 minuter kan tolkas som 70 minuter när gränsen faktiskt ligger i nästa varv.

Sessioner kan justeras upp till tre klockvarv via drag. Detta är en praktisk gräns för att möjliggöra omlott utan att öppna för mycket oavsiktlig skalförändring.

## Sparning och delning

`showFutureSegments` är en visningspreferens.

Den sparas i:

- lokal `AppState`
- workspace preferences
- legacy sync payloads
- live/share UI-state

Äldre sparningar utan fältet faller tillbaka till `true`.

## Kodstruktur

Geometrin är utbruten från `Clock.svelte` till `src/lib/clock-geometry.ts`.

`Clock.svelte` ansvarar för:

- SVG-rendering
- pointer-events
- koppling till dragcallbacks
- 12h-agendarendering

`clock-geometry.ts` ansvarar för:

- stora ringens 1h/2h-sektorer
- lilla framtidsringen
- wrap-handtag för blockgränser
- wrap-handtag för sluttid
- labelplacering för segment som passerar varvgränsen

## Testfall

`src/lib/clock-geometry.test.ts` täcker kärnfallet:

- 90 minuter i 1h-läge
- A 0-20, B 20-70, C 70-90
- tidvisaren vid 15 minuter
- stora ringens synliga sektorer
- lilla framtidsringen
- labelplacering för segment över varvgränsen
- draghandtag för omlottande gränser och sluttid
- att innerringen försvinner när tidvisaren passerat den framtida delen
