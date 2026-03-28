import * as THREE from 'three';
import type { AudioFeatures } from '../../audio/AudioEngine';
import type { VJState } from '../StateManager';

import anchorVert from '../../shaders/anchor.vert.glsl?raw';
import anchorFrag from '../../shaders/anchor.frag.glsl?raw';

/** Sample vertices from a dense torus knot for a fixed, readable silhouette. */
function makeTorusKnotParticles(tubularSegments = 256, radialSegments = 88) {
  const knot = new THREE.TorusKnotGeometry(1.15, 0.36, tubularSegments, radialSegments);
  const src = knot.attributes.position;
  const nrm = knot.attributes.normal;
  const count = src.count;
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = src.getX(i);
    positions[i * 3 + 1] = src.getY(i);
    positions[i * 3 + 2] = src.getZ(i);
    normals[i * 3] = nrm.getX(i);
    normals[i * 3 + 1] = nrm.getY(i);
    normals[i * 3 + 2] = nrm.getZ(i);
  }
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i += 1) seeds[i] = Math.random();
  knot.dispose();
  return { positions, normals, seeds, count };
}

export class AnchorLayer {
  private points: THREE.Points | null = null;
  private material: THREE.ShaderMaterial | null = null;

  private midPeak = 1e-6;
  private bassPeak = 1e-6;
  private highPeak = 1e-6;
  private rmsPeak = 1e-6;

  init(threeScene: THREE.Scene) {
    const { positions, normals, seeds } = makeTorusKnotParticles();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('a_seed', new THREE.BufferAttribute(seeds, 1));
    geometry.computeBoundingSphere();

    this.material = new THREE.ShaderMaterial({
      vertexShader: anchorVert,
      fragmentShader: anchorFrag,
      uniforms: {
        u_time: { value: 0 },
        u_bass: { value: 1 },
        u_mid: { value: 0 },
        u_high: { value: 0 },
        u_lightningFlash: { value: 0 },
        u_thresholdedHigh: { value: 0 },
      },
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geometry, this.material);
    threeScene.add(this.points);
  }

  update(dtSeconds: number, features: AudioFeatures, state: VJState) {
    if (!this.material || !this.points) return;

    const bass = Math.max(0, features.bass);
    const mid = Math.max(0, features.mid);
    const high = Math.max(0, features.high);
    const rms = Math.max(0, features.rms);

    this.midPeak = Math.max(this.midPeak * 0.985, mid);
    this.bassPeak = Math.max(this.bassPeak * 0.985, bass);
    this.highPeak = Math.max(this.highPeak * 0.985, high);
    this.rmsPeak = Math.max(this.rmsPeak * 0.985, rms);

    const midN = mid / (this.midPeak + 1e-9);
    const bassN = bass / (this.bassPeak + 1e-9);
    const highN = high / (this.highPeak + 1e-9);
    const rmsN = rms / (this.rmsPeak + 1e-9);

    this.material.uniforms.u_time.value += dtSeconds;
    this.material.uniforms.u_mid.value = Math.min(1.4, midN);
    this.material.uniforms.u_high.value = Math.min(1.5, highN);
    this.material.uniforms.u_lightningFlash.value = state.lightningFlash;
    this.material.uniforms.u_thresholdedHigh.value = Math.min(1, state.thresholdedHigh);
    // Pump entire knot; keep a floor so it never collapses to a point.
    this.material.uniforms.u_bass.value = 0.88 + 0.34 * Math.min(1.35, bassN);

    const spinBase = 0.05 + 0.12 * state.rave;
    const spinRms = 0.65 * Math.min(1.25, rmsN) * (0.45 + 0.55 * state.rave);
    this.points.rotation.y += dtSeconds * (spinBase + spinRms);
  }
}
