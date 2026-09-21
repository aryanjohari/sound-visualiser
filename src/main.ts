import './styles.css';
import gsap from 'gsap';
import * as THREE from 'three';
import { AudioEngine, type AudioFeatures } from './audio/AudioEngine';
import { VideoCaptureError } from './camera/VideoCapture';
import { KeepCapture, KeepError, keepFilename } from './capture/KeepCapture';
import {
  LookInstrument,
  serializeLookDocument,
  type AxisName,
  type LookDocument,
  type LookId,
  type SyncPolicy,
} from './look';
import { Loop } from './webgl/Loop';
import { StateManager, type BeatState } from './webgl/StateManager';
import { VJScene } from './webgl/Scene';

type UiMode = 'intro' | 'playing' | 'compact' | 'lab';

const canvasEl = document.getElementById('webgl') as HTMLCanvasElement | null;
const uiEl = document.getElementById('ui') as HTMLDivElement | null;
const hoverStopHost = document.getElementById('hoverStopHost') as HTMLDivElement | null;
const hoverStopBtn = document.getElementById('hoverStopBtn') as HTMLButtonElement | null;
const introEl = document.getElementById('intro') as HTMLElement | null;
const introPlayBtn = document.getElementById('introPlayBtn') as HTMLButtonElement | null;
const introMicBtn = document.getElementById('introMicBtn') as HTMLButtonElement | null;
const introLabBtn = document.getElementById('introLabBtn') as HTMLButtonElement | null;
const introError = document.getElementById('introError') as HTMLParagraphElement | null;

if (!canvasEl) throw new Error('Missing canvas #webgl');
if (!uiEl) throw new Error('Missing #ui container');
if (!hoverStopHost || !hoverStopBtn) throw new Error('Missing hover stop controls');
if (!introEl || !introPlayBtn || !introMicBtn || !introLabBtn || !introError) {
  throw new Error('Missing intro controls');
}

const canvas = canvasEl;
const ui = uiEl;
const intro = introEl;
const introErrorEl = introError;

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
let uiMode: UiMode = 'intro';
let introDismissing = false;

const keep = new KeepCapture();

