const pad2 = (n: number) => String(n).padStart(2, '0');

export function localDateISO(date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}
