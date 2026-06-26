import { describe, expect, it } from 'vitest';
import {
  applyDayTextHeuristic,
  computeRecommendation,
  inferSubjectCategory,
  median,
  toJsonl
} from './learning.js';
import type { ActualTimeEntry } from './state.svelte.js';

function mkEntry(patch: Partial<ActualTimeEntry>): ActualTimeEntry {
  return {
    id: 'e1',
    date: '2026-05-14',
    agendaDate: '2026-05-14',
    title: 'Förbereda matematik',
    subjectCategory: 'Matematik',
    weekday: 4,
    startMin: 8 * 60,
    endMinActual: 8 * 60 + 30,
    durationActualMin: 30,
    dayTextSnapshot: '#Morgon',
    confirmed: true,
    confirmedAt: Date.now(),
    autoFinalized: false,
    ...patch
  };
}

describe('inferSubjectCategory', () => {
  it('klassar matematik', () => {
    expect(inferSubjectCategory('Förbered matte')).toBe('Matematik');
  });
  it('klassar NO', () => {
    expect(inferSubjectCategory('NO genomgång')).toBe('NO');
  });
  it('faller tillbaka till Övrigt', () => {
    expect(inferSubjectCategory('Öppning')).toBe('Övrigt');
  });
});

describe('median', () => {
  it('beräknar median för udda antal', () => {
    expect(median([10, 40, 20])).toBe(20);
  });
  it('beräknar median för jämnt antal', () => {
    expect(median([10, 20, 30, 40])).toBe(25);
  });
});

describe('computeRecommendation', () => {
  it('prioriterar title+category+weekday', () => {
    const history = [
      mkEntry({ durationActualMin: 20, weekday: 1 }),
      mkEntry({ durationActualMin: 35, weekday: 4 }),
      mkEntry({ durationActualMin: 25, weekday: 4 })
    ];
    const rec = computeRecommendation(history, 'Förbereda matematik', 'Matematik', 4);
    expect(rec?.minutes).toBe(30);
    expect(rec?.basis).toBe('title+category+weekday');
  });

  it('faller tillbaka till title+category', () => {
    const history = [
      mkEntry({ durationActualMin: 20, weekday: 1 }),
      mkEntry({ durationActualMin: 30, weekday: 2 })
    ];
    const rec = computeRecommendation(history, 'Förbereda matematik', 'Matematik', 5);
    expect(rec?.minutes).toBe(25);
    expect(rec?.basis).toBe('title+category');
  });

  it('exkluderar flödets aktivitetsposter och okonfirmerade poster från sessionsrekommendationen', () => {
    const history = [
      mkEntry({ durationActualMin: 30, weekday: 4 }),
      mkEntry({ durationActualMin: 2, weekday: 4, entryKind: 'activity', executionMode: 'flow' }),
      mkEntry({ durationActualMin: 2, weekday: 4, entryKind: 'activity', executionMode: 'flow' }),
      mkEntry({ durationActualMin: 90, weekday: 4, confirmed: false, confirmedAt: null }),
      mkEntry({ durationActualMin: 0, weekday: 4 })
    ];
    const rec = computeRecommendation(history, 'Förbereda matematik', 'Matematik', 4);
    expect(rec?.minutes).toBe(30);
    expect(rec?.sampleSize).toBe(1);
  });
});

describe('applyDayTextHeuristic', () => {
  it('ökar tid vid prov-signaler', () => {
    expect(applyDayTextHeuristic(30, 'Idag är det prov')).toBe(40);
  });
  it('sänker tid vid kort dag', () => {
    expect(applyDayTextHeuristic(30, 'Kort dag')).toBe(25);
  });
});

describe('toJsonl', () => {
  it('skapar en rad per post', () => {
    const jsonl = toJsonl([mkEntry({ id: 'a' }), mkEntry({ id: 'b' })]);
    expect(jsonl.split('\n')).toHaveLength(2);
  });
});
