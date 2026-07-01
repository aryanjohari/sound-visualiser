import './styles.css';
import * as THREE from 'three';
import { AudioEngine, type AudioFeatures } from './audio/AudioEngine';
import { VideoCaptureError } from './camera/VideoCapture';
import { Loop } from './webgl/Loop';
import { StateManager, type BeatState, type SyncMode } from './webgl/StateManager';
import { VJScene, type VisualMode } from './webgl/Scene';

const canvas = document.getElementById('webgl') as HTMLCanvasElement | null;
const ui = document.getElementById('ui') as HTMLDivElement | null;
const hoverStopHost = document.getElementById('hoverStopHost') as HTMLDivElement | null;
const hoverStopBtn = document.getElementById('hoverStopBtn') as HTMLButtonElement | null;

if (!canvas) throw new Error('Missing canvas #webgl');
if (!ui) throw new Error('Missing #ui container');
if (!hoverStopHost || !hoverStopBtn) throw new Error('Missing hover stop controls');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 1);

const scene = new VJScene(renderer);

let audioPlaying = false;
let lastStatusBase = '';
let lastBeatState: BeatState | null = null;

const audioEngine = new AudioEngine({
  onPlaybackStateChange(playing) {
    audioPlaying = playing;
    ui.classList.toggle('glass-shell--recessed', playing);
    hoverStopHost.classList.toggle('hover-stop-host--active', playing);
    hoverStopHost.setAttribute('aria-hidden', playing ? 'false' : 'true');
    if (!playing) setStatusIdle();
  },
});

const stateManager = new StateManager();

const loop = new Loop({
  scene,
  audioEngine,
  stateManager,
});

function resize() {
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  renderer.setSize(width, height, false);
  scene.resize(width, height);
}

scene.init({ width: window.innerWidth, height: window.innerHeight });
resize();
loop.start();

window.addEventListener('resize', resize);

function setStatus(text: string) {
  document.getElementById('status')!.textContent = text;
}

function setStatusIdle() {
  lastStatusBase = 'Choose a demo track, microphone, or a local file.';
  setStatus(lastStatusBase);
}

function modeLabel(mode: VisualMode) {
  if (mode === 'cinematic') return 'Cinematic';
  if (mode === 'live') return 'Live';
  return 'Acid';
}

function beatStatusSuffix(beat: BeatState | null, playing: boolean): string {
  if (!playing && !scene.needsWebcam()) return '';
  if (!beat) return '';
  if (beat.syncMode === 'off') return ' · sync off';
  if (beat.syncActive) return ` · ${Math.round(beat.bpm)} BPM`;
  if (playing) return ' · no beat';
  return '';
}

function updateModeStatus(mood?: string, beat?: BeatState | null) {
  const mode = scene.getVisualMode();
  const moodPart = mood ? ` · ${mood}` : '';
  const beatPart = beatStatusSuffix(beat ?? lastBeatState, audioPlaying);
  lastStatusBase = `${modeLabel(mode)}${moodPart}${beatPart}`;
  setStatus(lastStatusBase);
}

ui.innerHTML = `
  <div class="glass-panel">
    <h1 class="glass-title">Sound Visualiser</h1>
    <section class="glass-section" aria-labelledby="demo-heading">
      <h2 id="demo-heading">Demo Tracks</h2>
      <div class="glass-row">
        <button type="button" id="demoFreeTibet">Free Tibet</button>
        <button type="button" id="demoHuzur">Huzur</button>
      </div>
    </section>
    <section class="glass-section" aria-labelledby="upload-heading">
      <h2 id="upload-heading">Upload Local</h2>
      <input id="localFile" type="file" accept="audio/*" />
    </section>
    <section class="glass-section" aria-labelledby="mic-heading">
      <h2 id="mic-heading">Microphone</h2>
      <div class="glass-row">
        <button type="button" id="micBtn">Use microphone</button>
      </div>
    </section>
    <section class="glass-section" aria-labelledby="mode-heading">
      <h2 id="mode-heading">Visual Mode</h2>
      <div class="glass-row mode-row" role="group" aria-label="Visual mode">
        <button type="button" id="modeCinematic" class="mode-btn" data-mode="cinematic">Cinematic</button>
        <button type="button" id="modeLive" class="mode-btn" data-mode="live">Live</button>
        <button type="button" id="modeAcid" class="mode-btn" data-mode="acid">Acid</button>
      </div>
    </section>
    <section class="glass-section" aria-labelledby="sync-heading">
      <h2 id="sync-heading">Sync</h2>
      <div class="glass-row mode-row" role="group" aria-label="Beat sync">
        <button type="button" id="syncAuto" class="mode-btn" data-sync="auto">Auto</button>
        <button type="button" id="syncOff" class="mode-btn" data-sync="off">Off</button>
      </div>
    </section>
    <div class="glass-footer">
      <button type="button" id="stopBtn">Stop</button>
      <div id="status">Choose a demo track, microphone, or a local file.</div>
    </div>
  </div>
`;

