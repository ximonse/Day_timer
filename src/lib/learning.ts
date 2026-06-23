import type { ActualTimeEntry } from './state.svelte.js';

export interface TimeRecommendation {
  minutes: number;
  sampleSize: number;
  basis: 'title+category+weekday' | 'title+category' | 'title';
}

export function inferSubjectCategory(title: string): string {
  const t = title.toLowerCase();
  if (/(matte|matematik|algebra|geometri)/.test(t)) return 'Matematik';
  if (/(no|fysik|kemi|biologi|naturkunskap)/.test(t)) return 'NO';
  if (/(svenska|läsning|lasning|språk|sprak)/.test(t)) return 'Språk';
  if (/(idrott|gympa|träning|traning)/.test(t)) return 'Idrott';
  if (/(frukost|lunch|middag|fika)/.test(t)) return 'Måltid';
  return 'Övrigt';
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function computeRecommendation(
  history: ActualTimeEntry[],
  title: string,
  category: string,
  weekday: number
): TimeRecommendation | null {
  const normalizedTitle = title.trim().toLowerCase();
  const base = history.filter((entry) => entry.confirmed && entry.durationActualMin > 0 && entry.entryKind !== 'activity');
  if (!base.length) return null;

  const byTitleCategoryWeekday = base.filter((entry) =>
    entry.title.trim().toLowerCase() === normalizedTitle &&
    entry.subjectCategory === category &&
    entry.weekday === weekday
  );
  if (byTitleCategoryWeekday.length) {
    return {
      minutes: median(byTitleCategoryWeekday.map((entry) => entry.durationActualMin)),
      sampleSize: byTitleCategoryWeekday.length,
      basis: 'title+category+weekday'
    };
  }

  const byTitleCategory = base.filter((entry) =>
    entry.title.trim().toLowerCase() === normalizedTitle &&
    entry.subjectCategory === category
  );
  if (byTitleCategory.length) {
    return {
      minutes: median(byTitleCategory.map((entry) => entry.durationActualMin)),
      sampleSize: byTitleCategory.length,
      basis: 'title+category'
    };
  }

  const byTitle = base.filter((entry) => entry.title.trim().toLowerCase() === normalizedTitle);
  if (!byTitle.length) return null;
  return {
    minutes: median(byTitle.map((entry) => entry.durationActualMin)),
    sampleSize: byTitle.length,
    basis: 'title'
  };
}

export function applyDayTextHeuristic(recommendationMin: number, dayText: string): number {
  const t = dayText.toLowerCase();
  let adjusted = recommendationMin;
  if (/(prov|nationellt prov|bedömning)/.test(t)) adjusted += 10;
  if (/(utflykt|vikarie|stök|stok)/.test(t)) adjusted += 5;
  if (/(kort dag|halvdag|förenklad|forenklad)/.test(t)) adjusted -= 5;
  return Math.max(5, adjusted);
}

export function toJsonl(entries: ActualTimeEntry[]): string {
  return entries
    .map((entry) => JSON.stringify(entry))
    .join('\n');
}
