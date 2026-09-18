export const LOOK_IDS = ['cinematic', 'live', 'acid'] as const;
export type LookId = (typeof LOOK_IDS)[number];

export const SYNC_POLICIES = ['auto', 'off'] as const;
export type SyncPolicy = (typeof SYNC_POLICIES)[number];

export const AXIS_NAMES = ['intensity', 'feedback', 'fold', 'hue', 'glitch', 'melt'] as const;
export type AxisName = (typeof AXIS_NAMES)[number];

export const AXIS_MIN = 0;
export const AXIS_MAX = 2;
export const AXIS_IDENTITY = 1;
export const SCHEMA_VERSION = 1 as const;

export type LookAxes = Record<AxisName, number>;

export type LookDocument = {
  schemaVersion: typeof SCHEMA_VERSION;
  lookId: LookId;
  syncPolicy: SyncPolicy;
  axes: LookAxes;
};

export type LookPatch = {
  lookId?: LookId;
  syncPolicy?: SyncPolicy;
  axes?: Partial<LookAxes>;
};

export function identityAxes(): LookAxes {
  return {
    intensity: AXIS_IDENTITY,
    feedback: AXIS_IDENTITY,
    fold: AXIS_IDENTITY,
    hue: AXIS_IDENTITY,
    glitch: AXIS_IDENTITY,
    melt: AXIS_IDENTITY,
  };
}

export function identityLookDocument(): LookDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    lookId: 'cinematic',
    syncPolicy: 'auto',
    axes: identityAxes(),
  };
}

export function cloneLookDocument(doc: LookDocument): LookDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    lookId: doc.lookId,
    syncPolicy: doc.syncPolicy,
    axes: { ...doc.axes },
  };
}

export class LookDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LookDocumentError';
  }
}
