import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

import chromaFrag from '../../shaders/chromaticAberration.frag.glsl?raw';
import type { AudioFeatures } from '../../audio/AudioEngine';
import { identityAxes, type LookAxes } from '../../look/types';
import type { VJState } from '../StateManager';

export class PostProcessing {
  private composer: EffectComposer;
  private chromaPass: ShaderPass;

  private bassPeak = 1e-6;

  constructor(
    renderer: THREE.WebGLRenderer,
    private readonly threeScene: THREE.Scene,
    private readonly camera: THREE.PerspectiveCamera,
    width: number,
    height: number,
  ) {
    this.composer = new EffectComposer(renderer);
    this.composer.setSize(width, height);

    this.composer.addPass(new RenderPass(this.threeScene, this.camera));

    // Chromatic aberration shader pass (RGB split based on bass energy)
    const chromaShader = {
      uniforms: {
        tDiffuse: { value: null },
        u_bass: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: chromaFrag,
    };

    this.chromaPass = new ShaderPass(chromaShader);
    this.composer.addPass(this.chromaPass);
  }

  resize(width: number, height: number) {
    this.composer.setSize(width, height);
  }

  update(dtSeconds: number, features: AudioFeatures, state: VJState, axes: LookAxes = identityAxes()) {
    const bass = Math.max(0, features.bass);
    this.bassPeak = Math.max(this.bassPeak * 0.985, bass);
    const bassN = bass / (this.bassPeak + 1e-9);

    // RGB split; ramp a touch in rave.
    const uBass = Math.min(1.4, bassN * axes.intensity) * (0.7 + 0.6 * state.rave * axes.intensity);
    this.chromaPass.uniforms.u_bass.value = uBass;

    void dtSeconds;
  }

  render() {
    this.composer.render();
  }
}

