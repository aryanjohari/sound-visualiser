import gsap from 'gsap';
import * as THREE from 'three';
import type { AudioFeatures } from '../../audio/AudioEngine';
import { identityAxes, type LookAxes } from '../../look/types';
import type { VJState } from '../StateManager';

export class Director {
  private mode: 'cinematic' | 'rave' = 'cinematic';

  private orbit = {
    angle: 0,
    radius: 7.4,
    height: 1.2,
    speed: 0.18,
  };

  private shake = 0;
  private baseFovCinematic = 48;
  private baseFovRave = 78;

  private focusDistance = 9;
  private aperture = 0.025;

  private fluxPeak = 1e-6;
  private lastKickT = 0;

  /** 0 = no extra dolly; 1 = full punch along view axis toward target. */
  private zDollyPunch = 0;

  constructor(private readonly camera: THREE.PerspectiveCamera, private readonly target: THREE.Vector3) {
    this.camera.fov = this.baseFovCinematic;
    this.camera.updateProjectionMatrix();
  }

  getBokehFocus() {
    return this.focusDistance;
  }

  getBokehAperture() {
    return this.aperture;
  }

  triggerZDollyPunch() {
    gsap.killTweensOf(this, 'zDollyPunch');
    this.zDollyPunch = 0;
    gsap
      .timeline()
      .to(this, { zDollyPunch: 1, duration: 0.055, ease: 'power2.out' })
      .to(this, { zDollyPunch: 0, duration: 0.2, ease: 'power3.inOut' });
  }

  update(dtSeconds: number, features: AudioFeatures, state: VJState, axes: LookAxes = identityAxes()) {
    const rave = state.rave * axes.intensity;
    // State transitions
    if (this.mode !== 'rave' && rave > 0.62) this.enterRave();
    if (this.mode !== 'cinematic' && rave < 0.38) this.enterCinematic();

    // Kick detection based on spectralFlux normalization
    const flux = Math.max(0, features.spectralFlux);
    this.fluxPeak = Math.max(this.fluxPeak * 0.985, flux);
    const fluxN = flux / (this.fluxPeak + 1e-9);

    const now = performance.now() * 0.001;
    const canKick = now - this.lastKickT > 0.16;
    if (canKick && this.mode === 'rave' && fluxN > 0.72) {
      this.lastKickT = now;
      this.onKick();
    }

    // Orbit / movement
    const speedMul = this.mode === 'rave' ? 2.1 : 1.0;
    this.orbit.angle += dtSeconds * this.orbit.speed * speedMul;

    const x = Math.cos(this.orbit.angle) * this.orbit.radius;
    const z = Math.sin(this.orbit.angle) * this.orbit.radius;
    const y = Math.sin(this.orbit.angle * 0.67) * this.orbit.height;

    const basePos = new THREE.Vector3(x, y, z);

    const toward = new THREE.Vector3().subVectors(this.target, basePos);
    const dist = toward.length();
    if (dist > 1e-5 && this.zDollyPunch > 1e-5) {
      toward.normalize().multiplyScalar(0.52 * this.zDollyPunch);
      basePos.add(toward);
    }

    // Shake
    const decay = this.mode === 'rave' ? 4.5 : 2.2;
    this.shake = Math.max(0, this.shake - dtSeconds * decay);
    const shakeAmt = this.shake * (this.mode === 'rave' ? 0.55 : 0.15);

    basePos.x += (Math.random() - 0.5) * shakeAmt;
    basePos.y += (Math.random() - 0.5) * shakeAmt;
    basePos.z += (Math.random() - 0.5) * shakeAmt;

    this.camera.position.copy(basePos);
    this.camera.lookAt(this.target);

    // Gentle focal behaviour in cinematic.
    if (this.mode === 'cinematic') {
      const t = performance.now() * 0.001;
      this.focusDistance = 9.5 + Math.sin(t * 0.35) * 1.4;
    }
  }

  private enterCinematic() {
    this.mode = 'cinematic';
    gsap.killTweensOf(this.camera);
    gsap.killTweensOf(this.orbit);

    gsap.to(this.camera, {
      fov: this.baseFovCinematic,
      duration: 1.1,
      ease: 'power2.out',
      onUpdate: () => this.camera.updateProjectionMatrix(),
    });

    gsap.to(this.orbit, {
      radius: 7.8,
      height: 1.2,
      speed: 0.16,
      duration: 2.2,
      ease: 'power3.out',
    });

    gsap.to(this, {
      // Use object property tween for focus; PostProcessing reads it each frame.
      focusDistance: 12.5,
      aperture: 0.025,
      duration: 1.4,
      ease: 'sine.inOut',
    });
  }

  private enterRave() {
    this.mode = 'rave';
    gsap.killTweensOf(this.camera);
    gsap.killTweensOf(this.orbit);

    gsap.to(this.camera, {
      fov: this.baseFovRave,
      duration: 0.55,
      ease: 'power1.out',
      onUpdate: () => this.camera.updateProjectionMatrix(),
    });

    gsap.to(this.orbit, {
      radius: 6.2,
      height: 1.9,
      speed: 0.28,
      duration: 0.9,
      ease: 'power2.out',
    });

    gsap.to(this, {
      focusDistance: 5.2,
      aperture: 0.018,
      duration: 0.7,
      ease: 'sine.inOut',
    });
  }

  private onKick() {
    this.shake = Math.min(1, this.shake + 0.9);

    const baseFov = this.mode === 'rave' ? this.baseFovRave : this.baseFovCinematic;
    const punch = Math.min(100, baseFov + 22);

    gsap.to(this.camera, {
      fov: punch,
      duration: 0.08,
      ease: 'power2.out',
      onUpdate: () => this.camera.updateProjectionMatrix(),
    });

    gsap.to(this.camera, {
      fov: baseFov,
      duration: 0.22,
      ease: 'power2.in',
      overwrite: true,
      onUpdate: () => this.camera.updateProjectionMatrix(),
    });
  }
}

