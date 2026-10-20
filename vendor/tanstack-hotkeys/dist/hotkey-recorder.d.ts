import { Hotkey, HotkeyChord, HotkeySequence, ParsedHotkeyChord } from "./hotkey.types.js";
import { HotkeyConflict, HotkeyConflictOptions } from "./conflicts.js";
import { Store } from "@tanstack/store";
//#region src/hotkey-recorder.d.ts
/** Event property used to record a binding. Physical codes are the default. */
export type RecorderKeyMode = 'code' | 'key';
export interface RecorderRejection {
  reason: 'missing-code' | 'alt-graph' | 'invalid' | 'conflict' | 'validation';
  message: string;
  /** The rejected chord or sequence, when one was recorded. */
  hotkey?: Hotkey;
  conflicts?: Array<HotkeyConflict>;
}
export interface RecorderOptions {
  /** Physical code recording is the default. Choose key to record logical characters. */
  recordBy?: RecorderKeyMode;
  /** Platform used for Mod and AltGraph handling. Defaults to platform detection. */
  platform?: 'mac' | 'windows' | 'linux';
  /** Opt in to live-registry conflicts, including sequence prefixes. Default: false. */
  detectConflicts?: boolean | HotkeyConflictOptions;
  /** Rejected candidates leave recording active. */
  onReject?: (rejection: RecorderRejection) => void;
}
/** Validation context for a recorded chord. */
export interface HotkeyChordRecorderValidationContext {
  kind: 'chord';
  /** The event that recorded the chord. */
  event: KeyboardEvent;
  /** The chord with `Mod` resolved for the recorder's platform. */
  parsedChord: ParsedHotkeyChord;
}
/** Validation context for a recorded sequence. */
export interface HotkeySequenceRecorderValidationContext {
  kind: 'sequence';
  /** The event that recorded each step. */
  events: ReadonlyArray<KeyboardEvent>;
  /** Each step with `Mod` resolved for the recorder's platform. */
  parsedSequence: Array<ParsedHotkeyChord>;
}
/**
 * Validation context for a recorded chord or sequence. Narrow with `kind` to
 * read `parsedChord` or `parsedSequence`.
 */
export type HotkeyRecorderValidationContext = HotkeyChordRecorderValidationContext | HotkeySequenceRecorderValidationContext;
/**
 * State interface for the HotkeyRecorder.
 */
export interface HotkeyRecorderState {
  /** Whether recording is currently active */
  isRecording: boolean;
  /** Chords recorded so far in a multi-step recording (empty for `maxSteps: 1`) */
  steps: HotkeySequence;
  /** The last committed hotkey: a chord, or a sequence of two or more steps */
  recordedHotkey: Hotkey | null;
}
/** Which keys commit a multi-step recording before it reaches `maxSteps`. */
export type HotkeyRecorderCommitKeys = 'enter' | 'none';
interface HotkeyRecorderBaseOptions extends RecorderOptions {
  /** Optional callback when recording is cancelled (Escape pressed) */
  onCancel?: () => void;
  /**
   * Optional callback when the recording is cleared: Backspace/Delete with no
   * modifiers and no recorded steps
   */
  onClear?: () => void;
  /**
   * Whether to ignore keyboard events from input-like elements (text inputs,
   * textarea, select, contenteditable) while recording. When true, typing in
   * inputs passes through normally (Escape still cancels). Defaults to true.
   */
  ignoreInputs?: boolean;
}
/** Options for recording a single chord. This is the default (`maxSteps: 1`). */
export interface HotkeyChordRecorderOptions extends HotkeyRecorderBaseOptions {
  /** Maximum number of chords to record. Default: 1 */
  maxSteps?: 1;
  /** Return true to accept, or false/a message to reject while staying in recording mode. */
  validate?: (hotkey: HotkeyChord, context: HotkeyChordRecorderValidationContext) => boolean | string;
  /** Callback when a chord is successfully recorded */
  onRecord: (hotkey: HotkeyChord) => void;
}
/**
 * Options for recording up to `maxSteps` chords. A one-step recording commits
 * as a chord string; two or more steps commit as a sequence.
 */
export interface HotkeySequenceRecorderOptions extends HotkeyRecorderBaseOptions {
  /** Maximum number of chords to record. Reaching it commits automatically. Use `Infinity` for no limit. */
  maxSteps: number;
  /** Return true to accept, or false/a message to reject while staying in recording mode. */
  validate?: (hotkey: Hotkey, context: HotkeyRecorderValidationContext) => boolean | string;
  /** Callback when a hotkey is successfully recorded */
  onRecord: (hotkey: Hotkey) => void;
  /** Whether plain Enter commits the recorded steps. Default: 'enter' */
  commitKeys?: HotkeyRecorderCommitKeys;
  /** Commit automatically after this many milliseconds without a new step. Disabled when unset or 0. */
  idleTimeoutMs?: number;
}
/**
 * Options for HotkeyRecorder. `maxSteps` (default 1) selects between recording
 * a single chord and recording a sequence.
 */
export type HotkeyRecorderOptions = HotkeyChordRecorderOptions | HotkeySequenceRecorderOptions;
export declare class HotkeyRecorder {
  #private;
  readonly store: Store<HotkeyRecorderState>;
  constructor(options: HotkeyChordRecorderOptions | (() => HotkeyChordRecorderOptions));
  constructor(options: HotkeySequenceRecorderOptions | (() => HotkeySequenceRecorderOptions));
  /**
   * Updates the recorder options, including callbacks.
   * This allows framework adapters to sync callback changes without recreating the recorder.
   */
  setOptions(options: Partial<HotkeyRecorderOptions>): void;
  /**
   * Start recording a new hotkey.
   *
   * Sets up a keydown event listener that captures keyboard events
   * and records chords according to `maxSteps`.
   */
  start(): void;
  /**
   * Commits the recorded steps after validation and conflict checks.
   * Called automatically at `maxSteps`, on Enter, or after `idleTimeoutMs`.
   * A rejected commit leaves recording active with its steps intact.
   */
  commit(): void;
  /**
   * Stop recording (same as cancel, but doesn't call onCancel).
   *
   * Removes the event listener and resets the recording state.
   */
  stop(): void;
  /**
   * Cancel recording without saving.
   *
   * Removes the event listener, resets the recording state, and calls
   * the onCancel callback if provided.
   */
  cancel(): void;
  /**
   * Clean up event listeners and reset state.
   *
   * Call this when you're done with the recorder to ensure
   * all event listeners are properly removed.
   */
  destroy(): void;
}
//#endregion