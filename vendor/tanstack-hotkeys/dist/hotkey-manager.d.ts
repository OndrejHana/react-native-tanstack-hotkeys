import { ConflictBehavior, HotkeyCallback, HotkeyCallbackContextFor, HotkeyChord, HotkeyMeta, HotkeySequence, ParsedHotkeyChord, RegisterableHotkey, RegisterableHotkeyChord, RegisterableHotkeySequence } from "./hotkey.types.js";
import { Target } from "./environment.js";
import { AppHotkeysStore } from "./app-hotkeys.js";
import { Store } from "@tanstack/store";
//#region src/hotkey-manager.d.ts
/**
 * Options shared by chords and sequences.
 */
export interface HotkeyOptions {
  /**
   * Listen during capture, before descendant listeners. Defaults to `false` (bubble).
   * With `stopPropagation: true`, a match on an ancestor prevents the event from
   * reaching descendant widgets. Other listeners on the same target still run.
   * Applies to both `keydown` and `keyup`, for chords and sequences.
   * Changing this option preserves held-key reset state and sequence progress.
   */
  capture?: boolean;
  /** Behavior when this hotkey conflicts with an existing registration on the same target. Defaults to 'warn' */
  conflictBehavior?: ConflictBehavior;
  /**
   * Soft-disable: when `false`, the callback does not run but the registration
   * stays in `HotkeyManager` (and in devtools). Toggling this should update the
   * existing handle via `setOptions` rather than unregistering. Defaults to `true`.
   */
  enabled?: boolean;
  /** The event type to listen for. Defaults to 'keydown' */
  eventType?: 'keydown' | 'keyup';
  /**
   * Skip keys that a focused control inside the target uses itself: typing in
   * text inputs, textarea, select, and contenteditable; Enter/Space on buttons
   * and summary elements; Enter on links; and navigation keys in ARIA widgets
   * such as menus, listboxes, tabs, and grids. A hotkey targeted at the control
   * itself still receives them. Defaults to `'auto'`, which chooses from the
   * hotkey (the first step of a sequence): true for single keys and Shift/Alt
   * combos; false for Ctrl/Meta shortcuts and Escape. Set false to handle keys
   * even in these controls.
   */
  ignoreInputs?: boolean | 'auto';
  /** The target platform for resolving 'Mod' */
  platform?: 'mac' | 'windows' | 'linux';
  /**
   * Prevent the default browser action when the hotkey matches. For a
   * sequence, every step that advances it does. Defaults to true
   */
  preventDefault?: boolean;
  /**
   * Stop event propagation when the hotkey matches. For a sequence, only the
   * last step does, so earlier steps reach other listeners. Defaults to true
   */
  stopPropagation?: boolean;
  /** The DOM element to attach the event listener to. Defaults to document. */
  target?: Target | null;
  /** Optional metadata (name, description, custom fields via declaration merging) */
  meta?: HotkeyMeta;
  /**
   * Scope this hotkey belongs to. Defaults to `'global'`, which is always
   * active. Other scopes are active while activated with
   * `HotkeyManager.activateScope`, which framework providers do while
   * mounted. While an exclusive scope is active, only its hotkeys, those of
   * scopes nested in it, and those of scopes it allows fire.
   * When active scopes share a hotkey on the same target, the most recently
   * activated scope handles it.
   */
  scope?: string;
  /** Id of the app hotkey this registration implements. Adapters set this when registering an app hotkey from `defineAppHotkeys`. */
  appHotkeyId?: string;
}
/** Options for a single chord such as `'Mod+S'`. */
export interface HotkeyChordOptions extends HotkeyOptions {
  /** If true, only trigger once until all keys are released. Default: false */
  requireReset?: boolean;
}
/** Options for a sequence such as `['G', 'G']`. */
export interface HotkeySequenceOptions extends HotkeyOptions {
  /** Maximum time between steps in milliseconds. Default: 1000 */
  timeout?: number;
}
/**
 * The options type for a hotkey: chord options for chords (including one-step
 * tuples), sequence options for sequences.
 */
