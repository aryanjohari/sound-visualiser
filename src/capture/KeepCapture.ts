import type { AudioEngine } from '../audio/AudioEngine';

export const KEEP_DURATION_CAP_SEC = 30;
export const KEEP_CAPTURE_FPS = 30;

const WEBM_MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
] as const;

const MP4_MIME_CANDIDATES = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4'] as const;

export class KeepError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KeepError';
  }
}

export type KeepResult = {
  blob: Blob;
  mimeType: string;
};

export function pickKeepMimeType(
  isTypeSupported: (mime: string) => boolean = (mime) =>
    typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime),
): string | null {
  for (const mime of WEBM_MIME_CANDIDATES) {
    if (isTypeSupported(mime)) return mime;
  }
  for (const mime of MP4_MIME_CANDIDATES) {
    if (isTypeSupported(mime)) return mime;
  }
  return null;
}

export function keepFilename(mimeType: string, at = new Date()): string {
  const stamp = at.toISOString().replace(/[:.]/g, '-');
  const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
  return `keep-${stamp}.${ext}`;
}

export type KeepSettled = (err: KeepError | null, result: KeepResult | null) => void;

/**
 * Keep door: same canvas stream + AudioContext fan-out. HUD is not in the pixels.
 * Silent clip / missing tap / unsupported mime → fail closed.
 */
export class KeepCapture {
  private dest: MediaStreamAudioDestinationNode | null = null;
  private tappedSource: AudioNode | null = null;
  private recorder: MediaRecorder | null = null;
  private canvasStream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private mimeType = '';
  private capTimer: ReturnType<typeof setTimeout> | null = null;
  private stopPromise: Promise<KeepResult> | null = null;
  private hadAudioTrack = false;
  private onSettled: KeepSettled | null = null;

  isRecording() {
    return this.recorder != null && this.recorder.state !== 'inactive';
  }

