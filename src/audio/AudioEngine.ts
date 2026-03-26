import Meyda from 'meyda';
import type { MeydaAnalyzer } from 'meyda/dist/esm/meyda-wa';

export type AudioFeatures = {
  rms: number;
  spectralFlux: number;
  lowpass: number;
  bass: number;
  mid: number;
  high: number;
};

export type AudioEngineOptions = {
  bufferSize?: number;
  hopSize?: number;
  onFeatures?: (features: AudioFeatures) => void;
};

type AudioSourceMode = 'mic' | 'file';

const DEFAULT_FEATURES: AudioFeatures = {
  rms: 0,
  spectralFlux: 0,
  lowpass: 0,
  bass: 0,
  mid: 0,
  high: 0,
};

function bandEnergy(
  powerSpectrum: Float32Array,
  hzPerBin: number,
  startHz: number,
  endHz: number,
) {
  const startBin = Math.max(0, Math.floor(startHz / hzPerBin));
  const endBin = Math.min(powerSpectrum.length - 1, Math.floor(endHz / hzPerBin));
  if (endBin <= startBin) return 0;

  let sum = 0;
  for (let i = startBin; i <= endBin; i += 1) sum += powerSpectrum[i];

  // Compress dynamic range; Meyda's powerSpectrum can get large on loud tracks.
  return Math.log10(1 + sum);
}

export class AudioEngine {
  private mode: AudioSourceMode | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private element: HTMLAudioElement | null = null;

  private analyzer: MeydaAnalyzer | null = null;
  private prevPowerSpectrum: Float32Array | null = null;

  private readonly bufferSize: number;
  private readonly hopSize: number;
  private readonly onFeatures?: (features: AudioFeatures) => void;

  private latest: AudioFeatures = { ...DEFAULT_FEATURES };

  constructor(options: AudioEngineOptions = {}) {
    this.bufferSize = options.bufferSize ?? 512;
    this.hopSize = options.hopSize ?? 256;
    this.onFeatures = options.onFeatures;
  }

  getFeatures() {
    return this.latest;
  }

  async startMicrophone() {
    this.stop();
    this.mode = 'mic';

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioCtx();

    await this.audioContext.resume();

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);

    this.createAnalyzerAndStart(this.sourceNode);
  }

  async startFile(file: File) {
    this.stop();
    this.mode = 'file';

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioCtx();
    await this.audioContext.resume();

    const url = URL.createObjectURL(file);
    const element = new Audio(url);
    element.crossOrigin = 'anonymous';
    element.loop = false;

    // Create a source node for Meyda, but also connect to destination so the track can be heard.
    this.element = element;
    this.sourceNode = this.audioContext.createMediaElementSource(element);
    this.sourceNode.connect(this.audioContext.destination);

    this.createAnalyzerAndStart(this.sourceNode);

    await element.play();
  }

  async stop() {
    this.mode = null;

    try {
      this.analyzer?.stop();
    } catch {
      // ignore
    }
    this.analyzer = null;

    this.sourceNode = null;

    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
    }
    this.stream = null;

    if (this.element) {
      this.element.pause();
      // Best-effort release
      this.element.src = '';
    }
    this.element = null;

    // Keep the AudioContext around only if it already exists; it can be resumed on next start.
    if (this.audioContext) {
      try {
        await this.audioContext.suspend();
      } catch {
        // ignore
      }
    }

    this.prevPowerSpectrum = null;
  }

  private createAnalyzerAndStart(source: MediaStreamAudioSourceNode | MediaElementAudioSourceNode) {
    if (!this.audioContext) throw new Error('AudioContext not initialised');

    const hzPerBin = this.audioContext.sampleRate / this.bufferSize;

    this.prevPowerSpectrum = null;
    this.analyzer = Meyda.createMeydaAnalyzer({
      audioContext: this.audioContext,
      source,
      bufferSize: this.bufferSize,
      hopSize: this.hopSize,
      // NOTE: `spectralFlux` extractor is currently crashing in the Meyda web build,
      // so we compute it ourselves from frame-to-frame powerSpectrum deltas.
      featureExtractors: ['rms', 'powerSpectrum'],
      callback: (features: any) => {
        const rms = (features?.rms ?? 0) as number;
        const powerSpectrum = features?.powerSpectrum as Float32Array | undefined;

        // Spectral flux: sum of positive differences between current and previous spectra.
        let spectralFlux = 0;
        if (powerSpectrum && this.prevPowerSpectrum) {
          const n = Math.min(powerSpectrum.length, this.prevPowerSpectrum.length);
          let sumPos = 0;
          for (let i = 0; i < n; i += 1) {
            const d = powerSpectrum[i] - this.prevPowerSpectrum[i];
            if (d > 0) sumPos += d;
          }
          // Compress the dynamic range; keep it roughly in [0..] for gating.
          spectralFlux = Math.log10(1 + sumPos);
        }
        this.prevPowerSpectrum = powerSpectrum ? new Float32Array(powerSpectrum) : this.prevPowerSpectrum;

        let lowpass = 0;
        let bass = 0;
        let mid = 0;
        let high = 0;

        if (powerSpectrum && powerSpectrum.length) {
          lowpass = bandEnergy(powerSpectrum, hzPerBin, 0, 220);
          bass = bandEnergy(powerSpectrum, hzPerBin, 20, 140);
          mid = bandEnergy(powerSpectrum, hzPerBin, 200, 2000);
          high = bandEnergy(powerSpectrum, hzPerBin, 4000, 12000);
        }

        this.latest = { rms, spectralFlux, lowpass, bass, mid, high };
        this.onFeatures?.(this.latest);
      },
    });

    this.analyzer.start();
  }
}

