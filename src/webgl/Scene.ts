import * as THREE from 'three';
import type { AudioFeatures } from '../audio/AudioEngine';
import type { VJState } from './StateManager';
import { AnchorLayer } from './layers/AnchorLayer';
import { Director } from './layers/Director';
import { LightingLayer } from './layers/LightingLayer';
import { PostProcessing } from './layers/PostProcessing';

export type SceneInitParams = {
  width: number;
  height: number;
};

/**
 * Base WebGL scene wrapper. Layer composition and post-processing live in
 * `src/webgl/layers/*` and will be wired into this scene over time.
 */
export class VJScene {
  public readonly threeScene = new THREE.Scene();
  public readonly camera = new THREE.PerspectiveCamera(55, 1, 0.01, 1000);

  private readonly root = new THREE.Group();
  private initialised = false;

  private postProcessing: PostProcessing | null = null;
  private director: Director | null = null;

  private readonly anchorLayer = new AnchorLayer();
  private readonly lightingLayer = new LightingLayer();

  constructor(private readonly renderer: THREE.WebGLRenderer) {}

  init(params: SceneInitParams) {
    this.threeScene.add(this.root);
    this.threeScene.background = new THREE.Color(0x000000);

    this.camera.position.set(0, 0, 6);
    this.resize(params.width, params.height);

    const target = new THREE.Vector3(0, 0, 0);
    this.director = new Director(this.camera, target);

    this.anchorLayer.init(this.threeScene);
    this.lightingLayer.init(this.threeScene);

    this.postProcessing = new PostProcessing(this.renderer, this.threeScene, this.camera, params.width, params.height);

    this.initialised = true;
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.postProcessing?.resize(width, height);
  }

  /** Quick dolly toward the look target on strong spectral-flux peaks (beat drops). */
  triggerCameraZDollyPunch() {
    this.director?.triggerZDollyPunch();
  }

  update(dtSeconds: number, _features: AudioFeatures, state: VJState) {
    if (!this.initialised) return;

    // Layers drive all visuals; base scene motion is just a subtle extra.
    this.root.rotation.y += dtSeconds * (0.03 + 0.22 * state.rave);
    this.root.rotation.x = Math.sin(performance.now() * 0.00015) * 0.04;

    const features = _features; // keep the original param name stable in callsites.
    this.director?.update(dtSeconds, features, state);
    this.anchorLayer.update(dtSeconds, features, state);
    this.lightingLayer.update(dtSeconds, features, state);
    this.postProcessing?.update(dtSeconds, features, state);
  }

  render() {
    if (this.postProcessing) this.postProcessing.render();
    else this.renderer.render(this.threeScene, this.camera);
  }
}

