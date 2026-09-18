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
  /** Fires when mic/file playback becomes active or after file/mic fully stops (including natural track end). */
  onPlaybackStateChange?: (playing: boolean) => void;
  /** Fires before source/context teardown so capture can disconnect its tap. */
  onBeforeTeardown?: () => void;
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
  private objectUrlToRevoke: string | null = null;
  private onElementEnded: (() => void) | null = null;

  private analyzer: MeydaAnalyzer | null = null;
  private prevPowerSpectrum: Float32Array | null = null;

  private readonly bufferSize: number;
  private readonly hopSize: number;
  private readonly onFeatures?: (features: AudioFeatures) => void;
  private readonly onPlaybackStateChange?: (playing: boolean) => void;
  private readonly onBeforeTeardown?: () => void;

  private latest: AudioFeatures = { ...DEFAULT_FEATURES };

  constructor(options: AudioEngineOptions = {}) {
    this.bufferSize = options.bufferSize ?? 512;
    this.hopSize = options.hopSize ?? 256;
    this.onFeatures = options.onFeatures;
    this.onPlaybackStateChange = options.onPlaybackStateChange;
    this.onBeforeTeardown = options.onBeforeTeardown;
  }

  /** Shared context for Keep tap. Do not close because recording ended. */
  getAudioContext() {
    return this.audioContext;
  }

  /** Current mic/file source for `createMediaStreamDestination` fan-out. `powerSpectrum` stays in this file. */
  getCurrentSource() {
    return this.sourceNode;
  }

  private notifyPlayback(playing: boolean) {
    this.onPlaybackStateChange?.(playing);
  }

  getFeatures() {
    return this.latest;
  }

  async startMicrophone() {
    await this.teardown();

    this.mode = 'mic';

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioCtx();

    await this.audioContext.resume();

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);

    this.createAnalyzerAndStart(this.sourceNode);
    this.notifyPlayback(true);
  }

  /** Play remote or public URL (e.g. `/track.mp3`). Does not revoke the URL on stop. */
  async startUrl(url: string) {
    await this.startFromMediaUrl(url, false);
  }

  /** Play a local file via `URL.createObjectURL`; revokes the blob URL on stop. */
  async startFile(file: File) {
    const objectUrl = URL.createObjectURL(file);
    await this.startFromMediaUrl(objectUrl, true);
  }

  private async startFromMediaUrl(url: string, revokeObjectUrlOnStop: boolean) {
    await this.teardown();

    this.mode = 'file';
    this.objectUrlToRevoke = revokeObjectUrlOnStop ? url : null;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioCtx();
    await this.audioContext.resume();

    const element = new Audio(url);
    element.crossOrigin = 'anonymous';
    element.loop = false;

    this.element = element;
    this.sourceNode = this.audioContext.createMediaElementSource(element);
    this.sourceNode.connect(this.audioContext.destination);

    this.createAnalyzerAndStart(this.sourceNode);

    const onEnded = () => {
      void this.stop();
    };
    this.onElementEnded = onEnded;
    element.addEventListener('ended', onEnded);

    try {
      await element.play();
      this.notifyPlayback(true);
    } catch (err) {
      await this.teardown();
      // Do not notifyPlayback(false): UI was never recessed; avoids clobbering error status in the host.
      throw err;
    }
  }

  async stop() {
    await this.teardown();
    this.notifyPlayback(false);
  }

  private async teardown() {
    this.onBeforeTeardown?.();
    this.mode = null;

    if (this.element && this.onElementEnded) {
      this.element.removeEventListener('ended', this.onElementEnded);
    }
    this.onElementEnded = null;

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
      this.element.src = '';
    }
    this.element = null;

    if (this.objectUrlToRevoke) {
      URL.revokeObjectURL(this.objectUrlToRevoke);
      this.objectUrlToRevoke = null;
    }

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

