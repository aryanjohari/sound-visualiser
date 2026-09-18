/**
 * Confidence blends beat-lock in; it does not switch.
 * `syncWeight` is 0 when sync is off (or inactive).
 */
export function blendSync(unsynced: number, beat: number, syncWeight: number) {
  return unsynced + (beat - unsynced) * syncWeight;
}
