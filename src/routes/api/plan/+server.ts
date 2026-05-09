import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '$env/dynamic/private';

const PARTS_SYSTEM = `Du är en assistent som hjälper användaren planera en session (timmen eller mindre).
Användaren beskriver vad de ska göra — hur informellt som helst.

Returnera BARA en färdig lista i det här formatet — inget annat, inga förklaringar:

Vakna 5m

Toa 5m
- ta med telefonen

Medicin 2m

Frukost 15m
- kolla inte skärm

& Kom ihåg att det är möte kl 9.

Regler:
- Realistiska minutuppskattningar baserat på aktiviteten
- Rimlig ordning (t.ex. vakna → toa → medicin → frukost)
- Lägg till 2–3 aktiviteter om användaren troligen glömt men som passar sammanhanget
- Namn på svenska, korta (max 3 ord)
- Underpunkter måste börja med ett streck: -
- Underpunkter har ingen tid
- Ny rad mellan varje aktivitet
- Kommentarer under listan börjar med & i början av raden
- Inga rubriker, ingen inledning, ingen avslutning — bara listan`;

function agendaSystemPrompt(todayISO: string): string {
  return `Du är en assistent som hjälper användaren planera hela eller delar av en dag.
Användaren beskriver sina aktiviteter och sessioner — hur informellt som helst.
Dagens datum är ${todayISO}.

Returnera BARA en dagplan i exakt det här formatet — inget annat, inga förklaringar:

@${todayISO.replace(/-/g, '').slice(2)}
#Morgonrutin 07:00
Vakna 5m
Toa 5m
Frukost 20m
- kolla inte skärm

#Arbetspass 09:00
Planering 10m
Epost 20m
Djuparbete 60m
- stäng av notiser

& Glöm inte: möte kl 14

Regler:
- Använd formatet @YYMMDD för datum (exempel: @260509 för 2026-05-09)
- Använd #Rubrik HH:MM för varje session (rubrik max 3 ord)
- Aktiviteter med tid: Aktivitet Nm (t.ex. "Frukost 20m")
- Underpunkter börjar med -
- Kommentarer för hela dagen börjar med &
- Realistiska minutuppskattningar
- Rimlig ordning och pauser mellan sessioner
- Lägg till nödvändiga övergångsaktiviteter om de saknas
- Namn på svenska, korta (max 3 ord per aktivitet)
- Inga förklaringar, ingen inledning — bara planen`;
}

export const POST: RequestHandler = async ({ request }) => {
  const { apiKey, message, mode, context } = await request.json() as {
    apiKey?: string;
    message: string;
    mode: 'parts' | 'agenda';
    context?: { startMin?: number; date?: string };
  };

  const key = env.ANTHROPIC_API_KEY || apiKey;
  if (!key) return json({ error: 'Ingen API-nyckel konfigurerad' }, { status: 400 });
  if (!message?.trim()) return json({ error: 'Inget meddelande' }, { status: 400 });

  const todayISO = context?.date ?? new Date().toISOString().slice(0, 10);
  const systemPrompt = mode === 'agenda' ? agendaSystemPrompt(todayISO) : PARTS_SYSTEM;

  try {
    const client = new Anthropic({ apiKey: key });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return json({ text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Okänt fel';
    return json({ error: msg }, { status: 500 });
  }
};
