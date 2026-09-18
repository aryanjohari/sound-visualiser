import * as THREE from 'three';
import { VideoCapture } from '../camera/VideoCapture';
import type { AudioFeatures } from '../audio/AudioEngine';
import { identityAxes, type LookAxes } from '../look/types';
import type { VJState } from './StateManager';
import { AcidFeedLayer } from './layers/AcidFeedLayer';
import { AnchorLayer } from './layers/AnchorLayer';
import { Director } from './layers/Director';
import { EnvironmentLayers } from './layers/EnvironmentLayers';
import { LightingLayer } from './layers/LightingLayer';
import { LiveFeedLayer } from './layers/LiveFeedLayer';
import { PostProcessing } from './layers/PostProcessing';

export type VisualMode = 'cinematic' | 'live' | 'acid';

export type SceneInitParams = {
  width: number;
  height: number;
};

function needsWebcamForMode(mode: VisualMode) {
  return mode === 'live' || mode === 'acid';
}

/**
 * Base WebGL scene wrapper. Layer composition and post-processing live in
 * `src/webgl/layers/*` and will be wired into this scene over time.
 */
export class VJScene {
  public readonly threeScene = new THREE.Scene();
  public readonly camera = new THREE.PerspectiveCamera(55, 1, 0.01, 1000);

  private readonly root = new THREE.Group();
  private initialised = false;
  private visualMode: VisualMode = 'cinematic';
  private lookAxes: LookAxes = identityAxes();
  private modeChangeInFlight: Promise<void> | null = null;

  private postProcessing: PostProcessing | null = null;
  private director: Director | null = null;

  private readonly environmentLayers = new EnvironmentLayers();
  private readonly anchorLayer = new AnchorLayer();
  private readonly lightingLayer = new LightingLayer();
  private readonly liveFeedLayer = new LiveFeedLayer();
  private readonly acidFeedLayer = new AcidFeedLayer();
  private readonly videoCapture = new VideoCapture();

  constructor(private readonly renderer: THREE.WebGLRenderer) {}

  init(params: SceneInitParams) {
    this.threeScene.add(this.root);
    this.threeScene.background = new THREE.Color(0x000000);

    this.camera.position.set(0, 0, 6);
    this.resize(params.width, params.height);

    const target = new THREE.Vector3(0, 0, 0);
    this.director = new Director(this.camera, target);

    this.environmentLayers.init(this.threeScene);
    this.anchorLayer.init(this.threeScene);
    this.lightingLayer.init(this.threeScene);
    this.liveFeedLayer.init(this.renderer);
    this.acidFeedLayer.init(this.renderer);

    this.postProcessing = new PostProcessing(this.renderer, this.threeScene, this.camera, params.width, params.height);

    this.initialised = true;
  }

  getVisualMode(): VisualMode {
    return this.visualMode;
  }

  setLookAxes(axes: LookAxes) {
    this.lookAxes = { ...axes };
  }

  needsWebcam() {
    return needsWebcamForMode(this.visualMode);
  }

  /** @deprecated Use setVisualMode('live' | 'cinematic') */
  isCameraEnabled() {
    return needsWebcamForMode(this.visualMode);
  }

  /** @deprecated Use setVisualMode */
  async setCameraEnabled(enabled: boolean) {
    await this.setVisualMode(enabled ? 'live' : 'cinematic');
  }

  async setVisualMode(mode: VisualMode) {
    if (this.modeChangeInFlight) {
      await this.modeChangeInFlight;
      if (mode === this.visualMode) return;
    }

    const run = async () => {
      if (mode === this.visualMode) return;

      const prevMode = this.visualMode;
      const prevNeededCam = needsWebcamForMode(prevMode);
      const needsCam = needsWebcamForMode(mode);

      if (needsCam && !prevNeededCam) {
        const texture = await this.videoCapture.start();
        this.liveFeedLayer.setVideoTexture(texture);
        this.acidFeedLayer.setVideoTexture(texture);
        if (mode === 'acid') {
          this.acidFeedLayer.clearFeedbackBuffers(this.renderer);
        }
      } else if (!needsCam && prevNeededCam) {
        this.videoCapture.stop();
        this.liveFeedLayer.setVideoTexture(null);
        this.acidFeedLayer.setVideoTexture(null);
        this.acidFeedLayer.clearFeedbackBuffers(this.renderer);
      } else if (needsCam && prevNeededCam && mode !== prevMode) {
        this.acidFeedLayer.clearFeedbackBuffers(this.renderer);
      }

      this.visualMode = mode;
    };

    this.modeChangeInFlight = run();
    try {
      await this.modeChangeInFlight;
    } finally {
      this.modeChangeInFlight = null;
    }
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.postProcessing?.resize(width, height);
    this.liveFeedLayer.resize(width, height);
    this.acidFeedLayer.resize(width, height, this.renderer);
  }

  /** Quick dolly toward the look target on strong spectral-flux peaks (beat drops). */
  triggerCameraZDollyPunch() {
    this.director?.triggerZDollyPunch();
  }

  update(dtSeconds: number, _features: AudioFeatures, state: VJState) {
    if (!this.initialised) return;

    this.root.rotation.y += dtSeconds * (0.03 + 0.22 * state.rave * this.lookAxes.intensity);
    this.root.rotation.x = Math.sin(performance.now() * 0.00015) * 0.04;

    const features = _features;
    const axes = this.lookAxes;
    this.director?.update(dtSeconds, features, state, axes);
    this.environmentLayers.update(dtSeconds, features, state, axes);
    this.anchorLayer.update(dtSeconds, features, state, axes);
    this.lightingLayer.update(dtSeconds, features, state, axes);
    this.postProcessing?.update(dtSeconds, features, state, axes);

    if (this.visualMode === 'live') {
      this.liveFeedLayer.update(dtSeconds, features, state, axes);
    } else if (this.visualMode === 'acid') {
      this.acidFeedLayer.update(dtSeconds, features, state, axes);
    }
  }

  render() {
    if (this.visualMode === 'live' && this.liveFeedLayer.isReady()) {
      this.liveFeedLayer.render(this.renderer);
      return;
    }
    if (this.visualMode === 'acid' && this.acidFeedLayer.isReady()) {
      this.acidFeedLayer.render(this.renderer);
      return;
    }
    if (this.postProcessing) this.postProcessing.render();
    else this.renderer.render(this.threeScene, this.camera);
  }
}
