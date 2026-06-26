const pad2 = (n: number) => String(n).padStart(2, '0');

export function localDateISO(date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseIsoDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysISO(iso: string, days: number): string {
  const date = parseIsoDate(iso);
  date.setDate(date.getDate() + days);
  return localDateISO(date);
}

export function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonth(monthIso: string, delta: number) {
  const [year, month] = monthIso.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return monthKey(date);
}

export function fmtAgendaDate(iso: string | null): string {
  if (!iso) return 'Odaterat';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  // Manual formatting to match the original style (Sön 16 maj)
  const days = ['Sön','Mån','Tis','Ons','Tor','Fre','Lör'];
  const months = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];
  return `${days[dt.getDay()]} ${d} ${months[m - 1]}`;
}

export function monthLabel(monthIso: string): string {
  const [year, month] = monthIso.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('sv-SE', {
    month: 'long',
    year: 'numeric'
  });
}
