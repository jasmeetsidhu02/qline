import { Platform, Vibration } from 'react-native';

// A short chime for the moment a turn arrives, for when the page is open but
// the phone is in someone's pocket. Phones only allow sound that follows a
// tap, so we open the audio channel when the customer joins the line.
let audio: AudioContext | null = null;

export function primeSound() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audio ??= new Ctor();
    if (audio.state === 'suspended') audio.resume();
  } catch {
    audio = null;
  }
}

function beep(at: number, frequency: number) {
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.42);
  osc.connect(gain).connect(audio.destination);
  osc.start(at);
  osc.stop(at + 0.45);
}

export function alertNow(kind: 'next' | 'turn') {
  try {
    Vibration.vibrate(kind === 'turn' ? [0, 500, 200, 500, 200, 500] : [0, 300]);
  } catch {
    // Vibration is not allowed on iPhone browsers; the sound still plays.
  }
  if (Platform.OS !== 'web' || !audio || audio.state !== 'running') return;
  const now = audio.currentTime;
  if (kind === 'turn') {
    beep(now, 880);
    beep(now + 0.5, 1175);
    beep(now + 1.0, 880);
  } else {
    beep(now, 660);
  }
}