function setUiMode(mode: UiMode) {
  uiMode = mode;
  document.body.dataset.uiMode = mode;
  ui.dataset.uiMode = mode;
  ui.classList.toggle('glass-shell--recessed', mode === 'playing');
  const panel = ui.querySelector('.glass-panel') as HTMLElement | null;
  const compact = ui.querySelector('.compact-dock') as HTMLElement | null;
  const keepDock = ui.querySelector('.keep-dock') as HTMLElement | null;
  if (panel) panel.hidden = mode !== 'lab';
  if (compact) compact.hidden = mode !== 'compact';
  if (keepDock) {
    keepDock.hidden = !(mode === 'lab' || (mode === 'playing' && keep.isRecording()));
  }
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function playIntroEntrance() {
  const items = intro.querySelectorAll('.intro-anim');
  gsap.killTweensOf(items);
  if (prefersReducedMotion()) {
    gsap.set(items, { autoAlpha: 1, y: 0 });
    return;
  }
  gsap.fromTo(
    items,
    { autoAlpha: 0, y: 16 },
    {
      autoAlpha: 1,
      y: 0,
      duration: 0.55,
      stagger: 0.07,
      ease: 'power2.out',
    },
  );
}

function dismissIntro(onDone: () => void) {
  if (intro.hidden || introDismissing) {
    onDone();
    return;
  }
  introDismissing = true;
  intro.style.pointerEvents = 'none';
  gsap.killTweensOf(intro);
  gsap.killTweensOf(intro.querySelectorAll('.intro-anim'));
  gsap.to(intro, {
    autoAlpha: 0,
    duration: prefersReducedMotion() ? 0 : 0.45,
    ease: 'power2.inOut',
    onComplete: () => {
      intro.hidden = true;
      intro.setAttribute('aria-hidden', 'true');
      onDone();
    },
  });
}

function leaveIntro(next: UiMode) {
  if (uiMode !== 'intro') {
    setUiMode(next);
    return;
  }
  if (next === 'playing') {
    setUiMode('playing');
    dismissIntro(() => {});
    return;
  }
  dismissIntro(() => {
    setUiMode(next);
    if (next === 'lab') document.getElementById('labCloseBtn')?.focus();
  });
}

const audioEngine = new AudioEngine({
  onPlaybackStateChange(playing) {
    audioPlaying = playing;
    hoverStopHost.classList.toggle('hover-stop-host--active', playing);
    hoverStopHost.setAttribute('aria-hidden', playing ? 'false' : 'true');
    if (playing) {
      setIntroError(null);
      if (uiMode === 'intro') leaveIntro('playing');
      else setUiMode('playing');
    } else if (uiMode !== 'intro') {
      setUiMode('compact');
      setStatusIdle();
    }
  },
  onBeforeTeardown() {
    keep.abortForSourceTeardown();
  },
});

const stateManager = new StateManager();

const loop = new Loop({
  scene,
  audioEngine,
  stateManager,
});

const look = new LookInstrument({
  setLookId: (lookId) => scene.setVisualMode(lookId),
  setSyncPolicy: (syncPolicy) => loop.setSyncMode(syncPolicy),
  setAxes: (axes) => scene.setLookAxes(axes),
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
playIntroEntrance();
introPlayBtn.focus();

window.addEventListener('resize', resize);

function setStatus(text: string) {
  for (const el of document.querySelectorAll('.js-status')) {
    el.textContent = text;
  }
}

function setStatusIdle() {
  lastStatusBase = 'Choose a demo track, microphone, or a local file.';
  setStatus(lastStatusBase);
}

function setIntroError(msg: string | null) {
  if (msg) {
    introErrorEl.hidden = false;
    introErrorEl.textContent = msg;
  } else {
    introErrorEl.hidden = true;
    introErrorEl.textContent = '';
  }
}

function modeLabel(mode: LookId) {
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
  const mode = look.getDocument().lookId;
  const moodPart = mood ? ` · ${mood}` : '';
  const beatPart = beatStatusSuffix(beat ?? lastBeatState, audioPlaying);
  lastStatusBase = `${modeLabel(mode)}${moodPart}${beatPart}`;
  setStatus(lastStatusBase);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadLookJson(doc: LookDocument) {
  const blob = new Blob([serializeLookDocument(doc)], { type: 'application/json' });
  downloadBlob(blob, 'look.json');
}

ui.innerHTML = `
  <div class="glass-panel">
    <div class="glass-panel-head">
      <h1 class="glass-title">Lab</h1>
      <button type="button" id="labCloseBtn" class="lab-close">Close</button>
    </div>
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
      <h2 id="mode-heading">Look</h2>
      <div class="glass-row mode-row" role="group" aria-label="Look">
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
    <section class="glass-section" aria-labelledby="axes-heading">
      <h2 id="axes-heading">Axes</h2>
      <div class="axis-row">
        <label for="axisIntensity">Intensity</label>
        <input id="axisIntensity" type="range" min="0" max="2" step="0.01" value="1" data-axis="intensity" />
        <span class="axis-val" data-axis-val="intensity">1.00</span>
      </div>
      <div id="axisGlitchWrap" hidden>
        <div class="axis-row">
          <label for="axisGlitch">Glitch</label>
          <input id="axisGlitch" type="range" min="0" max="2" step="0.01" value="1" data-axis="glitch" />
          <span class="axis-val" data-axis-val="glitch">1.00</span>
        </div>
      </div>
      <div id="axisAcidWrap" hidden>
        <div class="axis-row">
          <label for="axisFeedback">Feedback</label>
          <input id="axisFeedback" type="range" min="0" max="2" step="0.01" value="1" data-axis="feedback" />
          <span class="axis-val" data-axis-val="feedback">1.00</span>
        </div>
        <div class="axis-row">
          <label for="axisFold">Fold</label>
          <input id="axisFold" type="range" min="0" max="2" step="0.01" value="1" data-axis="fold" />
          <span class="axis-val" data-axis-val="fold">1.00</span>
        </div>
        <div class="axis-row">
          <label for="axisHue">Hue</label>
          <input id="axisHue" type="range" min="0" max="2" step="0.01" value="1" data-axis="hue" />
          <span class="axis-val" data-axis-val="hue">1.00</span>
        </div>
        <div class="axis-row">
          <label for="axisMelt">Melt</label>
          <input id="axisMelt" type="range" min="0" max="2" step="0.01" value="1" data-axis="melt" />
          <span class="axis-val" data-axis-val="melt">1.00</span>
        </div>
      </div>
    </section>
    <section class="glass-section" aria-labelledby="lookfile-heading">
      <h2 id="lookfile-heading">Look JSON</h2>
      <div class="glass-row">
        <button type="button" id="downloadLookBtn">Download JSON</button>
        <label class="file-label">
          Reload JSON
          <input id="loadLookFile" type="file" accept="application/json,.json" />
        </label>
      </div>
    </section>
    <div class="glass-footer">
      <button type="button" id="stopBtn">Stop</button>
      <div id="status" class="js-status">Choose a demo track, microphone, or a local file.</div>
    </div>
  </div>
  <div class="keep-dock">
    <button type="button" id="keepBtn">Start Keep</button>
    <span id="keepHint">30s canvas + audio</span>
  </div>
  <div class="compact-dock">
    <div class="compact-row">
      <button type="button" id="compactPlayBtn" class="compact-play">Play demo</button>
      <button type="button" id="compactMicBtn">Microphone</button>
      <label class="compact-file-label">
        File
        <input id="compactFile" type="file" accept="audio/*" />
      </label>
      <div class="compact-looks" role="group" aria-label="Look">
        <button type="button" id="compactModeCinematic" class="mode-btn" data-mode="cinematic">Cinematic</button>
        <button type="button" id="compactModeLive" class="mode-btn" data-mode="live">Live</button>
        <button type="button" id="compactModeAcid" class="mode-btn" data-mode="acid">Acid</button>
      </div>
      <button type="button" id="compactLabBtn">Lab</button>
    </div>
    <div id="compactStatus" class="js-status">Choose a demo track, microphone, or a local file.</div>
  </div>
`;

const demoFreeTibet = document.getElementById('demoFreeTibet') as HTMLButtonElement;
const demoHuzur = document.getElementById('demoHuzur') as HTMLButtonElement;
const localFile = document.getElementById('localFile') as HTMLInputElement;
const compactFile = document.getElementById('compactFile') as HTMLInputElement;
const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
const micBtn = document.getElementById('micBtn') as HTMLButtonElement;
const compactPlayBtn = document.getElementById('compactPlayBtn') as HTMLButtonElement;
const compactMicBtn = document.getElementById('compactMicBtn') as HTMLButtonElement;
const compactLabBtn = document.getElementById('compactLabBtn') as HTMLButtonElement;
const labCloseBtn = document.getElementById('labCloseBtn') as HTMLButtonElement;
const modeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-mode]'));
const syncAuto = document.getElementById('syncAuto') as HTMLButtonElement;
const syncOff = document.getElementById('syncOff') as HTMLButtonElement;
const syncButtons = [syncAuto, syncOff];
const axisInputs = Array.from(ui.querySelectorAll<HTMLInputElement>('input[data-axis]'));
const axisGlitchWrap = document.getElementById('axisGlitchWrap') as HTMLDivElement;
const axisAcidWrap = document.getElementById('axisAcidWrap') as HTMLDivElement;
const downloadLookBtn = document.getElementById('downloadLookBtn') as HTMLButtonElement;
const loadLookFile = document.getElementById('loadLookFile') as HTMLInputElement;
const keepBtn = document.getElementById('keepBtn') as HTMLButtonElement;
const keepHint = document.getElementById('keepHint') as HTMLSpanElement;

if (
  !demoFreeTibet ||
  !demoHuzur ||
  !localFile ||
  !compactFile ||
  !stopBtn ||
  !micBtn ||
  !compactPlayBtn ||
  !compactMicBtn ||
  !compactLabBtn ||
  !labCloseBtn ||
  !syncAuto ||
  !syncOff ||
  !axisGlitchWrap ||
  !axisAcidWrap ||
  !downloadLookBtn ||
  !loadLookFile ||
  !keepBtn ||
  !keepHint
) {
  throw new Error('Missing lab or compact controls');
}

function syncUiFromDocument() {
  const doc = look.getDocument();
  for (const btn of modeButtons) {
    const active = btn.dataset.mode === doc.lookId;
    btn.classList.toggle('mode-btn--active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  }
  for (const btn of syncButtons) {
    const active = btn.dataset.sync === doc.syncPolicy;
    btn.classList.toggle('mode-btn--active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  }
  axisGlitchWrap.hidden = doc.lookId === 'cinematic';
  axisAcidWrap.hidden = doc.lookId !== 'acid';
  for (const input of axisInputs) {
    const name = input.dataset.axis as AxisName;
    input.value = String(doc.axes[name]);
    const label = ui.querySelector(`[data-axis-val="${name}"]`);
    if (label) label.textContent = doc.axes[name].toFixed(2);
  }
}

function formatKeepError(err: unknown) {
  if (err instanceof KeepError || err instanceof VideoCaptureError) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}

async function selectSync(mode: SyncPolicy) {
  if (mode === look.getDocument().syncPolicy) return;
  try {
    await look.patch({ syncPolicy: mode });
    syncUiFromDocument();
    updateModeStatus(undefined, lastBeatState);
  } catch (err) {
    syncUiFromDocument();
    setStatus(`Error: ${formatKeepError(err)}`);
  }
}

async function selectMode(mode: LookId) {
  if (mode === look.getDocument().lookId) return;

  const needsCamera = mode === 'live' || mode === 'acid';
  try {
    if (needsCamera) setStatus('Starting camera…');
    await look.patch({ lookId: mode });
    syncUiFromDocument();
    updateModeStatus();
    if (needsCamera && scene.needsWebcam()) {
      updateModeStatus();
    } else if (!audioPlaying && mode === 'cinematic') {
      setStatusIdle();
    }
  } catch (err) {
    syncUiFromDocument();
    if (err instanceof VideoCaptureError) {
      setStatus(err.message);
    } else {
      setStatus(`Error: ${formatKeepError(err)}`);
    }
  }
}

async function selectAxis(name: AxisName, raw: number) {
  const value = Math.min(2, Math.max(0, raw));
  try {
    await look.patch({ axes: { [name]: value } });
    syncUiFromDocument();
  } catch (err) {
    syncUiFromDocument();
    setStatus(`Error: ${formatKeepError(err)}`);
  }
}

function updateKeepButton() {
  const recording = keep.isRecording();
  keepBtn.textContent = recording ? 'Stop Keep' : 'Start Keep';
  keepBtn.classList.toggle('mode-btn--active', recording);
  keepHint.textContent = recording ? 'Recording… 30s cap' : '30s canvas + audio';
  ui.classList.toggle('glass-shell--keeping', recording);
  const keepDock = ui.querySelector('.keep-dock') as HTMLElement | null;
  if (keepDock) {
    keepDock.hidden = !(uiMode === 'lab' || (uiMode === 'playing' && recording));
  }
}

async function toggleKeep() {
  if (keep.isRecording()) {
    try {
      await keep.stop();
    } catch (err) {
      updateKeepButton();
      setStatus(formatKeepError(err));
    }
    return;
  }

  try {
    keep.start(renderer.domElement, audioEngine, (err, result) => {
      updateKeepButton();
      if (err) {
        setStatus(formatKeepError(err));
        return;
      }
      if (!result) {
        setStatus('Keep failed.');
        return;
      }
      downloadBlob(result.blob, keepFilename(result.mimeType));
      downloadLookJson(look.getDocument());
      setStatus('Keep saved (clip + look JSON).');
    });
    updateKeepButton();
    setStatus('Keep recording (canvas + audio). HUD is not in the clip.');
  } catch (err) {
    updateKeepButton();
    setStatus(formatKeepError(err));
  }
}

for (const btn of syncButtons) {
  btn.addEventListener('click', () => {
    void selectSync(btn.dataset.sync as SyncPolicy);
  });
}

for (const btn of modeButtons) {
  btn.addEventListener('click', () => {
    void selectMode(btn.dataset.mode as LookId);
  });
}

for (const input of axisInputs) {
  input.addEventListener('input', () => {
    const name = input.dataset.axis as AxisName;
    void selectAxis(name, Number(input.value));
  });
}

downloadLookBtn.addEventListener('click', () => {
  downloadLookJson(look.getDocument());
  setStatus('Look JSON downloaded.');
});

loadLookFile.addEventListener('change', () => {
  const file = loadLookFile.files?.[0];
  if (!file) return;
  void (async () => {
    try {
      const text = await file.text();
      await look.loadJson(text);
      syncUiFromDocument();
      updateModeStatus();
      setStatus('Look JSON applied.');
    } catch (err) {
      syncUiFromDocument();
      setStatus(`Error: ${formatKeepError(err)}`);
    }
  })();
  loadLookFile.value = '';
});

keepBtn.addEventListener('click', () => {
  void toggleKeep();
});

loop.setOnStateUpdate((state) => {
  lastBeatState = state.beat;
  if (audioPlaying || scene.needsWebcam()) {
    updateModeStatus(state.mood, state.beat);
  }
});

syncUiFromDocument();
updateModeStatus('calm');
updateKeepButton();
setUiMode('intro');

window.addEventListener('beforeunload', () => {
  if (keep.isRecording()) {
    keep.abortForSourceTeardown();
  }
  void look.patch({ lookId: 'cinematic' });
});

async function playDemo(path: string, label: string) {
  try {
    setIntroError(null);
    setStatus(`Loading ${label}…`);
    await audioEngine.startUrl(path);
    setStatus(`Playing ${label}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setStatus(`Error: ${msg}`);
    if (uiMode === 'intro') setIntroError(msg);
  }
}

async function startMic() {
  try {
    setIntroError(null);
    setStatus('Starting microphone…');
    await audioEngine.startMicrophone();
    setStatus('Microphone live');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setStatus(`Error: ${msg}`);
    if (uiMode === 'intro') setIntroError(msg);
  }
}

async function playLocalFile(file: File) {
  try {
    setStatus(`Loading ${file.name}…`);
    await audioEngine.startFile(file);
    setStatus(`Playing ${file.name}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setStatus(`Error: ${msg}`);
  }
}

function onLocalFileChange(input: HTMLInputElement) {
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  void playLocalFile(file);
}

demoFreeTibet.addEventListener('click', () => {
  void playDemo('/freetibet.mp3', 'Free Tibet');
});

demoHuzur.addEventListener('click', () => {
  void playDemo('/huzur.mp3', 'Huzur');
});

compactPlayBtn.addEventListener('click', () => {
  void playDemo('/freetibet.mp3', 'Free Tibet');
});

introPlayBtn.addEventListener('click', () => {
  void playDemo('/freetibet.mp3', 'Free Tibet');
});

localFile.addEventListener('change', () => {
  onLocalFileChange(localFile);
});

compactFile.addEventListener('change', () => {
  onLocalFileChange(compactFile);
});

micBtn.addEventListener('click', () => {
  void startMic();
});

compactMicBtn.addEventListener('click', () => {
  void startMic();
});

introMicBtn.addEventListener('click', () => {
  void startMic();
});

introLabBtn.addEventListener('click', () => {
  leaveIntro('lab');
});

compactLabBtn.addEventListener('click', () => {
  setUiMode('lab');
  labCloseBtn.focus();
});

labCloseBtn.addEventListener('click', () => {
  setUiMode('compact');
});

stopBtn.addEventListener('click', () => {
  void audioEngine.stop();
});

hoverStopBtn.addEventListener('click', () => {
  void audioEngine.stop();
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (audioPlaying) void audioEngine.stop();
    else if (uiMode === 'lab') setUiMode('compact');
    return;
  }

  const target = e.target as HTMLElement | null;
  if (target?.tagName === 'INPUT') return;

  if (e.key === '1') void selectMode('cinematic');
  if (e.key === '2') void selectMode('live');
  if (e.key === '3') void selectMode('acid');
  if (e.key === 's' || e.key === 'S') {
    void selectSync(look.getDocument().syncPolicy === 'auto' ? 'off' : 'auto');
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
