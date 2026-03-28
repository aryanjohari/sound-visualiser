import './styles.css';
import * as THREE from 'three';
import { AudioEngine, type AudioFeatures } from './audio/AudioEngine';
import { Loop } from './webgl/Loop';
import { StateManager } from './webgl/StateManager';
import { VJScene } from './webgl/Scene';

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

const audioEngine = new AudioEngine({
  onPlaybackStateChange(playing) {
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
  setStatus('Choose a demo track, microphone, or a local file.');
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
    });
  }
}

setInterval(() => debugTick(0.5), 500);