  start(canvas: HTMLCanvasElement, audioEngine: AudioEngine, onSettled?: KeepSettled) {
    if (this.recorder) {
      throw new KeepError('Keep is already recording.');
    }
    if (typeof MediaRecorder === 'undefined') {
      throw new KeepError('MediaRecorder is not available in this browser. Keep failed.');
    }

    const audioContext = audioEngine.getAudioContext();
    const source = audioEngine.getCurrentSource();
    if (!audioContext || !source) {
      throw new KeepError('Play a track or use the microphone before Keep. Keep failed.');
    }
    if (audioContext.state === 'suspended') {
      throw new KeepError('Audio context is suspended. Play a track first. Keep failed.');
    }

    const mimeType = pickKeepMimeType();
    if (!mimeType) {
      throw new KeepError('No supported recorder mime type (WebM or MP4). Keep failed.');
    }

    let videoStream: MediaStream;
    try {
      videoStream = canvas.captureStream(KEEP_CAPTURE_FPS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new KeepError(`Canvas capture failed (${msg}). Keep failed.`);
    }

    const videoTrack = videoStream.getVideoTracks()[0];
    if (!videoTrack) {
      this.stopTracks(videoStream);
      throw new KeepError('No video track from the canvas. Keep failed.');
    }

    let dest: MediaStreamAudioDestinationNode;
    try {
      dest = audioContext.createMediaStreamDestination();
      source.connect(dest);
    } catch (err) {
      this.stopTracks(videoStream);
      const msg = err instanceof Error ? err.message : String(err);
      throw new KeepError(`Audio tap failed (${msg}). Keep failed.`);
    }

    const audioTrack = dest.stream.getAudioTracks()[0];
    if (!audioTrack || audioTrack.readyState === 'ended') {
      try {
        source.disconnect(dest);
      } catch {
        // ignore
      }
      try {
        dest.disconnect();
      } catch {
        // ignore
      }
      this.stopTracks(videoStream);
      throw new KeepError('No audio track to record. Silent Keep is not allowed.');
    }

    const combined = new MediaStream([videoTrack, audioTrack]);
    if (combined.getAudioTracks().length === 0) {
      this.teardownTap(source, dest, videoStream);
      throw new KeepError('Combined stream has no audio track. Silent Keep is not allowed.');
    }

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(combined, { mimeType });
    } catch (err) {
      this.teardownTap(source, dest, videoStream);
      const msg = err instanceof Error ? err.message : String(err);
      throw new KeepError(`MediaRecorder failed (${msg}). Keep failed.`);
    }

    this.dest = dest;
    this.tappedSource = source;
    this.canvasStream = videoStream;
    this.recorder = recorder;
    this.chunks = [];
    this.mimeType = mimeType;
    this.hadAudioTrack = true;
    this.stopPromise = null;
    this.onSettled = onSettled ?? null;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) this.chunks.push(event.data);
    };

    try {
      recorder.start();
    } catch (err) {
      this.disconnectTap();
      this.stopTracks(videoStream);
      this.resetSession();
      const msg = err instanceof Error ? err.message : String(err);
      throw new KeepError(`Could not start Keep (${msg}). Canvas may be tainted. Keep failed.`);
    }

    this.capTimer = setTimeout(() => {
      void this.stop().catch(() => undefined);
    }, KEEP_DURATION_CAP_SEC * 1000);
  }

  async stop(): Promise<KeepResult> {
    if (this.stopPromise) return this.stopPromise;
    if (!this.recorder) {
      this.disconnectTap();
      throw new KeepError('Keep is not recording.');
    }

    this.stopPromise = this.finalize();
    return this.stopPromise;
  }

  /** Called before AudioEngine tears down the source so the tap is not left connected. */
  abortForSourceTeardown() {
    this.disconnectTap();
    if (!this.recorder) return;
    void this.stop().catch(() => undefined);
  }

  private async finalize(): Promise<KeepResult> {
    const onSettled = this.onSettled;
    try {
      const recorder = this.recorder;
      if (!recorder) {
        throw new KeepError('Keep is not recording.');
      }

      if (this.capTimer) {
        clearTimeout(this.capTimer);
        this.capTimer = null;
      }

      const blob = await new Promise<Blob>((resolve, reject) => {
        recorder.onerror = () => {
          reject(new KeepError('MediaRecorder error. Keep failed.'));
        };
        recorder.onstop = () => {
          resolve(new Blob(this.chunks, { type: this.mimeType || recorder.mimeType }));
        };
        try {
          if (recorder.state !== 'inactive') recorder.stop();
          else resolve(new Blob(this.chunks, { type: this.mimeType || recorder.mimeType }));
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          reject(new KeepError(`Could not stop Keep (${msg}). Keep failed.`));
        }
      });

      this.disconnectTap();
      if (this.canvasStream) this.stopTracks(this.canvasStream);

      const mimeType = this.mimeType;
      const hadAudio = this.hadAudioTrack;
      if (this.dest != null || this.tappedSource != null) {
        throw new KeepError('Audio tap still connected. Keep failed.');
      }
      if (!hadAudio) {
        throw new KeepError('No audio track. Silent Keep is not allowed.');
      }
      if (blob.size <= 0) {
        throw new KeepError('Keep produced an empty file. Keep failed.');
      }

      const result = { blob, mimeType };
      this.resetSession();
      onSettled?.(null, result);
      return result;
    } catch (err) {
      this.disconnectTap();
      if (this.canvasStream) this.stopTracks(this.canvasStream);
      this.resetSession();
      const keepErr =
        err instanceof KeepError ? err : new KeepError(err instanceof Error ? err.message : 'Keep failed.');
      onSettled?.(keepErr, null);
      throw keepErr;
    }
  }

  private teardownTap(source: AudioNode, dest: MediaStreamAudioDestinationNode, videoStream: MediaStream) {
    try {
      source.disconnect(dest);
    } catch {
      // ignore
    }
    try {
      dest.disconnect();
    } catch {
      // ignore
    }
    this.stopTracks(videoStream);
  }

  private disconnectTap() {
    if (this.tappedSource && this.dest) {
      try {
        this.tappedSource.disconnect(this.dest);
      } catch {
        // already disconnected
      }
    }
    if (this.dest) {
      try {
        this.dest.disconnect();
      } catch {
        // destination has no outputs; still honour disconnect-on-stop
      }
    }
    this.tappedSource = null;
    this.dest = null;
  }

  private stopTracks(stream: MediaStream) {
    for (const track of stream.getTracks()) {
      try {
        track.stop();
      } catch {
        // ignore
      }
    }
  }

  private resetSession() {
    this.recorder = null;
    this.canvasStream = null;
    this.chunks = [];
    this.mimeType = '';
    this.hadAudioTrack = false;
    this.stopPromise = null;
    this.onSettled = null;
    if (this.capTimer) {
      clearTimeout(this.capTimer);
      this.capTimer = null;
    }
  }
}
