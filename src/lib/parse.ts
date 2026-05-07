import { type Block, type Flow, uid } from './state.svelte.js';

export interface ParseResult {
  blocks: Block[];
  dayTitle: string;
  extraInfo: string;
}

export function parseParts(raw: string, existingBlocks: Block[]): ParseResult {
  const lines = raw.split('\n').map(l => l.replace(/\s+$/, '')).filter(l => l.trim().length > 0);
  const parts: string[] = [];
  const notes: string[] = [];
  const parsedMins: (number | null)[] = [];
  const infoLines: string[] = [];
  let dayTitle = '';

  for (const l of lines) {
    const t = l.trim();
    if (t.startsWith('#')) {
      const title = t.slice(1).trim();
      if (title) dayTitle = title;
      continue;
    }
    if (t.startsWith('&')) {
      infoLines.push(t.slice(1).trim());
      continue;
    }
    if (t.startsWith('-') && parts.length > 0) {
      const sub = t.replace(/^-\s*/, '');
      notes[parts.length - 1] = notes[parts.length - 1]
        ? notes[parts.length - 1] + '\n' + sub
        : sub;
      continue;
    }
    const m = t.match(/\s+(\d+)m$/i);
    if (m) {
      parts.push(t.slice(0, t.length - m[0].length));
      parsedMins.push(Math.max(1, parseInt(m[1], 10)));
    } else {
      parts.push(t);
      parsedMins.push(null);
    }
  }

  if (parts.length === 0) {
    return {
      blocks: [{ id: uid(), title: 'Lektion', minutes: 45, note: '', warning: false, pinned: false }],
      dayTitle,
      extraInfo: infoLines.join('\n'),
    };
  }

  const totalExisting = existingBlocks.reduce((a, b) => a + b.minutes, 0) || 45;
  const pinnedSum = parsedMins.reduce<number>((sum, m) => sum + (m ?? 0), 0);
  const unpinnedCount = parsedMins.filter(m => m === null).length;
  const each = unpinnedCount > 0
    ? Math.max(2, Math.round(Math.max(unpinnedCount * 2, totalExisting - pinnedSum) / unpinnedCount))
    : 0;

  const blocks: Block[] = parts.map((title, i) => {
    const existing = existingBlocks[i];
    return {
      id: existing?.id ?? uid(),
      title,
      minutes: parsedMins[i] !== null ? parsedMins[i]! : (existing?.minutes ?? each),
      note: notes[i] ?? '',
      warning: existing?.warning ?? false,
      pinned: parsedMins[i] !== null,
    };
  });

  return { blocks, dayTitle, extraInfo: infoLines.join('\n') };
}

// ── Agenda parser ──────────────────────────────────────────────────────────

interface RawSection {
  title: string;
  startMin?: number;
  items: { title: string; minutes: number | null; note: string }[];
  extraInfo: string;
}

function parseTimeStr(s: string): number | undefined {
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return undefined;
  const h = parseInt(m[1], 10), min = parseInt(m[2], 10);
  return isNaN(h) || isNaN(min) ? undefined : h * 60 + min;
}

export function parseAgenda(text: string): Flow[] {
  const lines = text.split('\n').map(l => l.replace(/\s+$/, ''));
  const sections: RawSection[] = [];
  let cur: RawSection | null = null;

  for (const rawLine of lines) {
    const t = rawLine.trim();
    if (!t) continue;

    if (t.startsWith('#')) {
      if (cur) sections.push(cur);
      const content = t.slice(1).trim();
      // Optional time at end: "#Titel 08:00"
      const timeMatch = content.match(/^(.*?)\s+(\d{1,2}:\d{2})\s*$/);
      let title = content;
      let startMin: number | undefined;
      if (timeMatch) {
        const parsed = parseTimeStr(timeMatch[2]);
        if (parsed !== undefined) { title = timeMatch[1].trim() || 'Session'; startMin = parsed; }
      }
      cur = { title: title || 'Session', startMin, items: [], extraInfo: '' };
      continue;
    }

    if (!cur) cur = { title: 'Session', startMin: undefined, items: [], extraInfo: '' };

    if (t.startsWith('& ') || t === '&') {
      cur.extraInfo = t.slice(1).trim();
      continue;
    }

    if (t.startsWith('-') && cur.items.length > 0) {
      const note = t.replace(/^-\s*/, '');
      const last = cur.items[cur.items.length - 1];
      last.note = last.note ? last.note + '\n' + note : note;
      continue;
    }

    const mMatch = t.match(/^(.*?)\s+(\d+)\s*m(?:in)?\s*$/i);
    if (mMatch) {
      cur.items.push({ title: mMatch[1].trim(), minutes: Math.max(1, parseInt(mMatch[2], 10)), note: '' });
    } else {
      cur.items.push({ title: t, minutes: null, note: '' });
    }
  }
  if (cur) sections.push(cur);

  return sections.map((sec, i) => {
    const next = sections[i + 1];
    let available = 60;
    if (sec.startMin !== undefined && next?.startMin !== undefined && next.startMin > sec.startMin) {
      available = next.startMin - sec.startMin;
    }

    const pinnedSum = sec.items.reduce((a, b) => a + (b.minutes ?? 0), 0);
    const unpinnedCount = sec.items.filter(b => b.minutes === null).length;
    const perUnpinned = unpinnedCount > 0
      ? Math.max(1, Math.round(Math.max(unpinnedCount, available - pinnedSum) / unpinnedCount))
      : 0;

    return {
      id: uid(),
      title: sec.title,
      startMin: sec.startMin,
      parts: sec.items.map(b => b.title),
      minutes: sec.items.map(b => b.minutes !== null ? b.minutes : perUnpinned),
      warnings: sec.items.map(() => false),
      notes: sec.items.map(b => b.note),
      extraInfo: sec.extraInfo,
    } satisfies Flow;
  });
}

export function serializeBlocks(blocks: Block[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    out.push(b.pinned ? `${b.title} ${b.minutes}m` : b.title);
    if (b.note) {
      for (const line of b.note.split('\n')) {
        if (line.trim()) out.push('-' + line);
      }
    }
  }
  return out.join('\n');
}
