import { applyMondayAnchor, resolveWeekInput } from './parse.js';
import type { AiConfig } from './ai.js';

export interface ScheduleImportOptions {
  file: File;
  weekInput: string;
  addStandardParts: boolean;
  aiConfig: AiConfig;
}

export interface ScheduleImportResult {
  text: string;
  error?: never;
}

export interface ScheduleImportError {
  text?: never;
  error: string;
}

export async function runScheduleImport(
  opts: ScheduleImportOptions
): Promise<ScheduleImportResult | ScheduleImportError> {
  const { file, weekInput, addStandardParts, aiConfig } = opts;

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  const fileData = btoa(binary);
  const mediaType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

  const body: Record<string, unknown> = {
    provider: aiConfig.provider,
    apiKey: aiConfig.apiKey,
    fileData,
    mediaType,
    addStandardParts
  };
  if (aiConfig.baseUrl) body.baseUrl = aiConfig.baseUrl;
  if (aiConfig.customModel) body.customModel = aiConfig.customModel;

  const res = await fetch('/api/schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data.error) return { error: data.error };

  const resolvedMonday = resolveWeekInput(weekInput);
  const text = applyMondayAnchor(data.text ?? '', resolvedMonday);

  if (!text.trim()) return { error: 'Schemat kunde inte läsas av – försök med en skarpare bild.' };
  return { text };
}