export type HotkeyOptionsFor<T extends RegisterableHotkey> = [T] extends [never] ? HotkeyChordOptions & HotkeySequenceOptions : T extends readonly [RegisterableHotkeyChord] ? HotkeyChordOptions : T extends RegisterableHotkeySequence ? HotkeySequenceOptions : HotkeyChordOptions;
interface RegistrationBase<TOptions extends HotkeyOptions> {
  /** Unique identifier for this registration */
  id: string;
  /** The callback to invoke */
  callback: HotkeyCallback;
  /** Resolved options for this registration */
  options: TOptions;
  /** The resolved target element for this registration */
  target: Target;
  /** How many times this registration's callback has been triggered */
  triggerCount: number;
  /** Whether this registration has fired (and, for requireReset chords, needs a reset) */
  hasFired: boolean;
}
/** A registered chord in the HotkeyManager. */
export interface HotkeyChordRegistration extends RegistrationBase<HotkeyChordOptions> {
  kind: 'chord';
  hotkey: HotkeyChord;
  parsedChord: ParsedHotkeyChord;
  /** The concrete key/code that activated a requireReset registration. */
  activeMatch?: {
    key: string;
    code: string;
  };
}
/** A registered sequence in the HotkeyManager. */
export interface HotkeySequenceRegistration extends RegistrationBase<HotkeySequenceOptions> {
  kind: 'sequence';
  hotkey: HotkeySequence;
  parsedSequence: Array<ParsedHotkeyChord>;
  /** Steps matched in the current attempt */
  currentIndex: number;
  /** `Date.now()` when the last step in the current attempt matched */
  lastKeyTime: number;
}
/** A registered hotkey in the HotkeyManager. */
export type HotkeyRegistration = HotkeyChordRegistration | HotkeySequenceRegistration;
interface RegistrationViewBase {
  id: string;
  target: Target;
  triggerCount: number;
  hasFired: boolean;
}
/** Public view of a chord registration, without its callback. */
export interface HotkeyChordRegistrationView extends RegistrationViewBase {
  kind: 'chord';
  hotkey: HotkeyChord;
  parsedChord: ParsedHotkeyChord;
  options: HotkeyChordOptions;
}
/** Public view of a sequence registration, without its callback. */
export interface HotkeySequenceRegistrationView extends RegistrationViewBase {
  kind: 'sequence';
  hotkey: HotkeySequence;
  parsedSequence: Array<ParsedHotkeyChord>;
  options: HotkeySequenceOptions;
  /** Steps matched in the current attempt (0 when idle or just completed). */
  matchedStepCount: number;
  /** `Date.now()` when the last step in the current attempt matched; 0 if none. */
  partialMatchLastKeyTime: number;
}
/**
 * Public view of a hotkey registration for display and introspection.
 * Narrow with `kind` to read chord- or sequence-specific fields.
 */
export type HotkeyRegistrationView = HotkeyChordRegistrationView | HotkeySequenceRegistrationView;
/** Creates a public view from an internal registration, stripping the callback. */
export declare function toHotkeyRegistrationView(reg: HotkeyRegistration): HotkeyRegistrationView;
/**
 * A handle returned from HotkeyManager.register() that allows updating
 * the callback and options without re-registering the hotkey.
 *
 * @example
 * ```ts
 * const handle = manager.register('Mod+S', callback, options)
 *
 * // Update callback without re-registering (avoids stale closures)
 * handle.callback = newCallback
 *
 * // Update options without re-registering
 * handle.setOptions({ enabled: false })
 *
 * // Unregister when done
 * handle.unregister()
 * ```
 */
