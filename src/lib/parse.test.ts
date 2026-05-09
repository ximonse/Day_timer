import { describe, it, expect, vi } from 'vitest';

// uid() från state.svelte.ts kan inte köras i node (Svelte runes).
// Vi mockar modulen och ger varje anrop ett unikt ID.
vi.mock('./state.svelte.js', () => {
  let counter = 0;
  return {
    uid: () => `test-id-${++counter}`,
  };
});

import { parseParts, serializeBlocks, parseAgenda, serializeAgenda } from './parse.js';
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

  it('parsar &-rad som extraInfo', () => {
    const { extraInfo } = parseParts('Lektion 30m\n& Kom ihåg möte', []);
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
});

describe('parseParts — opinnade block', () => {
  it('block utan tid markeras som ej pinnat', () => {
    const { blocks } = parseParts('Aktivitet', []);
    expect(blocks[0].pinned).toBe(false);
  });

  it('opinnade block delar på återstående tid från befintliga block', () => {
    const existing = [{ id: 'x', title: 'X', minutes: 60, note: '', warning: false, pinned: false }];
    const { blocks } = parseParts('A\nB', existing);
    // 60 min totalt, 2 opinnada → ca 30 var
    expect(blocks[0].minutes + blocks[1].minutes).toBeGreaterThanOrEqual(30);
  });

  it('blandat pinnate och opinnate block', () => {
    const { blocks } = parseParts('Fast 20m\nFri', []);
    expect(blocks[0].pinned).toBe(true);
    expect(blocks[0].minutes).toBe(20);
    expect(blocks[1].pinned).toBe(false);
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

  it('noteringar serialiseras som -rader', () => {
    const result = serializeBlocks([{ id: '1', title: 'Mat', minutes: 20, note: 'ta tallrik', warning: false, pinned: true }]);
    expect(result).toBe('Mat 20m\n-ta tallrik');
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
});

describe('parseAgenda — sessioner', () => {
  it('parsar sessionrubrik med starttid', () => {
    const days = parseAgenda('#Lektion 08:30\nMatematik 45m');
    const flow = days[0].flows[0];
    expect(flow.title).toBe('Lektion');
    expect(flow.startMin).toBe(8 * 60 + 30);
  });

  it('parsar aktiviteter med tid', () => {
    const days = parseAgenda('#Session\nMatematik 45m\nRast 10m');
    const flow = days[0].flows[0];
    expect(flow.parts).toEqual(['Matematik', 'Rast']);
    expect(flow.minutes).toEqual([45, 10]);
  });

  it('parsar noteringar på aktiviteter', () => {
    const days = parseAgenda('#Session\nFrukost 20m\n- ta med kaffe');
    const flow = days[0].flows[0];
    expect(flow.notes[0]).toBe('ta med kaffe');
  });

  it('parsar &-rader som extraInfo', () => {
    const days = parseAgenda('#Session\nLektion 45m\n& Kom ihåg läxor');
    const flow = days[0].flows[0];
    expect(flow.extraInfo).toBe('Kom ihåg läxor');
  });

  it('tom text ger inga dagar', () => {
    expect(parseAgenda('')).toHaveLength(0);
    expect(parseAgenda('   \n\n')).toHaveLength(0);
  });
});

// ── serializeAgenda ───────────────────────────────────────────────────────────

describe('serializeAgenda — roundtrip', () => {
  it('datum bevaras via roundtrip', () => {
    const days: AgendaDay[] = parseAgenda('@20260509\n#Morgon 08:00\nLektion 45m');
    const text = serializeAgenda(days);
    expect(text).toContain('@260509');
    const days2 = parseAgenda(text);
    expect(days2[0].date).toBe('2026-05-09');
  });

  it('starttid bevaras via roundtrip', () => {
    const days = parseAgenda('#Morgon 09:15\nLektion 45m');
    const text = serializeAgenda(days);
    const days2 = parseAgenda(text);
    expect(days2[0].flows[0].startMin).toBe(9 * 60 + 15);
  });

  it('aktivitetstider bevaras via roundtrip', () => {
    const days = parseAgenda('#Session\nLektion 45m\nRast 10m');
    const text = serializeAgenda(days);
    const days2 = parseAgenda(text);
    expect(days2[0].flows[0].minutes).toEqual([45, 10]);
  });
});
