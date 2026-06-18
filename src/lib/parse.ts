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
      dayTitle = t.slice(1).trim();
      continue;
    }
    if (t.startsWith('&&')) {
      infoLines.push(t.slice(2).trim());
      continue;
    }
    if (t.startsWith('&')) {
      const comment = t.slice(1).trim();
      if (parts.length > 0) {
        notes[parts.length - 1] = notes[parts.length - 1]
          ? notes[parts.length - 1] + '\n' + comment
          : comment;
      } else {
        infoLines.push(comment);
      }
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
  const unpinnedTotal = Math.max(unpinnedCount * 2, totalExisting - pinnedSum);
  const unpinnedBase = unpinnedCount > 0 ? Math.floor(unpinnedTotal / unpinnedCount) : 0;
  let unpinnedRemainder = unpinnedCount > 0 ? unpinnedTotal - unpinnedBase * unpinnedCount : 0;

  const blocks: Block[] = parts.map((title, i) => {
    const existing = existingBlocks[i];
    let minutes = parsedMins[i];
    if (minutes === null) {
      const extra = unpinnedRemainder > 0 ? 1 : 0;
      if (unpinnedRemainder > 0) unpinnedRemainder -= 1;
      minutes = unpinnedBase + extra;
    }
    return {
      id: existing?.id ?? uid(),
      title,
      minutes,
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

export interface SerializeAgendaOptions {
  includeIds?: boolean;
}

interface RawSection {
  title: string;
  startMin?: number;
  availableMin?: number;
  items: { title: string; minutes: number | null; note: string }[];
  extraInfo: string;
  id?: string;
  listMode?: boolean;
}

function parseTimeStr(s: string): number | undefined {
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return undefined;
  const h = parseInt(m[1], 10), min = parseInt(m[2], 10);
  return isNaN(h) || isNaN(min) ? undefined : h * 60 + min;
}

function parseDurationStr(s: string): number | undefined {
  const trimmed = s.trim();
  const minuteMatch = trimmed.match(/^(\d+)\s*m(?:in)?$/i);
  if (minuteMatch) return Math.max(1, parseInt(minuteMatch[1], 10));
  const hourMatch = trimmed.match(/^(\d+)\s*h(?:\s*(\d+)\s*m(?:in)?)?$/i);
  if (!hourMatch) return undefined;
  const hours = parseInt(hourMatch[1], 10);
  const minutes = hourMatch[2] ? parseInt(hourMatch[2], 10) : 0;
  if (isNaN(hours) || isNaN(minutes)) return undefined;
  return Math.max(1, hours * 60 + minutes);
}

function durationBetween(startMin: number, endMin: number): number {
  return endMin > startMin ? endMin - startMin : endMin + 1440 - startMin;
}

function parseSessionHeader(titleContent: string): { title: string; startMin?: number; availableMin?: number } {
  let title = titleContent;
  let startMin: number | undefined;
  let availableMin: number | undefined;
  const rangeMatch = titleContent.match(/^(.*?)\s+(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s*$/);
  if (rangeMatch) {
    const parsedStart = parseTimeStr(rangeMatch[2]);
    const parsedEnd = parseTimeStr(rangeMatch[3]);
    if (parsedStart !== undefined && parsedEnd !== undefined) {
      title = rangeMatch[1].trim() || 'Session';
      startMin = parsedStart;
      availableMin = durationBetween(parsedStart, parsedEnd);
      return { title, startMin, availableMin };
    }
  }
  const lengthMatch = titleContent.match(/^(.*?)\s+(\d{1,2}:\d{2})\s+(\d+\s*m(?:in)?|\d+\s*h(?:\s*\d+\s*m(?:in)?)?)\s*$/i);
  if (lengthMatch) {
    const parsedStart = parseTimeStr(lengthMatch[2]);
    const parsedDuration = parseDurationStr(lengthMatch[3]);
    if (parsedStart !== undefined && parsedDuration !== undefined) {
      title = lengthMatch[1].trim() || 'Session';
      startMin = parsedStart;
      availableMin = parsedDuration;
      return { title, startMin, availableMin };
    }
  }
  const timeMatch = titleContent.match(/^(.*?)\s+(\d{1,2}:\d{2})\s*$/);
  if (timeMatch) {
    const parsed = parseTimeStr(timeMatch[2]);
    if (parsed !== undefined) {
      title = timeMatch[1].trim() || 'Session';
      startMin = parsed;
    }
  }
  return { title: title || 'Session', startMin, availableMin };
}

// @YYMMDD, @YYYYMMDD or @YYYY-MM-DD → ISO string or null
function parseDateMarker(raw: string): string | null {
  const s = raw.trim().replace(/-/g, '');
  if (/^\d{8}$/.test(s)) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
  if (/^\d{6}$/.test(s)) {
    const y = 2000 + parseInt(s.slice(0, 2), 10);
    return `${y}-${s.slice(2, 4)}-${s.slice(4, 6)}`;
  }
  return null;
}

function normalizeAgendaText(raw: string): string {
  return raw
    .replace(/(@(?:\d{6}|\d{8}|\d{4}-\d{2}-\d{2}))(?=#)/g, '$1\n')
    .replace(/(-->\s*)-\s+\d+\s*m(?:in)?(?=[A-ZÅÄÖ])/g, '$1\n')
    .replace(/(-->\s*)(?=\S)/g, '$1\n')
    .replace(/(\d+\s*m(?:in)?)(?=[A-ZÅÄÖ])/g, '$1\n');
}

function sectionsToFlows(sections: RawSection[]): Flow[] {
  return sections.map((sec, i) => {
    const next = sections[i + 1];
    let available = sec.availableMin ?? 60;
    if (sec.availableMin === undefined && sec.startMin !== undefined && next?.startMin !== undefined && next.startMin > sec.startMin) {
      available = next.startMin - sec.startMin;
    }
    const sectionItems = sec.items.length > 0 ? sec.items : [{ title: sec.title, minutes: available, note: '' }];
    const pinnedSum = sectionItems.reduce((a, b) => a + (b.minutes ?? 0), 0);
    const unpinnedCount = sectionItems.filter(b => b.minutes === null).length;
    const unpinnedTotal = Math.max(unpinnedCount, available - pinnedSum);
    const unpinnedBase = unpinnedCount > 0 ? Math.floor(unpinnedTotal / unpinnedCount) : 0;
    let unpinnedRemainder = unpinnedCount > 0 ? unpinnedTotal - unpinnedBase * unpinnedCount : 0;
    const minutes = sectionItems.map(b => {
      if (b.minutes !== null) return b.minutes;
      const extra = unpinnedRemainder > 0 ? 1 : 0;
      if (unpinnedRemainder > 0) unpinnedRemainder -= 1;
      return unpinnedBase + extra;
    });
    return {
      id: sec.id ?? uid(),
      title: sec.title,
      startMin: sec.startMin,
      parts: sectionItems.map(b => b.title),
      minutes,
      warnings: sectionItems.map(() => true),
      notes: sectionItems.map(b => b.note),
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
  const lines = normalizeAgendaText(text).split('\n').map(l => l.replace(/\s+$/, ''));
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

    if (t.startsWith('#')) {
      const content = t.slice(1).trim();
      const parsedHeader = parseSessionHeader(content.replace(/<!--id:([a-z0-9-]+)-->/i, '').trim());
      if (cur && cur.startMin !== undefined && parsedHeader.startMin === undefined && parsedHeader.availableMin === undefined) {
        cur.items.push({ title: content.replace(/^#+\s*/, '').trim(), minutes: null, note: '' });
        continue;
      }
      if (cur) sections.push(cur);
      let extractedId: string | undefined;
      const idMatch = content.match(/<!--id:([a-z0-9-]+)-->/i);
      let titleContent = content;
      if (idMatch) {
        extractedId = idMatch[1];
        titleContent = content.replace(idMatch[0], '').trim();
      }

      const header = parseSessionHeader(titleContent);
      cur = { ...header, items: [], extraInfo: '', id: extractedId };
      continue;
    }

    if (!cur) cur = { title: 'Session', startMin: undefined, items: [], extraInfo: '', id: undefined };

    if (t.startsWith('&&')) {
      const info = t.slice(2).trim();
      cur.extraInfo = cur.extraInfo ? cur.extraInfo + '\n' + info : info;
      continue;
    }

    if (t.startsWith('&')) {
      const comment = t.slice(1).trim();
      if (cur.items.length > 0) {
        const last = cur.items[cur.items.length - 1];
        last.note = last.note ? last.note + '\n' + comment : comment;
      } else {
        cur.extraInfo = cur.extraInfo ? cur.extraInfo + '\n' + comment : comment;
      }
      continue;
    }

    if (t.startsWith('-') && cur.items.length === 0) {
      cur.items.push({ title: t.replace(/^-\s*/, ''), minutes: null, note: '' });
      cur.listMode = true;
      continue;
    }

    if (t.startsWith('-') && cur.listMode) {
      cur.items.push({ title: t.replace(/^-\s*/, ''), minutes: null, note: '' });
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
      cur.listMode = false;
      cur.items.push({ title: mMatch[1].trim(), minutes: Math.max(1, parseInt(mMatch[2], 10)), note: '' });
    } else {
      cur.listMode = false;
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
      if (line.trim()) out.push('&& ' + line);
    }
  }
  return out.join('\n');
}

export function serializeAgenda(days: AgendaDay[], options: SerializeAgendaOptions = {}): string {
  const includeIds = options.includeIds ?? true;
  const lines: string[] = [];
  let firstDay = true;
  for (const day of days) {
    if (!firstDay) lines.push('');
    firstDay = false;
    if (day.date !== null) {
      const parts = day.date.split('-');
      const y = parts[0], m = parts[1], d = parts[2];
      // Use 6-digit format if year is 20xx for a cleaner look
      if (y.startsWith('20') && y.length === 4) {
        lines.push(`@${y.slice(2)}${m}${d}`);
      } else {
        lines.push(`@${y}${m}${d}`);
      }
    }
    for (const flow of day.flows) {
      const idTag = includeIds ? ` <!--id:${flow.id}-->` : '';
      if (flow.startMin !== undefined) {
        const h = String(Math.floor(flow.startMin / 60)).padStart(2, '0');
        const mi = String(flow.startMin % 60).padStart(2, '0');
        lines.push(`#${flow.title} ${h}:${mi}${idTag}`);
      } else {
        lines.push(`#${flow.title}${idTag}`);
      }
      for (let i = 0; i < flow.parts.length; i++) {
        lines.push(`${flow.parts[i]} ${flow.minutes[i]}m`);
        if (flow.notes[i]) {
          for (const note of flow.notes[i].split('\n')) {
            if (note.trim()) lines.push(`- ${note}`);
          }
        }
      }
      if (flow.extraInfo) {
        for (const info of flow.extraInfo.split('\n')) {
          if (info.trim()) lines.push(`&& ${info}`);
        }
      }
    }
  }
  return lines.join('\n');
}

const WEEKDAY_TOKENS: Record<string, number> = {
  '@MÅNDAG': 0,
  '@TISDAG': 1,
  '@ONSDAG': 2,
  '@TORSDAG': 3,
  '@FREDAG': 4,
};

export function resolveWeekInput(input: string): string {
  const s = input.trim().toLowerCase();
  if (!s) {
    const today = new Date();
    const dow = today.getDay() || 7;
    const monday = new Date(today.getTime() - (dow - 1) * 86400000);
    const yy = String(monday.getFullYear()).slice(2);
    const mm = String(monday.getMonth() + 1).padStart(2, '0');
    const dd = String(monday.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
  }
  const weekMatch = s.match(/^v\s*(\d{1,2})(?:\s+(\d{2,4}))?$/);
  if (weekMatch) {
    const week = parseInt(weekMatch[1], 10);
    const yearRaw = weekMatch[2];
    const year = yearRaw
      ? (yearRaw.length === 2 ? 2000 + parseInt(yearRaw, 10) : parseInt(yearRaw, 10))
      : new Date().getFullYear();
    const monday = isoWeekMonday(year, week);
    if (!monday) return '';
    const yy = String(monday.getFullYear()).slice(2);
    const mm = String(monday.getMonth() + 1).padStart(2, '0');
    const dd = String(monday.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
  }
  if (/^\d{6}$/.test(s)) return s;
  return '';
}

function isoWeekMonday(year: number, week: number): Date | null {
  if (week < 1 || week > 53) return null;
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday1 = new Date(jan4.getTime() - (dayOfWeek - 1) * 86400000);
  const result = new Date(monday1.getTime() + (week - 1) * 7 * 86400000);
  return result;
}

export function stripDraftComments(text: string): string {
  return text.split('\n').filter(line => !line.trim().startsWith('//')).join('\n');
}

export function applyMondayAnchor(text: string, mondayYYMMDD: string): string {
  const match = mondayYYMMDD.match(/^(\d{2})(\d{2})(\d{2})$/);
  if (!match) return text;
  const [, yy, mm, dd] = match;
  const mondayMs = new Date(
    2000 + parseInt(yy, 10),
    parseInt(mm, 10) - 1,
    parseInt(dd, 10)
  ).getTime();

  return text.replace(/@(MÅNDAG|TISDAG|ONSDAG|TORSDAG|FREDAG)/g, (token) => {
    const offset = WEEKDAY_TOKENS[token] ?? 0;
    const d = new Date(mondayMs + offset * 86400000);
    const y = String(d.getFullYear()).slice(2);
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `@${y}${mo}${dy}`;
  });
}

