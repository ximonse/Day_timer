import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import OpenAI from 'openai';

export const POST: RequestHandler = async ({ request }) => {
  const apiKey = request.headers.get('x-openai-key');
  if (!apiKey) throw error(401, 'Ingen OpenAI-nyckel angiven');

  const formData = await request.formData();
  const file = formData.get('file') as File;
  if (!file) throw error(400, 'Ingen ljudfil medföljde');

  const openai = new OpenAI({ apiKey });

  try {
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'sv',
    });

    return json({ text: transcription.text });
  } catch (err: any) {
    console.error('[api/transcribe] Whisper error:', err.message);
    return json({ error: 'Kunde inte transkribera ljudet. Kontrollera din API-nyckel.' }, { status: 500 });
  }
};
