export type ImportType = 'ics' | 'vision' | 'text';

export function detectImportType(file: File): ImportType {
  const name = file.name.toLowerCase();
  if (name.endsWith('.ics') || file.type === 'text/calendar') return 'ics';
  if (name.endsWith('.txt') || name.endsWith('.md') || file.type === 'text/plain' || file.type === 'text/markdown') return 'text';
  return 'vision';
}
