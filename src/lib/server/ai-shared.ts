export const PRIVATE_IP = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^fc/i,
  /^fe80/i,
  /^0\./,
];

export function isPrivateHost(hostname: string): boolean {
  const h = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (h === '' || h === 'localhost' || h === 'localhost.localdomain' || h.endsWith('.localhost')) return true;
  if (h === '::' || h === '0.0.0.0') return true;
  return PRIVATE_IP.some(r => r.test(h));
}

export function safeErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return 'Okänt fel';
  const m = err.message.toLowerCase();
  if (m.includes('401') || m.includes('unauthorized') || m.includes('invalid api key') || m.includes('incorrect api key')) return 'Ogiltig API-nyckel';
  if (m.includes('429') || m.includes('rate limit') || m.includes('quota')) return 'För många förfrågningar — försök igen om en stund';
  if (m.includes('403') || m.includes('forbidden')) return 'Åtkomst nekad av AI-tjänsten';
  if (m.includes('timeout') || m.includes('timed out')) return 'AI-tjänsten svarade inte i tid';
  if (m.includes('network') || m.includes('fetch') || m.includes('econnrefused')) return 'Kunde inte nå AI-tjänsten';
  return 'AI-tjänsten svarade med ett fel';
}
