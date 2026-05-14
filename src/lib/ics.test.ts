import { describe, expect, it } from 'vitest';
import { icsEventsToAgendaDays, parseIcsEvents } from './ics.js';

describe('parseIcsEvents', () => {
  it('parses timed events', () => {
    const text = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:1',
      'SUMMARY:Math',
      'DTSTART:20260514T083000',
      'DTEND:20260514T091500',
      'LOCATION:Room 2',
      'DESCRIPTION:Bring book\\nRoom 2',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');

    const events = parseIcsEvents(text);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      uid: '1',
      title: 'Math',
      date: '2026-05-14',
      startMin: 8 * 60 + 30,
      endMin: 9 * 60 + 15,
      allDay: false,
      description: 'Bring book\nRoom 2',
      location: 'Room 2'
    });
  });

  it('parses all-day events', () => {
    const text = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:2',
      'SUMMARY:Nationaldag',
      'DTSTART;VALUE=DATE:20260506',
      'DTEND;VALUE=DATE:20260507',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');

    const events = parseIcsEvents(text);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      date: '2026-05-06',
      allDay: true,
      startMin: 0,
      location: ''
    });
  });

  it('unfolds continued lines', () => {
    const text = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:3',
      'SUMMARY:Very long',
      'DESCRIPTION:First part',
      ' second part',
      'DTSTART:20260514T100000',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');

    const events = parseIcsEvents(text);
    expect(events[0].description).toBe('First partsecond part');
  });
});

describe('icsEventsToAgendaDays', () => {
  it('groups timed events by date and skips all-day events', () => {
    const days = icsEventsToAgendaDays([
      { uid: 'a', title: 'Math', date: '2026-05-14', startMin: 480, endMin: 525, allDay: false, description: '', location: 'Room 2' },
      { uid: 'b', title: 'Holiday', date: '2026-05-14', startMin: 0, endMin: 0, allDay: true, description: '', location: '' },
      { uid: 'c', title: 'Lunch', date: '2026-05-15', startMin: 720, endMin: 780, allDay: false, description: 'Cafe', location: '' }
    ]);

    expect(days).toHaveLength(2);
    expect(days[0].date).toBe('2026-05-14');
    expect(days[0].flows[0].title).toBe('Math');
    expect(days[0].flows[0].minutes).toEqual([45]);
    expect(days[0].flows[0].extraInfo).toBe('Room 2');
    expect(days[1].flows[0].notes).toEqual(['Cafe']);
  });
});
