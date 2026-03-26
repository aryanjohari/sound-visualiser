import * as THREE from 'three';
import type { AudioFeatures } from '../../audio/AudioEngine';
import type { VJState } from '../StateManager';

import anchorVert from '../../shaders/anchor.vert.glsl?raw';
import anchorFrag from '../../shaders/anchor.frag.glsl?raw';

function makeHumanoidPointCloud(count: number) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const u = Math.random();
    // y distribution: denser around torso, with some head/legs.
    let y = (Math.random() * 2 - 1) * 1.1;
    const ay = Math.abs(y);

    const torso = Math.exp(-ay * 2.2);
    const head = Math.exp(-Math.pow(y - 0.95, 2) * 12.0);
    const legs = Math.exp(-Math.pow(y + 0.75, 2) * 10.0);
    const arms = Math.exp(-Math.pow(y - 0.35, 2) * 12.0);

    let r = 0.18 + 1.05 * torso + 0.28 * head + 0.55 * legs + 0.62 * arms;

    // Base radial distribution
    const theta = Math.random() * Math.PI * 2;
    const spread = r * (0.5 + 0.9 * Math.random());
    let x = Math.cos(theta) * spread;
    let z = Math.sin(theta) * spread;

    // Arms flare outwards a bit.
    if (arms > 0.18 && u < 0.55) {
      const side = Math.random() < 0.5 ? -1 : 1;
      x += side * (0.35 + 0.8 * arms) * (0.4 + Math.random());
    }

    // Legs split slightly
    if (legs > 0.25 && u > 0.55) {
      const side = Math.random() < 0.5 ? -1 : 1;
      x *= 0.55;
      x += side * (0.15 + 0.45 * legs);
    }

    positions[i * 3 + 0] = x * 0.95;
    positions[i * 3 + 1] = y * 1.1;
    positions[i * 3 + 2] = z * 0.95;
    seeds[i] = Math.random();
  }

  return { positions, seeds };
}

export class AnchorLayer {
  private points: THREE.Points | null = null;
  private material: THREE.ShaderMaterial | null = null;

  private bassPeak = 1e-6;
  private highPeak = 1e-6;

  init(threeScene: THREE.Scene, count = 22000) {
    const { positions, seeds } = makeHumanoidPointCloud(count);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('a_seed', new THREE.BufferAttribute(seeds, 1));
    geometry.computeBoundingSphere();

    this.material = new THREE.ShaderMaterial({
      vertexShader: anchorVert,
      fragmentShader: anchorFrag,
      uniforms: {
        u_time: { value: 0 },
        u_bass: { value: 0 },
        u_high: { value: 0 },
        u_pointSize: { value: 18 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geometry, this.material);
    threeScene.add(this.points);
  }

  update(dtSeconds: number, features: AudioFeatures, state: VJState) {
    if (!this.material || !this.points) return;

    const bass = Math.max(0, features.bass);
    const high = Math.max(0, features.high);

    // Normalize for stable shader control across tracks.
    this.bassPeak = Math.max(this.bassPeak * 0.985, bass);
    this.highPeak = Math.max(this.highPeak * 0.985, high);

    const bassN = bass / (this.bassPeak + 1e-9);
    const highN = high / (this.highPeak + 1e-9);

    this.material.uniforms.u_time.value += dtSeconds;
    this.material.uniforms.u_bass.value = Math.min(1.4, bassN);
    this.material.uniforms.u_high.value = Math.min(1.4, highN);

    // Slight pose energy lift on rave.
    const ps = 16 + 22 * state.rave;
    this.material.uniforms.u_pointSize.value = ps;

    this.points.rotation.y += dtSeconds * (0.08 + 0.22 * state.rave);
  }
}

