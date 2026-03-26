import * as THREE from 'three';
import type { AudioFeatures } from '../../audio/AudioEngine';
import type { VJState } from '../StateManager';

import voidVert from '../../shaders/voidFog.vert.glsl?raw';
import voidFrag from '../../shaders/voidFog.frag.glsl?raw';

export class VoidLayer {
  private mesh: THREE.Mesh | null = null;
  private material: THREE.ShaderMaterial | null = null;

  init(threeScene: THREE.Scene, radius = 24) {
    const geometry = new THREE.SphereGeometry(radius, 64, 32);

    this.material = new THREE.ShaderMaterial({
      vertexShader: voidVert,
      fragmentShader: voidFrag,
      uniforms: {
        u_time: { value: 0 },
        u_energy: { value: 0 },
      },
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    threeScene.add(this.mesh);
  }

  update(dtSeconds: number, features: AudioFeatures, _state: VJState) {
    if (!this.material) return;
    this.material.uniforms.u_time.value += dtSeconds;

    // Use RMS as "energy", but normalize to something the shader can handle.
    const uEnergy = Math.max(0, features.rms) * 0.18;
    this.material.uniforms.u_energy.value = Math.min(2.0, uEnergy);
  }
}

