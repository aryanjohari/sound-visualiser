import * as THREE from 'three';

export class VideoCaptureError extends Error {
  constructor(
    message: string,
    readonly code: 'NotAllowedError' | 'NotFoundError' | 'NotReadableError' | 'Unknown',
  ) {
    super(message);
    this.name = 'VideoCaptureError';
  }
}

function mapMediaError(err: unknown): VideoCaptureError {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError') {
      return new VideoCaptureError(
        'Camera permission denied — check browser settings.',
        'NotAllowedError',
      );
    }
    if (err.name === 'NotFoundError') {
      return new VideoCaptureError('No camera found.', 'NotFoundError');
    }
    if (err.name === 'NotReadableError') {
      return new VideoCaptureError(
        'Camera is in use by another app or could not be started.',
        'NotReadableError',
      );
    }
  }
  const msg = err instanceof Error ? err.message : String(err);
  return new VideoCaptureError(msg, 'Unknown');
}

/**
 * Webcam capture: getUserMedia stream → hidden video element → Three.js VideoTexture.
 */
export class VideoCapture {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private texture: THREE.VideoTexture | null = null;

  isActive() {
    return this.stream !== null && this.texture !== null;
  }

  getTexture() {
    return this.texture;
  }

  getVideoElement() {
    return this.video;
  }

  async start(): Promise<THREE.VideoTexture> {
    if (this.texture) return this.texture;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
    } catch (err) {
      throw mapMediaError(err);
    }

    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.setAttribute('playsinline', '');
    video.style.position = 'fixed';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';
    video.style.width = '1px';
    video.style.height = '1px';
    video.srcObject = this.stream;
    document.body.appendChild(video);
    this.video = video;

    await new Promise<void>((resolve, reject) => {
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new VideoCaptureError('Camera video failed to load.', 'Unknown'));
      };
      const cleanup = () => {
        video.removeEventListener('loadedmetadata', onReady);
        video.removeEventListener('error', onError);
      };
      video.addEventListener('loadedmetadata', onReady);
      video.addEventListener('error', onError);
      void video.play().catch(onError);
    });

    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    this.texture = texture;

    return texture;
  }

  stop() {
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }

    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }

    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
      this.video.remove();
      this.video = null;
    }
  }
}
