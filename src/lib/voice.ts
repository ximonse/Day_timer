export type TranscriptionResult = { text: string; error?: string };

export interface VoiceService {
  isRecording: boolean;
  start: (options: { onResult: (text: string) => void; onError: (err: string) => void; apiKey?: string; useWhisper?: boolean }) => void;
  stop: () => void;
}

export function createVoiceService(): VoiceService {
  let recognition: any = null;
  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];
  let _isRecording = false;

  const stopEverything = () => {
    if (recognition) {
      try { recognition.stop(); } catch {}
      recognition = null;
    }
    if (mediaRecorder) {
      try { mediaRecorder.stop(); } catch {}
      mediaRecorder = null;
    }
    _isRecording = false;
  };

  return {
    get isRecording() { return _isRecording; },

    start({ onResult, onError, apiKey, useWhisper }) {
      if (_isRecording) return;
      _isRecording = true;

      if (useWhisper && apiKey) {
        // Whisper Mode
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            mediaRecorder.ondataavailable = (event) => {
              audioChunks.push(event.data);
            };
            mediaRecorder.onstop = async () => {
              const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
              const formData = new FormData();
              formData.append('file', audioBlob, 'audio.webm');

              try {
                const res = await fetch('/api/transcribe', {
                  method: 'POST',
                  headers: { 'x-openai-key': apiKey },
                  body: formData
                });
                const data = await res.json();
                if (data.error) onError(data.error);
                else onResult(data.text);
              } catch (e) {
                onError('Kunde inte kontakta Whisper-tjänsten');
              }
              stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorder.start();
          })
          .catch(err => {
            _isRecording = false;
            onError('Kunde inte få tillgång till mikrofonen');
          });
      } else {
        // Web Speech API Mode
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
          _isRecording = false;
          onError('Web Speech API stöds inte i denna webbläsare. Prova Chrome eller Safari.');
          return;
        }

        recognition = new SpeechRecognition();
        recognition.lang = 'sv-SE';
        recognition.interimResults = false;
        recognition.continuous = false;

        recognition.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          onResult(text);
        };

        recognition.onerror = (event: any) => {
          onError(`Fel vid röstigenkänning: ${event.error}`);
          stopEverything();
        };

        recognition.onend = () => {
          _isRecording = false;
        };

        recognition.start();
      }
    },

    stop() {
      stopEverything();
    }
  };
}