const demoFreeTibet = document.getElementById('demoFreeTibet') as HTMLButtonElement;
const demoHuzur = document.getElementById('demoHuzur') as HTMLButtonElement;
const localFile = document.getElementById('localFile') as HTMLInputElement;
const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
const micBtn = document.getElementById('micBtn') as HTMLButtonElement;
const modeCinematic = document.getElementById('modeCinematic') as HTMLButtonElement;
const modeLive = document.getElementById('modeLive') as HTMLButtonElement;
const modeAcid = document.getElementById('modeAcid') as HTMLButtonElement;
const modeButtons = [modeCinematic, modeLive, modeAcid];
const syncAuto = document.getElementById('syncAuto') as HTMLButtonElement;
const syncOff = document.getElementById('syncOff') as HTMLButtonElement;
const syncButtons = [syncAuto, syncOff];

function updateSyncButtons() {
  const current = loop.getSyncMode();
  for (const btn of syncButtons) {
    const active = btn.dataset.sync === current;
    btn.classList.toggle('mode-btn--active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  }
}

function selectSync(mode: SyncMode) {
  if (mode === loop.getSyncMode()) return;
  loop.setSyncMode(mode);
  updateSyncButtons();
  updateModeStatus(undefined, lastBeatState);
}

for (const btn of syncButtons) {
  btn.addEventListener('click', () => {
    selectSync(btn.dataset.sync as SyncMode);
  });
}

function updateModeButtons() {
  const current = scene.getVisualMode();
  for (const btn of modeButtons) {
    const active = btn.dataset.mode === current;
    btn.classList.toggle('mode-btn--active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  }
}

async function selectMode(mode: VisualMode) {
  if (mode === scene.getVisualMode()) return;

  const needsCamera = mode === 'live' || mode === 'acid';
  try {
    if (needsCamera) setStatus('Starting camera…');
    await scene.setVisualMode(mode);
    updateModeButtons();
    updateModeStatus();
    if (needsCamera && scene.needsWebcam()) {
      updateModeStatus();
    } else if (!audioPlaying && mode === 'cinematic') {
      setStatusIdle();
    }
  } catch (err) {
    updateModeButtons();
    if (err instanceof VideoCaptureError) {
      setStatus(err.message);
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(`Error: ${msg}`);
    }
  }
}

for (const btn of modeButtons) {
  btn.addEventListener('click', () => {
    void selectMode(btn.dataset.mode as VisualMode);
  });
}

loop.setOnStateUpdate((state) => {
  lastBeatState = state.beat;
  if (audioPlaying || scene.needsWebcam()) {
    updateModeStatus(state.mood, state.beat);
  }
});

updateModeButtons();
updateSyncButtons();
updateModeStatus('calm');

window.addEventListener('beforeunload', () => {
  void scene.setVisualMode('cinematic');
});

async function playDemo(path: string, label: string) {
  try {
    setStatus(`Loading ${label}…`);
    await audioEngine.startUrl(path);
    setStatus(`Playing ${label}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setStatus(`Error: ${msg}`);
  }
}

demoFreeTibet.addEventListener('click', () => {
  void playDemo('/freetibet.mp3', 'Free Tibet');
});

demoHuzur.addEventListener('click', () => {
  void playDemo('/huzur.mp3', 'Huzur');
});

localFile.addEventListener('change', () => {
  const file = localFile.files?.[0];
  if (!file) return;
  void (async () => {
    try {
      setStatus(`Loading ${file.name}…`);
      await audioEngine.startFile(file);
      setStatus(`Playing ${file.name}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(`Error: ${msg}`);
    }
  })();
  localFile.value = '';
});

micBtn.addEventListener('click', () => {
  void (async () => {
    try {
      setStatus('Starting microphone…');
      await audioEngine.startMicrophone();
      setStatus('Microphone live');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(`Error: ${msg}`);
    }
  })();
});

stopBtn.addEventListener('click', () => {
  void audioEngine.stop();
});

hoverStopBtn.addEventListener('click', () => {
  void audioEngine.stop();
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') void audioEngine.stop();

  const target = e.target as HTMLElement | null;
  if (target?.tagName === 'INPUT') return;

  if (e.key === '1') void selectMode('cinematic');
  if (e.key === '2') void selectMode('live');
  if (e.key === '3') void selectMode('acid');
  if (e.key === 's' || e.key === 'S') {
    selectSync(loop.getSyncMode() === 'auto' ? 'off' : 'auto');
  }
});

// Debug: log extraction occasionally (optional).
let debugT = 0;
function debugTick(dt: number) {
  debugT += dt;
  if (debugT > 0.75) {
    debugT = 0;
    const f = audioEngine.getFeatures() satisfies AudioFeatures;
    // eslint-disable-next-line no-console
    console.log('[audio]', {
      rms: f.rms.toFixed(4),
      flux: f.spectralFlux.toFixed(4),
      bass: f.bass.toFixed(3),
      mid: f.mid.toFixed(3),
      high: f.high.toFixed(3),
      ...(lastBeatState
        ? {
            bpm: Math.round(lastBeatState.bpm),
            confidence: lastBeatState.confidence.toFixed(2),
            beatPhase: lastBeatState.beatPhase.toFixed(2),
            syncActive: lastBeatState.syncActive,
          }
        : {}),
    });
  }
}

setInterval(() => debugTick(0.5), 500);
