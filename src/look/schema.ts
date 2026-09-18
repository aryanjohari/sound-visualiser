import {
  AXIS_MAX,
  AXIS_MIN,
  AXIS_NAMES,
  LOOK_IDS,
  SCHEMA_VERSION,
  SYNC_POLICIES,
  cloneLookDocument,
  identityAxes,
  LookDocumentError,
  type LookAxes,
  type LookDocument,
  type LookId,
  type LookPatch,
  type SyncPolicy,
} from './types';

const DOCUMENT_KEYS = new Set(['schemaVersion', 'lookId', 'syncPolicy', 'axes']);
const PATCH_KEYS = new Set(['lookId', 'syncPolicy', 'axes']);
const AXIS_KEY_SET = new Set<string>(AXIS_NAMES);
const LOOK_ID_SET = new Set<string>(LOOK_IDS);
const SYNC_SET = new Set<string>(SYNC_POLICIES);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function reject(message: string): never {
  throw new LookDocumentError(message);
}

function assertAllowedKeys(obj: Record<string, unknown>, allowed: Set<string>, label: string) {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      reject(`Unknown ${label} field "${key}". Whole document rejected.`);
    }
  }
}

function parseLookId(value: unknown): LookId {
  if (typeof value !== 'string' || !LOOK_ID_SET.has(value)) {
    reject(`Unknown lookId ${JSON.stringify(value)}. Whole document rejected.`);
  }
  return value as LookId;
}

function parseSyncPolicy(value: unknown): SyncPolicy {
  if (typeof value !== 'string' || !SYNC_SET.has(value)) {
    reject(`Unknown syncPolicy ${JSON.stringify(value)}. Whole document rejected.`);
  }
  return value as SyncPolicy;
}

function parseAxisValue(name: string, value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    reject(`Axis "${name}" must be a finite number. Whole document rejected.`);
  }
  if (value < AXIS_MIN || value > AXIS_MAX) {
    reject(`Axis "${name}" out of range [${AXIS_MIN}, ${AXIS_MAX}]. Whole document rejected.`);
  }
  return value;
}

function parseAxes(value: unknown): LookAxes {
  const axes = identityAxes();
  if (value === undefined) return axes;
  if (!isPlainObject(value)) {
    reject('axes must be an object. Whole document rejected.');
  }

  for (const key of Object.keys(value)) {
    if (!AXIS_KEY_SET.has(key)) {
      reject(`Unknown axis "${key}". Whole document rejected.`);
    }
  }

  for (const name of AXIS_NAMES) {
    if (value[name] === undefined) continue;
    axes[name] = parseAxisValue(name, value[name]);
  }
  return axes;
}

export function parseLookDocument(input: unknown): LookDocument {
  if (!isPlainObject(input)) {
    reject('Look document must be an object. Whole document rejected.');
  }
  assertAllowedKeys(input, DOCUMENT_KEYS, 'look');

  if (input.schemaVersion !== SCHEMA_VERSION) {
    reject(`Unknown schemaVersion ${JSON.stringify(input.schemaVersion)}. Whole document rejected.`);
  }
  if (input.lookId === undefined) {
    reject('Missing lookId. Whole document rejected.');
  }
  if (input.syncPolicy === undefined) {
    reject('Missing syncPolicy. Whole document rejected.');
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    lookId: parseLookId(input.lookId),
    syncPolicy: parseSyncPolicy(input.syncPolicy),
    axes: parseAxes(input.axes),
  };
}

export function parseLookJson(text: string): LookDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    reject('Look JSON is not valid JSON. Whole document rejected.');
  }
  return parseLookDocument(parsed);
}

export function parseLookPatch(input: unknown): LookPatch {
  if (!isPlainObject(input)) {
    reject('Look patch must be an object. Whole document rejected.');
  }
  assertAllowedKeys(input, PATCH_KEYS, 'patch');

  const patch: LookPatch = {};
  if (input.lookId !== undefined) patch.lookId = parseLookId(input.lookId);
  if (input.syncPolicy !== undefined) patch.syncPolicy = parseSyncPolicy(input.syncPolicy);
  if (input.axes !== undefined) {
    if (!isPlainObject(input.axes)) {
      reject('Patch axes must be an object. Whole document rejected.');
    }
    for (const key of Object.keys(input.axes)) {
      if (!AXIS_KEY_SET.has(key)) {
        reject(`Unknown axis "${key}". Whole document rejected.`);
      }
    }
    const axes: Partial<LookAxes> = {};
    for (const name of AXIS_NAMES) {
      if (input.axes[name] === undefined) continue;
      axes[name] = parseAxisValue(name, input.axes[name]);
    }
    patch.axes = axes;
  }
  return patch;
}

export function mergePatch(doc: LookDocument, patch: LookPatch): LookDocument {
  const next = cloneLookDocument(doc);
  if (patch.lookId !== undefined) next.lookId = patch.lookId;
  if (patch.syncPolicy !== undefined) next.syncPolicy = patch.syncPolicy;
  if (patch.axes) {
    next.axes = { ...next.axes, ...patch.axes };
  }
  return parseLookDocument(next);
}

export function serializeLookDocument(doc: LookDocument): string {
  const canonical: LookDocument = {
    schemaVersion: SCHEMA_VERSION,
    lookId: doc.lookId,
    syncPolicy: doc.syncPolicy,
    axes: {
      intensity: doc.axes.intensity,
      feedback: doc.axes.feedback,
      fold: doc.axes.fold,
      hue: doc.axes.hue,
      glitch: doc.axes.glitch,
      melt: doc.axes.melt,
    },
  };
  return JSON.stringify(canonical, null, 2);
}