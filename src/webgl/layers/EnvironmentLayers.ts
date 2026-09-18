import * as THREE from 'three';
import type { AudioFeatures } from '../../audio/AudioEngine';
import { identityAxes, type LookAxes } from '../../look/types';
import type { VJState } from '../StateManager';

import fluidVert from '../../shaders/fluidBackground.vert.glsl?raw';
import fluidFrag from '../../shaders/fluidBackground.frag.glsl?raw';

const FLUID_RADIUS = 135;

/**
 * Full-sphere fluid background: crimson/black warp (bass) + white lightning on ridges (high).
 */
export class EnvironmentLayers {
  private fluidMesh: THREE.Mesh | null = null;
  private fluidMat: THREE.ShaderMaterial | null = null;

  private bassPeak = 1e-6;

  init(threeScene: THREE.Scene) {
    const fluidGeo = new THREE.SphereGeometry(FLUID_RADIUS, 72, 48);
    this.fluidMat = new THREE.ShaderMaterial({
      vertexShader: fluidVert,
      fragmentShader: fluidFrag,
      uniforms: {
        u_time: { value: 0 },
        u_bass: { value: 0 },
        u_high: { value: 0 },
      },
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
    });
    this.fluidMesh = new THREE.Mesh(fluidGeo, this.fluidMat);
    this.fluidMesh.frustumCulled = false;
    this.fluidMesh.renderOrder = -22;
    threeScene.add(this.fluidMesh);
  }

  update(dtSeconds: number, features: AudioFeatures, state: VJState, axes: LookAxes = identityAxes()) {
    const bass = Math.max(0, features.bass);

    this.bassPeak = Math.max(this.bassPeak * 0.985, bass);

    const bassN = bass / (this.bassPeak + 1e-9);

    const uBass = Math.min(1.5, bassN * axes.intensity);

    if (this.fluidMat) {
      this.fluidMat.uniforms.u_time.value += dtSeconds;
      this.fluidMat.uniforms.u_bass.value = uBass;
      this.fluidMat.uniforms.u_high.value = Math.min(1.0, state.thresholdedHigh * axes.intensity);
    }
  }
}