export interface HotkeyRegistrationHandle<TOptions extends HotkeyOptions = HotkeyChordOptions | HotkeySequenceOptions> {
  /**
   * The callback function. Can be set directly to update without re-registering.
   * This avoids stale closures when the callback references React state.
   */
  callback: HotkeyCallback;
  /** Unique identifier for this registration */
  readonly id: string;
  /** Check if this registration is still active (not unregistered) */
  readonly isActive: boolean;
  /**
   * Update options (merged with existing options).
   * Useful for updating `enabled`, `preventDefault`, etc. without re-registering.
   * Changing `capture` moves the listener phase without clearing `requireReset`
   * state or sequence progress. A registration already processed for an event
   * cannot process it again in another phase.
   */
  setOptions: (options: Partial<TOptions>) => void;
  /** Unregister this hotkey */
  unregister: () => void;
}
/** Active hotkey scopes, published on `HotkeyManager.scopes`. */
export interface HotkeyScopesState {
  /**
   * Activated scopes, lowest precedence first. `'global'` is always active
   * and not listed.
   */
  active: ReadonlyArray<string>;
  /** The exclusive scope that owns the keyboard, or `null` when none is active. */
  exclusive: string | null;
  /**
   * Scopes the exclusive scope allows that are active, possibly including
   * `'global'`. Empty when no scope is exclusive.
   */
  allowed: ReadonlyArray<string>;
  /**
   * Scopes that are active but cannot fire because another scope is
   * exclusive, possibly including `'global'`.
   */
  suspended: ReadonlyArray<string>;
}
/** Options for `HotkeyManager.activateScope`. */
export interface ActivateHotkeyScopeOptions {
  /**
   * Suspend every other scope, including `'global'`, until this activation is
   * released. Scopes nested in this one stay active. Pass `{ allow }` to keep
   * other scopes active too, such as `{ allow: ['global'] }`. An allowed scope
   * still has to be activated, except `'global'`.
   */
  exclusive?: boolean | {
    allow: ReadonlyArray<string>;
  };
  /**
   * The scope this one is nested in. A nested scope takes precedence over its
   * ancestors even when it was activated first, as nested providers are when
   * their effects run child-first. Defaults to `'global'`.
   */
  parent?: string;
}
/**
 * Singleton manager for hotkey registrations, including sequences.
 *
 * This class provides a centralized way to register and manage keyboard
 * hotkeys. It shares one keydown and one keyup listener per target and
 * capture phase across registrations.
 *
 * Sequences (Vim-style hotkeys such as `['G', 'G']`) match when every step is
 * pressed within the timeout. Modifier-only events (Shift, Control, Alt, or
 * Meta alone) neither advance nor reset a sequence, so chained modifier chords
 * such as `['Shift+R', 'Shift+T']` work.
 *
 * @example
 * ```ts
 * const manager = HotkeyManager.getInstance()
 *
 * const save = manager.register('Mod+S', (event, context) => {
 *   console.log('Save triggered!')
 * })
 * const top = manager.register(['G', 'G'], () => scrollToTop(), { timeout: 500 })
 *
 * // Later, to unregister:
 * save.unregister()
 * top.unregister()
 * ```
 */
