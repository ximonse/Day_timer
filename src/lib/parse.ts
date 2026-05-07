import { type Block, uid } from './state.svelte.js';

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
