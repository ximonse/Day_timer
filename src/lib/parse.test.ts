import { describe, it, expect, vi } from 'vitest';

// uid() från state.svelte.ts kan inte köras i node (Svelte runes).
// Vi mockar modulen och ger varje anrop ett unikt ID.
vi.mock('./state.svelte.js', () => {
  let counter = 0;
  return {
    uid: () => `test-id-${++counter}`,
  };
});

import { mergeAgendaDayData, parseParts, serializeBlocks, parseAgenda, serializeAgenda } from './parse.js';
import type { AgendaDay } from './parse.js';

// ── parseParts ────────────────────────────────────────────────────────────────

describe('parseParts — grundformat', () => {
  it('parsar ett enkelt block med tid', () => {
    const { blocks } = parseParts('Lektion 45m', []);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].title).toBe('Lektion');
    expect(blocks[0].minutes).toBe(45);
    expect(blocks[0].pinned).toBe(true);
  });

  it('parsar flera block', () => {
    const { blocks } = parseParts('Lektion 45m\nRast 10m', []);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].title).toBe('Lektion');
    expect(blocks[1].title).toBe('Rast');
    expect(blocks[1].minutes).toBe(10);
  });

  it('parsar #-rubrik som dayTitle', () => {
    const { dayTitle } = parseParts('#Måndag\nLektion 30m', []);
    expect(dayTitle).toBe('Måndag');
  });

  it('parsar &-rad som kommentar på senaste aktivitet', () => {
    const { blocks, extraInfo } = parseParts('Lektion 30m\n& Kom ihåg möte', []);
    expect(blocks[0].note).toBe('Kom ihåg möte');
    expect(extraInfo).toBe('');
  });

  it('parsar &&-rad som extraInfo', () => {
    const { extraInfo } = parseParts('Lektion 30m\n&& Kom ihåg möte', []);
    expect(extraInfo).toBe('Kom ihåg möte');
  });

  it('parsar notering med bindestreck', () => {
    const { blocks } = parseParts('Frukost 20m\n- ta med kaffe', []);
    expect(blocks[0].note).toBe('ta med kaffe');
  });

  it('flera noteringar på samma block', () => {
    const { blocks } = parseParts('Frukost 20m\n- kaffe\n- juice', []);
    expect(blocks[0].note).toBe('kaffe\njuice');
  });

  it('nya block får varningar påslagna som standard', () => {
    const { blocks } = parseParts('Lektion 45m', []);
    expect(blocks[0].warning).toBe(true);
  });
});

describe('parseParts — opinnade block', () => {
  it('block utan tid markeras som ej pinnat', () => {
    const { blocks } = parseParts('Aktivitet', []);
    expect(blocks[0].pinned).toBe(false);
  });

  it('opinnade block delar på återstående tid från befintliga block', () => {
    const existing = [{ id: 'x', title: 'X', minutes: 60, note: '', warning: false, pinned: false }];
    const { blocks } = parseParts('A\nB', existing);
    expect(blocks.map(b => b.minutes)).toEqual([30, 30]);
  });

  it('fördelar om opinnade block när fler aktiviteter skrivs in', () => {
    const existing = [{ id: 'x', title: 'A', minutes: 60, note: '', warning: false, pinned: false }];
    const { blocks } = parseParts('A\nB\nC', existing);

    expect(blocks.map(b => b.minutes)).toEqual([20, 20, 20]);
  });

  it('blandat pinnate och opinnate block', () => {
    const { blocks } = parseParts('Fast 20m\nFri', []);
    expect(blocks[0].pinned).toBe(true);
    expect(blocks[0].minutes).toBe(20);
    expect(blocks[1].pinned).toBe(false);
  });

  it('parsar run-until-checked med procenttecken', () => {
    const { blocks } = parseParts('Diskussion %\nAvslut 5m', []);

    expect(blocks[0]).toMatchObject({
      title: 'Diskussion',
      minutes: 10,
      pinned: false,
      runUntilChecked: true
    });
    expect(blocks[1].runUntilChecked).toBeFalsy();
  });
});

