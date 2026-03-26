import './styles.css';
import * as THREE from 'three';
import { AudioEngine, type AudioFeatures } from './audio/AudioEngine';
import { Loop } from './webgl/Loop';
import { StateManager } from './webgl/StateManager';
import { VJScene } from './webgl/Scene';

const canvas = document.getElementById('webgl') as HTMLCanvasElement | null;
const ui = document.getElementById('ui') as HTMLDivElement | null;

if (!canvas) throw new Error('Missing canvas #webgl');
if (!ui) throw new Error('Missing #ui container');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 1);

const scene = new VJScene(renderer);

const audioEngine = new AudioEngine();
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

// --- Simple source toggle UI ---
let selectedFile: File | null = null;

ui.innerHTML = `
  <div class="uiRow">
    <label>
      <input type="checkbox" id="modeMic" checked />
      Microphone
    </label>
    <label style="display:flex;align-items:center;gap:8px;">
      <input type="checkbox" id="modeFile" />
      Audio file
    </label>
  </div>
  <div class="uiRow" style="margin-bottom:0;">
    <input id="fileInput" type="file" accept="audio/*" style="display:none;" />
  </div>
  <div class="uiRow">
    <button id="startBtn">Start</button>
    <button id="stopBtn">Stop</button>
  </div>
  <div class="uiRow" style="margin-bottom:0;">
    <div id="status" style="opacity:0.9;">Idle</div>
  </div>
`;

const modeMic = document.getElementById('modeMic') as HTMLInputElement;
const modeFile = document.getElementById('modeFile') as HTMLInputElement;
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
const status = document.getElementById('status') as HTMLDivElement;

function setStatus(text: string) {
  status.textContent = text;
}

function syncModeUI() {
  if (modeMic.checked) {
    fileInput.style.display = 'none';
    modeFile.checked = false;
  } else {
    fileInput.style.display = 'block';
    modeFile.checked = true;
  }
}

modeMic.addEventListener('change', () => {
  if (modeMic.checked) syncModeUI();
});

modeFile.addEventListener('change', () => {
  if (modeFile.checked) {
    modeMic.checked = false;
    syncModeUI();
  }
});

fileInput.addEventListener('change', () => {
  selectedFile = fileInput.files?.[0] ?? null;
});

startBtn.addEventListener('click', async () => {
  try {
    if (modeMic.checked) {
      setStatus('Starting microphone...');
      await audioEngine.startMicrophone();
      setStatus('Mic running');
    } else {
      if (!selectedFile) {
        setStatus('Select an audio file first');
        return;
      }
      setStatus('Loading audio file...');
      await audioEngine.startFile(selectedFile);
      setStatus('File playing');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setStatus(`Error: ${msg}`);
  }
});

stopBtn.addEventListener('click', async () => {
  await audioEngine.stop();
  setStatus('Stopped');
});

syncModeUI();

// Debug hook (optional): log occasionally so we can see extraction working.
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

// Attach debug to the render loop via an interval (safe without changing Loop.ts).
setInterval(() => debugTick(0.5), 500);

