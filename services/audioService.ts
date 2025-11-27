// Shared AudioContext
let audioCtx: AudioContext | null = null;

// Metronome state
let nextNoteTime = 0.0;
let timerID: number | null = null;
let currentBpm = 110;
let isCurrentIntervalFast = false; // Track if we should play the "Fast" tone
let isPlaying = false;

// Scheduling constants
const lookahead = 25.0; // milliseconds
const scheduleAheadTime = 0.1; // seconds

export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

export const speak = (text: string) => {
  if (!('speechSynthesis' in window)) {
    console.warn('Text-to-speech not supported in this browser.');
    return;
  }

  // Cancel any ongoing speech to prioritize new messages
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(voice => 
    voice.name.includes('Google') && voice.lang.includes('en')
  ) || voices.find(voice => voice.lang.includes('en'));

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  window.speechSynthesis.speak(utterance);
};

export const playBeep = () => {
  const ctx = initAudio();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.value = 880; // A5
  gain.gain.value = 0.1;

  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
  osc.stop(ctx.currentTime + 0.5);
};

/**
 * METRONOME LOGIC
 */

const scheduleNote = (time: number, bpm: number, isFast: boolean) => {
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  // Pitch difference for Fast vs Slow
  // Fast: Higher pitch (800Hz), sharper
  // Slow: Lower pitch (500Hz), deeper
  osc.frequency.value = isFast ? 800 : 500;
  osc.type = 'sine';

  // Short, percussive envelope "tick"
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(isFast ? 0.3 : 0.4, time + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

  osc.start(time);
  osc.stop(time + 0.06);
};

const scheduler = () => {
  if (!audioCtx) return;

  // while there are notes that will need to play before the next interval, 
  // schedule them and advance the pointer.
  while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
    scheduleNote(nextNoteTime, currentBpm, isCurrentIntervalFast);
    const secondsPerBeat = 60.0 / currentBpm;
    nextNoteTime += secondsPerBeat;
  }
  timerID = window.setTimeout(scheduler, lookahead);
};

export const startMetronome = (bpm: number, isFast: boolean) => {
  initAudio();
  currentBpm = bpm;
  isCurrentIntervalFast = isFast;

  if (isPlaying) {
    return;
  }

  isPlaying = true;
  if (audioCtx) {
    // Start slightly in the future to avoid immediate catch-up glitches
    nextNoteTime = audioCtx.currentTime + 0.05;
    scheduler();
  }
};

export const stopMetronome = () => {
  isPlaying = false;
  if (timerID) {
    window.clearTimeout(timerID);
    timerID = null;
  }
};