describe('parseParts — fallback', () => {
  it('tom inmatning ger ett default-block', () => {
    const { blocks } = parseParts('', []);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].title).toBe('Lektion');
    expect(blocks[0].minutes).toBe(45);
  });

  it('bara blankrader ger ett default-block', () => {
    const { blocks } = parseParts('   \n\n  ', []);
    expect(blocks).toHaveLength(1);
  });

  it('bevarar id från befintliga block', () => {
    const existing = [{ id: 'keep-me', title: 'X', minutes: 10, note: '', warning: false, pinned: true }];
    const { blocks } = parseParts('Ny titel 10m', existing);
    expect(blocks[0].id).toBe('keep-me');
  });
});

// ── serializeBlocks ───────────────────────────────────────────────────────────

describe('serializeBlocks', () => {
  it('pinnadt block serialiseras med tid', () => {
    const result = serializeBlocks([{ id: '1', title: 'Lektion', minutes: 45, note: '', warning: false, pinned: true }]);
    expect(result).toBe('Lektion 45m');
  });

  it('opinnadt block serialiseras utan tid', () => {
    const result = serializeBlocks([{ id: '1', title: 'Fritt', minutes: 30, note: '', warning: false, pinned: false }]);
    expect(result).toBe('Fritt');
  });

  it('run-until-checked block serialiseras med procenttecken', () => {
    const result = serializeBlocks([{ id: '1', title: 'Diskussion', minutes: 18, note: '', warning: false, pinned: false, runUntilChecked: true }]);
    expect(result).toBe('Diskussion %');
  });

  it('noteringar serialiseras som -rader', () => {
    const result = serializeBlocks([{ id: '1', title: 'Mat', minutes: 20, note: 'ta tallrik', warning: false, pinned: true }]);
    expect(result).toBe('Mat 20m\n- ta tallrik');
  });

  it('extraInfo serialiseras som &&-rader', () => {
    const result = serializeBlocks([{ id: '1', title: 'Mat', minutes: 20, note: '', warning: false, pinned: true }], undefined, 'övergripande');
    expect(result).toBe('Mat 20m\n&& övergripande');
  });

  it('roundtrip: serialisera → parsa ger samma titlar och tider', () => {
    const original = [
      { id: '1', title: 'Lektion', minutes: 45, note: '', warning: false, pinned: true },
      { id: '2', title: 'Rast', minutes: 10, note: 'ute', warning: false, pinned: true },
    ];
    const text = serializeBlocks(original);
    const { blocks } = parseParts(text, original);
    expect(blocks[0].title).toBe('Lektion');
    expect(blocks[0].minutes).toBe(45);
    expect(blocks[1].title).toBe('Rast');
    expect(blocks[1].minutes).toBe(10);
    expect(blocks[1].note).toBe('ute');
  });
});

// ── parseAgenda ───────────────────────────────────────────────────────────────

describe('parseAgenda — datummarkörer', () => {
  it('parsar @YYYYMMDD', () => {
    const days = parseAgenda('@20260509\n#Morgon\nLektion 45m');
    expect(days[0].date).toBe('2026-05-09');
  });

  it('parsar @YYMMDD', () => {
    const days = parseAgenda('@260509\n#Morgon\nLektion 45m');
    expect(days[0].date).toBe('2026-05-09');
  });

  it('parsar @YYYY-MM-DD', () => {
    const days = parseAgenda('@2026-05-09\n#Morgon\nLektion 45m');
    expect(days[0].date).toBe('2026-05-09');
  });

  it('utan datummarkör ger date=null', () => {
    const days = parseAgenda('#Morgon\nLektion 45m');
    expect(days[0].date).toBeNull();
  });

  it('flera dagar separeras korrekt', () => {
    const text = '@20260509\n#Morgon\nLektion 45m\n@20260510\n#Kväll\nYoga 30m';
    const days = parseAgenda(text);
    expect(days).toHaveLength(2);
    expect(days[0].date).toBe('2026-05-09');
    expect(days[1].date).toBe('2026-05-10');
  });

  it('tål AI-text där datum och session har tappat radbrytning', () => {
    const days = parseAgenda('@260526#Kväll 18:00\nMiddag 45m');

    expect(days[0].date).toBe('2026-05-26');
    expect(days[0].flows[0].title).toBe('Kväll');
    expect(days[0].flows[0].startMin).toBe(18 * 60);
  });
});

