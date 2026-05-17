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
      parts.push(t.slice(0, t.length - m[0].length).replace(/[\r\n]+/g, ' ').trim());
      parsedMins.push(Math.max(1, parseInt(m[1], 10)));
    } else {
      parts.push(t.replace(/[\r\n]+/g, ' ').trim());
      parsedMins.push(null);
    }
  }

  if (parts.length === 0) {
    return {
      blocks: [{ id: uid(), title: 'Lektion', minutes: 45, note: '', warning: true, pinned: false }],
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
      warning: existing?.warning ?? true,
      pinned: parsedMins[i] !== null,
    };
  });

  return { blocks, dayTitle, extraInfo: infoLines.join('\n') };
}

// ── Agenda parser ──────────────────────────────────────────────────────────

export interface AgendaDay {
  date: string | null;   // ISO YYYY-MM-DD, null = undated
  flows: Flow[];
}

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

// @YYMMDD, @YYYYMMDD or @YYYY-MM-DD → ISO string or null
function parseDateMarker(raw: string): string | null {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{8}$/.test(s)) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
  if (/^\d{6}$/.test(s)) {
    const y = 2000 + parseInt(s.slice(0, 2), 10);
    return `${y}-${s.slice(2, 4)}-${s.slice(4, 6)}`;
  }
  return null;
}

function sectionsToFlows(sections: RawSection[]): Flow[] {
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
      warnings: sec.items.map(() => true),
      notes: sec.items.map(b => b.note),
      extraInfo: sec.extraInfo,
    } satisfies Flow;
  });
}

export function totalFlowMinutes(flow: Flow): number {
  return flow.minutes.reduce((sum, minutes) => sum + minutes, 0);
}

export function mergeAgendaDayData(existing: string, incoming: AgendaDay[]): AgendaDay[] {
  const baseDays = existing.trim() ? parseAgenda(existing) : [];
  const dayMap = new Map<string, AgendaDay>();

  for (const day of baseDays) {
    dayMap.set(day.date ?? `undated-${dayMap.size}`, { ...day, flows: [...day.flows] });
  }

  for (const day of incoming) {
    const key = day.date ?? `undated-${dayMap.size}`;
    const existingDay = dayMap.get(key);
    if (!existingDay) {
      dayMap.set(key, { ...day, flows: [...day.flows] });
      continue;
    }

    const mergedFlows = [...existingDay.flows];
    for (const flow of day.flows) {
      const replaceIdx = mergedFlows.findIndex(existingFlow =>
        existingFlow.startMin === flow.startMin && existingFlow.title === flow.title
      );
      if (replaceIdx >= 0) mergedFlows[replaceIdx] = flow;
      else mergedFlows.push(flow);
    }
    mergedFlows.sort((a, b) => (a.startMin ?? 0) - (b.startMin ?? 0) || a.title.localeCompare(b.title));
    dayMap.set(key, { ...existingDay, flows: mergedFlows });
  }

  return [...dayMap.values()].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
}

export function parseAgenda(text: string): AgendaDay[] {
  const lines = text.split('\n').map(l => l.replace(/\s+$/, ''));
  const days: AgendaDay[] = [];
  let curDate: string | null = null;
  let sections: RawSection[] = [];
  let cur: RawSection | null = null;

  const flushDay = () => {
    if (cur) { sections.push(cur); cur = null; }
    if (sections.length > 0) {
      days.push({ date: curDate, flows: sectionsToFlows(sections) });
      sections = [];
    } else if (curDate !== null) {
      // date marker with no sessions yet — keep it open for next lines
    }
  };

  for (const rawLine of lines) {
    const t = rawLine.trim();
    if (!t) continue;

    // Date marker: @YYMMDD / @YYYYMMDD / @YYYY-MM-DD
    if (t.startsWith('@')) {
      const iso = parseDateMarker(t.slice(1));
      if (iso !== null) {
        // flush current day only if we have content
        if (cur) { sections.push(cur); cur = null; }
        if (sections.length > 0) {
          days.push({ date: curDate, flows: sectionsToFlows(sections) });
          sections = [];
        }
        curDate = iso;
        continue;
      }
    }

    // Session header: #Titel or #Titel 08:00
    if (t.startsWith('#')) {
      if (cur) sections.push(cur);
      const content = t.slice(1).trim();
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

    if (t.startsWith('& ') || t === '&') { cur.extraInfo = t.slice(1).trim(); continue; }

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

  // Flush last day
  if (cur) sections.push(cur);
  if (sections.length > 0) days.push({ date: curDate, flows: sectionsToFlows(sections) });

  return days;
}

export function serializeBlocks(blocks: Block[], dayTitle?: string, extraInfo?: string): string {
  const out: string[] = [];
  if (dayTitle) out.push(`# ${dayTitle}`);
  for (const b of blocks) {
    const title = b.title.replace(/[\r\n]+/g, ' ').trim();
    out.push(b.pinned ? `${title} ${b.minutes}m` : title);
    if (b.note) {
      for (const line of b.note.split('\n')) {
        if (line.trim()) out.push('- ' + line);
      }
    }
  }
  if (extraInfo) {
    for (const line of extraInfo.split('\n')) {
      if (line.trim()) out.push('& ' + line);
    }
  }
  return out.join('\n');
}

export function serializeAgenda(days: AgendaDay[]): string {
  const lines: string[] = [];
  let firstDay = true;
  for (const day of days) {
    if (!firstDay) lines.push('');
    firstDay = false;
    if (day.date !== null) {
      const [y, m, d] = day.date.split('-');
      lines.push(`@${y}${m}${d}`);
    }
    for (const flow of day.flows) {
      if (flow.startMin !== undefined) {
        const h = String(Math.floor(flow.startMin / 60)).padStart(2, '0');
        const mi = String(flow.startMin % 60).padStart(2, '0');
        lines.push(`#${flow.title} ${h}:${mi}`);
      } else {
        lines.push(`#${flow.title}`);
      }
      for (let i = 0; i < flow.parts.length; i++) {
        lines.push(`${flow.parts[i]} ${flow.minutes[i]}m`);
        if (flow.notes[i]) {
          for (const note of flow.notes[i].split('\n')) {
            if (note.trim()) lines.push(`- ${note}`);
          }
        }
      }
      if (flow.extraInfo) lines.push(`& ${flow.extraInfo}`);
    }
  }
  return lines.join('\n');
}
