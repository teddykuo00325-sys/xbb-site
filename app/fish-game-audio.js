import {t} from './assets/i18n.js?v=audit1117b';
// Optional fish-game audio. Only start() unlocks playback. Background is the synthesized water
// ('water'), silence ('none') or a looping sound-explorer recording; each catch plays the synthesized
// tone ('tone'), nothing ('none') or a short clip of a recording. soundFile(id) maps track ids to files.
// The game owns visibility/pagehide/native-background handlers and calls stop().
const HIT_GAP = 0.1;
const HIT_PITCHES = [640, 780, 920];
const CLIP_SECONDS = 1.5, CLIP_FADE = 0.3;
const ERROR_TEXT = t('聲音暫時無法播放，先靜音陪玩；可以再按一次聲音開關重試。');

// The iOS app serves full audio files as a plain (non-HTTP) response so <audio> can stream them;
// fetch() then reports status 0, so accept it when the file actually has bytes.
const fetchBuffer = (context, url) => fetch(url).then(r => { if (!r.ok && r.status !== 0) throw Error(url); return r.arrayBuffer(); })
  .then(data => { if (!data || !data.byteLength) throw Error(url); return data; })
  .then(data => new Promise((resolve, reject) => {
    // Older WebKit only supports the callback form of decodeAudioData.
    const result = context.decodeAudioData(data, resolve, reject);
    if (result && typeof result.then === 'function') result.then(resolve, reject);
  }));

// iOS mutes Web Audio with the ring/silent switch unless the page asks for playback; sound
// explorer's <audio> already plays, so do the same while the game's sound is on, then hand it back.
const audioSession = () => globalThis.navigator?.audioSession;
const claimPlayback = () => { try { const s = audioSession(); if (s && s.type !== 'playback') s.type = 'playback'; } catch {} };
const releasePlayback = () => { try { const s = audioSession(); if (s && s.type === 'playback') s.type = 'auto'; } catch {} };

