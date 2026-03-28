import * as THREE from 'three';
import type { AudioFeatures } from '../../audio/AudioEngine';
import type { VJState } from '../StateManager';

import voidVert from '../../shaders/voidFog.vert.glsl?raw';
import voidFrag from '../../shaders/voidFog.frag.glsl?raw';

export class VoidLayer {
  private mesh: THREE.Mesh | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private bassPeak = 1e-6;
  private fluxPeak = 1e-6;

  init(threeScene: THREE.Scene, radius = 24) {
    const geometry = new THREE.SphereGeometry(radius, 64, 32);

    this.material = new THREE.ShaderMaterial({
      vertexShader: voidVert,
      fragmentShader: voidFrag,
      uniforms: {
        u_time: { value: 0 },
        u_energy: { value: 0 },
        u_bass: { value: 0 },
        u_flux: { value: 0 },
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

    const bass = Math.max(0, features.bass);
    const flux = Math.max(0, features.spectralFlux);
    this.bassPeak = Math.max(this.bassPeak * 0.985, bass);
    this.fluxPeak = Math.max(this.fluxPeak * 0.985, flux);

    this.material.uniforms.u_bass.value = Math.min(1.5, bass / (this.bassPeak + 1e-9));
    this.material.uniforms.u_flux.value = Math.min(1.8, flux / (this.fluxPeak + 1e-9));
  }
}

