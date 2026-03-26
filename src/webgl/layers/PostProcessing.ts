import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';

import chromaFrag from '../../shaders/chromaticAberration.frag.glsl?raw';
import type { AudioFeatures } from '../../audio/AudioEngine';
import type { Director } from './Director';
import type { VJState } from '../StateManager';

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export class PostProcessing {
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private bokehPass: BokehPass;
  private chromaPass: ShaderPass;

  private fluxPeak = 1e-6;
  private bassPeak = 1e-6;

  constructor(
    renderer: THREE.WebGLRenderer,
    private readonly threeScene: THREE.Scene,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly director: Director,
    width: number,
    height: number,
  ) {
    this.composer = new EffectComposer(renderer);
    this.composer.setSize(width, height);

    this.composer.addPass(new RenderPass(this.threeScene, this.camera));

    // Depth of field
    this.bokehPass = new BokehPass(this.threeScene, this.camera, {
      focus: this.director.getBokehFocus(),
      aperture: this.director.getBokehAperture(),
      maxblur: 0.02,
    });
    this.bokehPass.enabled = true;
    this.composer.addPass(this.bokehPass);

    // Thresholded bloom (strength+threshold gated by spectralFlux peaks)
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      1.2, // strength
      0.75, // radius
      0.55, // threshold
    );
    this.composer.addPass(this.bloomPass);

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
    this.bloomPass.setSize(width, height);
    this.bokehPass.setSize(width, height);
  }

  update(dtSeconds: number, features: AudioFeatures, state: VJState) {
    const flux = Math.max(0, features.spectralFlux);
    this.fluxPeak = Math.max(this.fluxPeak * 0.985, flux);
    const fluxN = flux / (this.fluxPeak + 1e-9);

    const bass = Math.max(0, features.bass);
    this.bassPeak = Math.max(this.bassPeak * 0.985, bass);
    const bassN = bass / (this.bassPeak + 1e-9);

    // Gate bloom on drop/dynamics peaks.
    const spike = smoothstep(0.35, 1.0, fluxN) * (0.4 + 0.8 * state.rave);
    const threshold = lerp(0.62, 0.15, spike);
    const strength = lerp(0.85, 2.65, spike);

    this.bloomPass.threshold = threshold;
    this.bloomPass.strength = strength;

    // DOF focus pulls via Director GSAP state.
    (this.bokehPass as any).uniforms.focus.value = this.director.getBokehFocus();
    (this.bokehPass as any).uniforms.aperture.value = this.director.getBokehAperture();

    // RGB split; ramp a touch in rave.
    const uBass = Math.min(1.4, bassN) * (0.7 + 0.6 * state.rave);
    this.chromaPass.uniforms.u_bass.value = uBass;

    // Subtle temporal wobble to avoid static feel.
    this.bloomPass.radius = 0.7 + Math.sin(performance.now() * 0.0005) * 0.05 + spike * 0.2;

    void dtSeconds;
  }

  render() {
    this.composer.render();
  }
}