export function createFishGameAudio({onError = () => {}, soundFile = () => null, loadBuffer = fetchBuffer} = {}) {
  let bgSound = 'water', hitSound = 'tone', bgVoice = null;
  const buffers = new Map(), loading = new Map();
  let context = null, master = null, volume = 0.45, disposed = false;
  let enabled = false, playing = false, generation = 0, pending = null;
  let lastHit = -Infinity, pitchIndex = 0, hitVoice = null, reported = false;
  const nodes = new Set(), sources = new Set();
  const recording = id => (id && id !== 'water' && id !== 'tone' && id !== 'none') ? soundFile(id) : null;
  // Decoded once per file and reused; failures fall back to the synthesized sound.
  const load = url => {
    if (!url || !context || buffers.has(url)) return Promise.resolve(buffers.get(url) || null);
    if (!loading.has(url)) loading.set(url, Promise.resolve().then(() => loadBuffer(context, url))
      .then(buffer => { buffers.set(url, buffer); return buffer; }, () => null)
      .finally(() => loading.delete(url)));
    return loading.get(url);
  };
  const report = () => {
    if (disposed || reported) return;
    reported = true;
    try { onError(ERROR_TEXT); } catch { /* A UI callback must not break the game. */ }
  };
  const track = (node, source = false) => { nodes.add(node); if (source) sources.add(node); return node; };
  const release = node => {
    if (!node) return;
    if (sources.delete(node)) { node.onended = null; try { node.stop(); } catch {} }
    nodes.delete(node);
    try { node.disconnect(); } catch {}
  };
  const clearHit = () => {
    if (!hitVoice) return;
    const voice = hitVoice; hitVoice = null;
    release(voice.osc); release(voice.gain);
  };
  const silence = () => {
    playing = false; clearHit(); bgVoice = null;
    // Disconnect first: no pending resume or scheduled envelope can leak sound.
    if (master) { try { master.disconnect(); } catch {} }
    for (const node of [...nodes]) release(node);
    master = null; lastHit = -Infinity;
  };
  const suspend = () => {
    if (!context || context.state === 'closed') return Promise.resolve(true);
    try { return Promise.resolve(context.suspend()).then(() => true, () => { report(); return false; }); }
    catch { report(); return Promise.resolve(false); }
  };
  const stop = () => {
    generation++; enabled = false; pending = null; silence(); releasePlayback();
    return suspend();
  };
  const fail = () => { enabled = false; silence(); releasePlayback(); report(); void suspend(); return false; };
  const clearBackground = () => {
    if (!bgVoice) return;
    for (const node of bgVoice) release(node);
    bgVoice = null;
  };
  const startRecordingLoop = buffer => {
    const source = track(context.createBufferSource(), true), gain = track(context.createGain());
    source.buffer = buffer; source.loop = true; gain.gain.value = 0.7;
    source.connect(gain); gain.connect(master); source.start();
    bgVoice = [source, gain];
  };
  const buildBackground = () => {
    master = track(context.createGain()); master.gain.value = volume;
    master.connect(context.destination);
    playing = true;
    playBackground();
  };
  const playBackground = () => {
    clearBackground();
    if (!master || bgSound === 'none') return;
    const url = recording(bgSound);
    if (url) {
      const wanted = bgSound, ticket = generation;
      void load(url).then(buffer => {
        if (!buffer || !playing || wanted !== bgSound || ticket !== generation || bgVoice) return;
        try { startRecordingLoop(buffer); } catch { fail(); }
      });
      return;
    }
    buildWater();
  };
  const buildWater = () => {
    // A short seamless noise loop, softly filtered and slowly pulsed like water.
    const length = Math.max(1, Math.floor(context.sampleRate * 4));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) samples[i] = Math.random() * 2 - 1;
    const water = track(context.createBufferSource(), true); water.buffer = buffer; water.loop = true;
    const filter = track(context.createBiquadFilter()); filter.type = 'lowpass'; filter.frequency.value = 1400; filter.Q.value = 0.3;
    const bed = track(context.createGain()); bed.gain.value = 0.12;
    const swell = track(context.createOscillator(), true); swell.type = 'sine'; swell.frequency.value = 0.16;
    const depth = track(context.createGain()); depth.gain.value = 0.03;
    water.connect(filter); filter.connect(bed); bed.connect(master);
    swell.connect(depth); depth.connect(bed.gain);
    water.start(); swell.start();
    bgVoice = [water, filter, bed, swell, depth];
  };
  return {
    start() {
      if (disposed) return Promise.resolve(false);
      if (playing && enabled) return Promise.resolve(true);
      if (pending && enabled) return pending;
      enabled = true; reported = false; claimPlayback();
      const ticket = ++generation;
      try {
        if (!context || context.state === 'closed') {
          const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
          if (!AudioContext) return Promise.resolve(fail());
          context = new AudioContext();
        }
        // Call resume synchronously while the caller's user gesture is active.
        const resumed = context.resume();
        pending = Promise.resolve(resumed).then(() => {
          if (disposed || !enabled || ticket !== generation) {
            if (!enabled && !disposed) void suspend();
            return false;
          }
          if (context.state !== 'running') return fail();
          try { buildBackground(); void load(recording(hitSound)); return true; } catch { return fail(); }
        }, () => ticket === generation && !disposed ? fail() : false)
          .finally(() => { if (ticket === generation) pending = null; });
        return pending;
      } catch { return Promise.resolve(fail()); }
    },
    hit() {
      if (disposed || !enabled || !playing || context?.state !== 'running') return false;
      const now = context.currentTime;
      if (now - lastHit < HIT_GAP) return false;
      lastHit = now;
      if (hitSound === 'none') return true;
      const clipUrl = recording(hitSound), clip = clipUrl ? buffers.get(clipUrl) : null;
      if (clipUrl && !clip) void load(clipUrl); // Not decoded yet: use the tone this once.
      if (clip) {
        try {
          clearHit();
          const osc = track(context.createBufferSource(), true), gain = track(context.createGain());
          const length = Math.min(CLIP_SECONDS, clip.duration || CLIP_SECONDS);
          osc.buffer = clip;
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(1, now + 0.01);
          gain.gain.setValueAtTime(1, now + Math.max(0.02, length - CLIP_FADE));
          gain.gain.linearRampToValueAtTime(0.0001, now + length);
          osc.connect(gain); gain.connect(master);
          const voice = {osc, gain}; hitVoice = voice;
          osc.onended = () => { if (hitVoice === voice) clearHit(); };
          osc.start(now); osc.stop(now + length + 0.02);
          return true;
        } catch { fail(); return false; }
      }
      try {
        clearHit(); // One hit voice at a time, even during a fast streak.
        const osc = track(context.createOscillator(), true), gain = track(context.createGain());
        const frequency = HIT_PITCHES[pitchIndex++ % HIT_PITCHES.length];
        osc.type = 'sine'; osc.frequency.setValueAtTime(frequency, now);
        osc.frequency.exponentialRampToValueAtTime(frequency * 0.48, now + 0.13);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);
        osc.connect(gain); gain.connect(master);
        const voice = {osc, gain}; hitVoice = voice;
        osc.onended = () => { if (hitVoice === voice) clearHit(); };
        osc.start(now); osc.stop(now + 0.18);
        return true;
      } catch { fail(); return false; }
    },
    // Change the background / catch sound; a running background switches immediately.
    setSounds({bg, hit} = {}) {
      const nextBg = typeof bg === 'string' ? bg : bgSound;
      if (typeof hit === 'string') { hitSound = hit; if (context && playing) void load(recording(hit)); }
      if (nextBg !== bgSound) { bgSound = nextBg; if (playing && master) { try { playBackground(); } catch { fail(); } } }
    },
    setVolume(value) {
      if (!Number.isFinite(value)) return volume;
      volume = Math.max(0, Math.min(1, value));
      if (master) {
        try { master.gain.cancelScheduledValues(context.currentTime); master.gain.setTargetAtTime(volume, context.currentTime, 0.015); }
        catch { fail(); }
      }
      return volume;
    },
    stop,
    dispose() {
      if (disposed) return Promise.resolve(true);
      // stop() cuts sound synchronously; close() owns final device cleanup.
      void stop(); disposed = true;
      if (!context || context.state === 'closed') return Promise.resolve(true);
      try { return Promise.resolve(context.close()).then(() => true, () => false); }
      catch { return Promise.resolve(false); }
    }
  };
}
