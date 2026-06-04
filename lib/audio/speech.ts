const DEFAULT_LANG = 'en-US';
const AUDIO_BASE_PATH = '/audio/hackers-750';

let currentAudio: HTMLAudioElement | null = null;

function pickEnglishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang === DEFAULT_LANG) ??
    voices.find((voice) => voice.lang.startsWith('en')) ??
    null
  );
}

function speakWithBrowser(word: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(word);
  const voice = pickEnglishVoice();

  utterance.lang = voice?.lang ?? DEFAULT_LANG;
  utterance.voice = voice;
  utterance.rate = 0.82;
  utterance.pitch = 1;
  utterance.volume = 1;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function speakWord(word: string, audioId?: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (audioId) {
    currentAudio?.pause();

    const audio =
      typeof Audio !== 'undefined'
        ? new Audio(`${AUDIO_BASE_PATH}/${audioId}.wav`)
        : document.createElement('audio');

    audio.src = `${AUDIO_BASE_PATH}/${audioId}.wav`;
    audio.preload = 'auto';
    currentAudio = audio;
    audio.play().catch(() => speakWithBrowser(word));
    return;
  }

  speakWithBrowser(word);
}