describe('parseAgenda — sessioner', () => {
  it('parsar sessionrubrik med starttid', () => {
    const days = parseAgenda('#Lektion 08:30\nMatematik 45m');
    const flow = days[0].flows[0];
    expect(flow.title).toBe('Lektion');
    expect(flow.startMin).toBe(8 * 60 + 30);
  });

  it('gör tom sessionrubrik till synligt pass', () => {
    const days = parseAgenda('#Hemresa 20:00 <!--id:2v5c0mv-->');
    const flow = days[0].flows[0];

    expect(flow.id).toBe('2v5c0mv');
    expect(flow.title).toBe('Hemresa');
    expect(flow.startMin).toBe(20 * 60);
    expect(flow.parts).toEqual(['Hemresa']);
    expect(flow.minutes).toEqual([60]);
  });

  it('gör tom sessionrubrik fram till nästa starttid', () => {
    const days = parseAgenda('#Hemresa 20:00\n#Kväll 20:30\nTe 10m');

    expect(days[0].flows[0].parts).toEqual(['Hemresa']);
    expect(days[0].flows[0].minutes).toEqual([30]);
  });

  it('parsar sessionrubrik med start- och sluttid som passlängd', () => {
    const days = parseAgenda('#Lektion 10:00-11:55\nGenomgång\nEget arbete');
    const flow = days[0].flows[0];
    expect(flow.title).toBe('Lektion');
    expect(flow.startMin).toBe(10 * 60);
    expect(flow.minutes).toEqual([58, 57]);
  });

  it('parsar sessionrubrik med starttid och minutlängd', () => {
    const days = parseAgenda('#Lektion 10:00 115m\nGenomgång\nEget arbete');
    const flow = days[0].flows[0];
    expect(flow.title).toBe('Lektion');
    expect(flow.startMin).toBe(10 * 60);
    expect(flow.minutes).toEqual([58, 57]);
  });

  it('parsar sessionrubrik med starttid och timlängd', () => {
    const days = parseAgenda('#Lektion 10:00 1h55m\nGenomgång\nEget arbete');
    expect(days[0].flows[0].minutes).toEqual([58, 57]);
  });

  it('prioriterar explicit rubrikslängd framför nästa sessions starttid', () => {
    const days = parseAgenda('#Förmiddag 10:00-11:55\nGenomgång\nEget arbete\n#Eftermiddag 12:30\nLäsning 20m');
    expect(days[0].flows[0].minutes).toEqual([58, 57]);
    expect(days[0].flows[1].startMin).toBe(12 * 60 + 30);
  });

  it('använder rubrikslängd som återstående tid efter fasta aktiviteter', () => {
    const days = parseAgenda('#Lektion 10:00-11:00\nStart 10m\nEget arbete');
    expect(days[0].flows[0].minutes).toEqual([10, 50]);
  });

  it('tolkar punktlistor direkt under tidsatt session som aktiviteter', () => {
    const days = parseAgenda('#Lektion 10:00 60m\n- Genomgång\n- Eget arbete');
    const flow = days[0].flows[0];

    expect(flow.title).toBe('Lektion');
    expect(flow.parts).toEqual(['Genomgång', 'Eget arbete']);
    expect(flow.minutes).toEqual([30, 30]);
    expect(flow.notes).toEqual(['', '']);
  });

  it('tolkar markdownrubrik direkt under tidsatt session som aktivitet', () => {
    const days = parseAgenda('#Lektion 10:00 60m\n# Genomgång\nEget arbete');
    const flow = days[0].flows[0];

    expect(days[0].flows).toHaveLength(1);
    expect(flow.parts).toEqual(['Genomgång', 'Eget arbete']);
    expect(flow.minutes).toEqual([30, 30]);
  });

  it('skapar nytt pass för #titel utan mellanslag under tidsatt session', () => {
    const days = parseAgenda('#Lektion 10:00 60m\nGenomgång 30m\n#Nytt pass');

    expect(days[0].flows).toHaveLength(2);
    expect(days[0].flows[0].title).toBe('Lektion');
    expect(days[0].flows[1].title).toBe('Nytt pass');
  });

  it('parsar aktiviteter med tid', () => {
    const days = parseAgenda('#Session\nMatematik 45m\nRast 10m');
    const flow = days[0].flows[0];
    expect(flow.parts).toEqual(['Matematik', 'Rast']);
    expect(flow.minutes).toEqual([45, 10]);
  });

  it('parsar run-until-checked i agenda', () => {
    const days = parseAgenda('#Session\nDiskussion %\nAvslut 5m');
    const flow = days[0].flows[0];

    expect(flow.parts).toEqual(['Diskussion', 'Avslut']);
    expect(flow.minutes).toEqual([10, 5]);
    expect(flow.runUntilChecked).toEqual([true, false]);
  });

  it('parsar noteringar på aktiviteter', () => {
    const days = parseAgenda('#Session\nFrukost 20m\n- ta med kaffe');
    const flow = days[0].flows[0];
    expect(flow.notes[0]).toBe('ta med kaffe');
  });

  it('parsar &-rader som kommentar på senaste aktivitet', () => {
    const days = parseAgenda('#Session\nLektion 45m\n& Kom ihåg läxor');
    const flow = days[0].flows[0];
    expect(flow.notes[0]).toBe('Kom ihåg läxor');
    expect(flow.extraInfo).toBe('');
  });

  it('parsar &&-rader som extraInfo', () => {
    const days = parseAgenda('#Session\nLektion 45m\n&& Kom ihåg läxor');
    const flow = days[0].flows[0];
    expect(flow.extraInfo).toBe('Kom ihåg läxor');
  });

  it('agendaimport sätter varningar på som standard', () => {
    const days = parseAgenda('#Session\nLektion 45m\nRast 10m');
    expect(days[0].flows[0].warnings).toEqual([true, true]);
  });

  it('tål kollapsad session med id och aktivitet direkt efter rubriken', () => {
    const days = parseAgenda('@260526#Väckning 07:00 <!--id:f0vrjot-->Väckning och ihoppackning 60m');
    const flow = days[0].flows[0];

    expect(days[0].date).toBe('2026-05-26');
    expect(flow.id).toBe('f0vrjot');
    expect(flow.title).toBe('Väckning');
    expect(flow.parts).toEqual(['Väckning och ihoppackning']);
    expect(flow.minutes).toEqual([60]);
  });

  it('tål kollapsad session med id och lös minutartefakt efter rubriken', () => {
    const days = parseAgenda('@260526#Väckning 07:00 <!--id:f0vrjot-->- 1mVäckning och ihoppackning 60m');
    const flow = days[0].flows[0];

    expect(days[0].date).toBe('2026-05-26');
    expect(flow.id).toBe('f0vrjot');
    expect(flow.parts).toEqual(['Väckning och ihoppackning']);
    expect(flow.minutes).toEqual([60]);
  });

  it('tom text ger inga dagar', () => {
    expect(parseAgenda('')).toHaveLength(0);
    expect(parseAgenda('   \n\n')).toHaveLength(0);
  });
});

