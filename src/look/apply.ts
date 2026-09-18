import {
  cloneLookDocument,
  identityLookDocument,
  type LookAxes,
  type LookDocument,
  type LookId,
  type LookPatch,
  type SyncPolicy,
} from './types';
import { mergePatch, parseLookDocument, parseLookJson, parseLookPatch } from './schema';

export type LookApplyTargets = {
  setLookId: (lookId: LookId) => Promise<void>;
  setSyncPolicy: (syncPolicy: SyncPolicy) => void;
  setAxes: (axes: LookAxes) => void;
};

/**
 * One writer for lookId, syncPolicy, and axis multipliers.
 * Sliders (and later talk) emit patches; merge → validate → apply lives here.
 */
export class LookInstrument {
  private doc: LookDocument;
  private applyChain: Promise<void> = Promise.resolve();

  constructor(
    private readonly targets: LookApplyTargets,
    initial: LookDocument = identityLookDocument(),
  ) {
    this.doc = cloneLookDocument(parseLookDocument(initial));
  }

  getDocument(): LookDocument {
    return cloneLookDocument(this.doc);
  }

  async apply(doc: LookDocument): Promise<void> {
    const validated = parseLookDocument(doc);
    const run = this.applyChain.then(() => this.applyNow(validated));
    this.applyChain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async patch(rawPatch: unknown): Promise<LookDocument> {
    const patch = parseLookPatch(rawPatch);
    const merged = mergePatch(this.doc, patch);
    await this.apply(merged);
    return this.getDocument();
  }

  async loadJson(text: string): Promise<LookDocument> {
    await this.apply(parseLookJson(text));
    return this.getDocument();
  }

  private async applyNow(doc: LookDocument): Promise<void> {
    const previous = cloneLookDocument(this.doc);
    this.targets.setAxes(doc.axes);
    this.targets.setSyncPolicy(doc.syncPolicy);
    try {
      await this.targets.setLookId(doc.lookId);
      this.doc = cloneLookDocument(doc);
    } catch (err) {
      this.targets.setAxes(previous.axes);
      this.targets.setSyncPolicy(previous.syncPolicy);
      throw err;
    }
  }
}

export type { LookAxes, LookDocument, LookId, LookPatch, SyncPolicy };