export declare class HotkeyManager {
  #private;
  /**
   * The TanStack Store containing all hotkey registrations, chords and sequences.
   * Use this to subscribe to registration changes or access current registrations.
   *
   * @example
   * ```ts
   * const manager = HotkeyManager.getInstance()
   *
   * // Subscribe to registration changes
   * const unsubscribe = manager.registrations.subscribe(() => {
   *   console.log('Registrations changed:', manager.registrations.state.size)
   * })
   *
   * // Access current registrations
   * for (const [id, reg] of manager.registrations.state) {
   *   console.log(reg.hotkey, reg.options.enabled)
   * }
   * ```
   */
  readonly registrations: Store<Map<string, HotkeyRegistration>>;
  /**
   * The app hotkeys store published by a framework provider, so tools such as
   * devtools can list declared hotkeys that are not registered.
   */
  readonly appHotkeys: Store<AppHotkeysStore | null>;
  /** Active scopes. Subscribe to show which hotkeys are suspended. */
  readonly scopes: Store<HotkeyScopesState>;
  private constructor();
  /**
   * Gets the singleton instance of HotkeyManager.
   */
  static getInstance(): HotkeyManager;
  /**
   * Resets the singleton instance. Useful for testing.
   */
  static resetInstance(): void;
  /**
   * Activates a scope until the returned function is called. Activations are
   * counted, so a scope stays active until every activation is released.
   * Framework providers call this while mounted.
   *
   * When active scopes share a hotkey, a nested scope takes precedence over
   * its ancestors, and otherwise the most recently activated scope wins. The
   * same order picks the exclusive scope when several are active, and only
   * that scope's `allow` list applies.
   *
   * @example
   * ```ts
   * const release = manager.activateScope('dialog', { exclusive: true })
   * // Only hotkeys with scope 'dialog', or scopes nested in it, fire now.
   * release()
   *
   * manager.activateScope('dialog', { exclusive: { allow: ['global'] } })
   * // Hotkeys with scope 'global' fire too.
   * ```
   */
  activateScope(scope: string, options?: ActivateHotkeyScopeOptions): () => void;
  /**
   * Whether hotkeys in a scope can fire: the scope is `'global'` or
   * activated, and either no scope is exclusive or this scope is the
   * exclusive one, nested in it, or allowed by it.
   */
  isScopeActive(scope?: string): boolean;
  /**
   * Registers a hotkey handler and returns a handle for updating the registration.
   *
   * Pass a chord (`'Mod+S'` or a RawHotkeyChord object) or a sequence (`['G', 'G']`).
   * A one-step sequence registers as its chord. Chords accept `requireReset`;
   * sequences accept `timeout`.
   *
   * The returned handle allows updating the callback and options without
   * re-registering, which is useful for avoiding stale closures in React.
   *
   * @param hotkey - A chord string, RawHotkeyChord object, or sequence
   * @param callback - The function to call when the hotkey is pressed
   * @param options - Options for the hotkey behavior
   * @returns A handle for managing the registration
   *
   * @example
   * ```ts
   * const handle = manager.register('Mod+S', callback)
   *
   * // Update callback without re-registering (avoids stale closures)
   * handle.callback = newCallback
   *
   * // Update options
   * handle.setOptions({ enabled: false })
   *
   * // Unregister when done
   * handle.unregister()
   * ```
   */
  register<const T extends RegisterableHotkey>(hotkey: T, callback: HotkeyCallback<HotkeyCallbackContextFor<T>>, options?: HotkeyOptionsFor<T>): HotkeyRegistrationHandle<HotkeyOptionsFor<T>>;
  /**
   * Resets the progress of every in-progress sequence.
   */
  resetSequenceProgress(): void;
  /**
   * Triggers a registration's callback programmatically from devtools.
   * Creates a synthetic KeyboardEvent from the chord (or a sequence's last step)
   * and invokes the callback.
   *
   * @param id - The registration ID to trigger
   * @returns True if the registration was found and triggered
   */
  triggerRegistration(id: string): boolean;
  /**
   * Gets the number of registered hotkeys, chords and sequences.
   */
  getRegistrationCount(): number;
  /**
   * Checks if a specific hotkey is registered.
   *
   * @param hotkey - The chord or sequence to check
   * @param target - Optional target element to match (if provided, both hotkey and target must match)
   * @returns True if a matching registration exists
   */
  isRegistered(hotkey: RegisterableHotkey, target?: Target): boolean;
  /**
   * Destroys the manager and removes all listeners.
   */
  destroy(): void;
}
/**
 * Gets the singleton HotkeyManager instance.
 * Convenience function for accessing the manager.
 */
export declare function getHotkeyManager(): HotkeyManager;
//#endregion
export type { ConflictBehavior };