describe('mergeAgendaDayData', () => {
  it('bevarar befintliga pass när AI bara lägger till senare pass samma dag', () => {
    const existing = '@260526\n#Morgon 08:00\nFrukost 20m\n#Jobb 10:00\nFokus 60m';
    const incoming = parseAgenda('@260526\n#Kväll 18:00\nMiddag 45m\nVila 30m');
    const merged = mergeAgendaDayData(existing, incoming);

    expect(merged).toHaveLength(1);
    expect(merged[0].flows.map(flow => flow.title)).toEqual(['Morgon', 'Jobb', 'Kväll']);
  });

  it('ersätter matchande pass men tar inte bort andra pass', () => {
    const existing = '@260526\n#Morgon 08:00\nFrukost 20m\n#Kväll 18:00\nMiddag 30m';
    const incoming = parseAgenda('@260526\n#Kväll 18:00\nMiddag 45m');
    const merged = mergeAgendaDayData(existing, incoming);

    expect(merged[0].flows.map(flow => flow.title)).toEqual(['Morgon', 'Kväll']);
    expect(merged[0].flows[1].minutes).toEqual([45]);
  });
});

// ── serializeAgenda ───────────────────────────────────────────────────────────

describe('serializeAgenda — roundtrip', () => {
  it('datum bevaras via roundtrip (fyrsiffrigt år)', () => {
    const days: AgendaDay[] = parseAgenda('@20260509\n#Morgon 08:00\nLektion 45m');
    const text = serializeAgenda(days);
    expect(text).toContain('@260509');
    const days2 = parseAgenda(text);
    expect(days2[0].date).toBe('2026-05-09');
  });

  it('tvåsiffrigt år i gammal data parsas korrekt (bakåtkompabilitet)', () => {
    const days = parseAgenda('@260509\n#Morgon\nLektion 45m');
    expect(days[0].date).toBe('2026-05-09');
  });

  it('blocktitel med radbrytning saniteras i serializeBlocks', () => {
    const blocks = [{ id: '1', title: 'Matematik\nExtra', minutes: 45, note: '', warning: true, pinned: true }];
    const text = serializeBlocks(blocks);
    expect(text).not.toContain('\n');
    expect(text).toBe('Matematik Extra 45m');
  });

  it('starttid bevaras via roundtrip', () => {
    const days = parseAgenda('#Morgon 09:15\nLektion 45m');
    const text = serializeAgenda(days);
    const days2 = parseAgenda(text);
    expect(days2[0].flows[0].startMin).toBe(9 * 60 + 15);
  });

  it('kan serialisera utan interna id-taggar', () => {
    const days = parseAgenda('#Morgon 09:15 <!--id:abc123-->\nLektion 45m');
    const text = serializeAgenda(days, { includeIds: false });
    expect(text).not.toContain('<!--id:');
    expect(text).toContain('#Morgon 09:15');
  });

  it('aktivitetstider bevaras via roundtrip', () => {
    const days = parseAgenda('#Session\nLektion 45m\nRast 10m');
    const text = serializeAgenda(days);
    const days2 = parseAgenda(text);
    expect(days2[0].flows[0].minutes).toEqual([45, 10]);
  });

  it('run-until-checked bevaras via agenda roundtrip', () => {
    const days = parseAgenda('#Session\nDiskussion %\nAvslut 5m');
    const text = serializeAgenda(days);
    const days2 = parseAgenda(text);

    expect(text).toContain('Diskussion %');
    expect(days2[0].flows[0].runUntilChecked).toEqual([true, false]);
  });

  it('extraInfo bevaras som && via roundtrip', () => {
    const days = parseAgenda('#Session\nLektion 45m\n&& Nederst');
    const text = serializeAgenda(days);
    expect(text).toContain('&& Nederst');
    const days2 = parseAgenda(text);
    expect(days2[0].flows[0].extraInfo).toBe('Nederst');
  });
});
