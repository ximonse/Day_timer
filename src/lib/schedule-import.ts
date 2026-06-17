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

const MAX_IMAGE_PX = 2000;
const MAX_FILE_BYTES = 3 * 1024 * 1024;

async function prepareFile(file: File): Promise<{ data: string; mediaType: string }> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    const buffer = await file.arrayBuffer();
    return { data: arrayBufferToBase64(buffer), mediaType: 'application/pdf' };
  }

  const img = await loadImage(file);
  let { width, height } = img;
  const needsResize = width > MAX_IMAGE_PX || height > MAX_IMAGE_PX;
  const needsReencode = file.size > MAX_FILE_BYTES || needsResize || isHeic(file);

  if (!needsReencode) {
    const buffer = await file.arrayBuffer();
    const mediaType = file.type.startsWith('image/') ? file.type : 'image/jpeg';
    return { data: arrayBufferToBase64(buffer), mediaType };
  }

  if (needsResize) {
    const ratio = Math.min(MAX_IMAGE_PX / width, MAX_IMAGE_PX / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
  return { data: dataUrl.split(',')[1], mediaType: 'image/jpeg' };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Kunde inte läsa bilden — prova ett annat format.')); };
    img.src = url;
  });
}

function isHeic(file: File): boolean {
  return file.type === 'image/heic' || file.type === 'image/heif' ||
    /\.(heic|heif)$/i.test(file.name);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function runScheduleImport(
  opts: ScheduleImportOptions
): Promise<ScheduleImportResult | ScheduleImportError> {
  const { file, weekInput, addStandardParts, aiConfig } = opts;

  let prepared: { data: string; mediaType: string };
  try {
    prepared = await prepareFile(file);
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Kunde inte läsa filen.' };
  }

  const body: Record<string, unknown> = {
    provider: aiConfig.provider,
    apiKey: aiConfig.apiKey,
    fileData: prepared.data,
    mediaType: prepared.mediaType,
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
