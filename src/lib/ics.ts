import type { AgendaDay } from './parse.js';
import type { Flow } from './state.svelte.js';

export interface IcsEvent {
  uid: string;
  title: string;
  date: string;
  startMin: number;
  endMin: number;
  allDay: boolean;
  description: string;
  location: string;
}

function unfoldIcs(text: string): string[] {
  const raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lines: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function parseIcsDateValue(raw: string): { date: string; minutes: number; allDay: boolean } | null {
  const value = raw.trim();
  if (/^\d{8}$/.test(value)) {
    return {
      date: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`,
      minutes: 0,
      allDay: true
    };
  }

  const timed = value.match(/^(\d{8})T(\d{2})(\d{2})(\d{2})?Z?$/);
  if (!timed) return null;

  const hasZulu = value.endsWith('Z');
  if (hasZulu) {
    const year = Number(timed[1].slice(0, 4));
    const month = Number(timed[1].slice(4, 6)) - 1;
    const day = Number(timed[1].slice(6, 8));
    const hour = Number(timed[2]);
    const minute = Number(timed[3]);
    const second = timed[4] ? Number(timed[4]) : 0;
    const date = new Date(Date.UTC(year, month, day, hour, minute, second));
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return {
      date: iso,
      minutes: date.getHours() * 60 + date.getMinutes(),
      allDay: false
    };
  }

  return {
    date: `${timed[1].slice(0, 4)}-${timed[1].slice(4, 6)}-${timed[1].slice(6, 8)}`,
    minutes: Number(timed[2]) * 60 + Number(timed[3]),
    allDay: false
  };
}

function parseProperty(line: string): { name: string; value: string } {
  const splitAt = line.indexOf(':');
  if (splitAt < 0) return { name: line.trim().toUpperCase(), value: '' };
  const rawName = line.slice(0, splitAt).trim().toUpperCase();
  return { name: rawName, value: line.slice(splitAt + 1) };
}

function stripParams(name: string): string {
  const semi = name.indexOf(';');
  return (semi >= 0 ? name.slice(0, semi) : name).toUpperCase();
}

function decodeText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

export function parseIcsEvents(text: string): IcsEvent[] {
  const lines = unfoldIcs(text);
  const events: IcsEvent[] = [];
  let current: Partial<IcsEvent> | null = null;
  let rawStart: string | null = null;
  let rawEnd: string | null = null;

  for (const line of lines) {
    const { name, value } = parseProperty(line);
    const key = stripParams(name);

    if (key === 'BEGIN' && value.toUpperCase() === 'VEVENT') {
      current = {};
      rawStart = null;
      rawEnd = null;
      continue;
    }

    if (key === 'END' && value.toUpperCase() === 'VEVENT') {
      if (current && rawStart) {
        const start = parseIcsDateValue(rawStart);
        const end = rawEnd ? parseIcsDateValue(rawEnd) : null;
        if (start) {
          let endMin = end?.minutes ?? start.minutes + 30;
          if (!start.allDay && end && end.date === start.date && end.minutes > start.minutes) {
            endMin = end.minutes;
          }
          if (!start.allDay && endMin <= start.minutes) endMin = start.minutes + 30;
          events.push({
            uid: current.uid || `${start.date}-${start.minutes}-${current.title || 'event'}`,
            title: current.title || 'Kalenderhändelse',
            date: start.date,
            startMin: start.minutes,
            endMin,
            allDay: start.allDay,
            description: current.description || '',
            location: current.location || ''
          });
        }
      }
      current = null;
      rawStart = null;
      rawEnd = null;
      continue;
    }

    if (!current) continue;

    if (key === 'UID') current.uid = value.trim();
    if (key === 'SUMMARY') current.title = decodeText(value);
    if (key === 'DESCRIPTION') current.description = decodeText(value);
    if (key === 'LOCATION') current.location = decodeText(value);
    if (key === 'DTSTART') rawStart = value.trim();
    if (key === 'DTEND') rawEnd = value.trim();
  }

  return events.sort((a, b) =>
    a.date.localeCompare(b.date) ||
    a.startMin - b.startMin ||
    a.title.localeCompare(b.title)
  );
}

export function icsEventsToAgendaDays(events: IcsEvent[]): AgendaDay[] {
  const byDate = new Map<string, Flow[]>();
  for (const event of events) {
    if (event.allDay) continue;
    const duration = Math.max(1, event.endMin - event.startMin);
    const flow: Flow = {
      id: event.uid,
      title: event.title,
      startMin: event.startMin,
      parts: [event.title],
      minutes: [duration],
      warnings: [false],
      notes: [event.description || ''],
      extraInfo: event.location || ''
    };
    const flows = byDate.get(event.date) ?? [];
    flows.push(flow);
    byDate.set(event.date, flows);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, flows]) => ({
      date,
      flows: flows.sort((a, b) => (a.startMin ?? 0) - (b.startMin ?? 0))
    }));
}
