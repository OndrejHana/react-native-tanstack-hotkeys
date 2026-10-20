import { HotkeyCallback, HotkeyChord, HotkeySequence, RegisterableHotkey, RegisterableHotkeyChord, RegisterableHotkeySequence } from "./hotkey.types.js";
import { Target } from "./environment.js";
import { ActivateHotkeyScopeOptions, HotkeyChordOptions, HotkeyOptions, HotkeySequenceOptions } from "./hotkey-manager.js";
import { AppHotkey, AppHotkeysStore } from "./app-hotkeys.js";
//#region src/adapter.d.ts
/**
 * A hotkey and its callback, with optional per-binding options. Chords accept
 * `requireReset`; sequences accept `timeout`.
 */
export type HotkeyDefinition = {
  hotkey: RegisterableHotkeyChord;
  callback: HotkeyCallback;
  options?: HotkeyChordOptions;
} | {
  hotkey: RegisterableHotkeySequence;
  callback: HotkeyCallback;
  options?: HotkeySequenceOptions;
};
/** Options shared by every definition. Each option applies only to the kinds that support it. */
export type HotkeyBindingsCommonOptions = HotkeyChordOptions & HotkeySequenceOptions;
/** Reconciles adapter registrations while retaining handles for option updates. */
export declare function createHotkeyBindings(): {
  /**
   * Registers new definitions, updates existing ones in place, and removes
   * stale ones. Definitions with an empty sequence or a null target are skipped.
   */
  update(definitions: ReadonlyArray<HotkeyDefinition>, commonOptions?: HotkeyBindingsCommonOptions): void;
  destroy(): void;
};
/** Options with a framework-specific target, such as a ref. */
export type WithTarget<TOptions, TTarget> = Omit<TOptions, 'target' | 'appHotkeyId'> & {
  /** The element to listen on. Defaults to document. */
  target?: TTarget;
};
/** Options shared by chords and sequences, with a framework target. */
export type AdapterHotkeyOptions<TTarget> = WithTarget<HotkeyOptions, TTarget>;
/** Options for a chord such as `'Mod+S'`, with a framework target. */
export type AdapterChordOptions<TTarget> = WithTarget<HotkeyChordOptions, TTarget>;
/** Options for a sequence such as `['G', 'G']`, with a framework target. */
export type AdapterSequenceOptions<TTarget> = WithTarget<HotkeySequenceOptions, TTarget>;
/** Options applied to every hotkey, such as defaults. Each applies to the kinds that support it. */
export type AdapterCommonOptions<TTarget> = AdapterChordOptions<TTarget> & AdapterSequenceOptions<TTarget>;
/** Chord options for chords, sequence options for sequences. */
export type AdapterOptionsFor<T extends RegisterableHotkey, TTarget> = [T] extends [never] ? AdapterCommonOptions<TTarget> : T extends readonly [unknown] ? AdapterChordOptions<TTarget> : T extends ReadonlyArray<unknown> ? AdapterSequenceOptions<TTarget> : AdapterChordOptions<TTarget>;
/**
 * Call-site options for an app hotkey. `meta` comes from the declaration.
 * Kind-specific options follow the declared default: `requireReset` for a
 * chord, `timeout` for a sequence, both for an app hotkey without a default.
 * If the user rebinds it to the other kind, options for the old kind no
 * longer apply.
 */
export type AdapterAppHotkeyOptions<T extends AppHotkey, TTarget> = Omit<[T['defaultHotkey']] extends [HotkeySequence] ? AdapterSequenceOptions<TTarget> : [T['defaultHotkey']] extends [HotkeyChord] ? AdapterChordOptions<TTarget> : AdapterCommonOptions<TTarget>, 'meta'>;
/**
 * One hotkey and its callback for adapter APIs such as `useHotkeys`. Chords
 * accept `requireReset`; sequences accept `timeout`; hotkeys of unknown kind
 * accept only shared options.
 */
export type AdapterHotkeyDefinition<TTarget> = {
  /** A chord string such as `'Mod+S'`, or a chord object */
  hotkey: RegisterableHotkeyChord;
  /** The function to call when the hotkey is pressed */
  callback: HotkeyCallback;
  /** Per-hotkey options (merged on top of common options) */
  options?: AdapterChordOptions<TTarget>;
} | {
  /** A sequence such as `['G', 'G']`, with each step a string or an object */
  hotkey: RegisterableHotkeySequence;
  callback: HotkeyCallback;
  options?: AdapterSequenceOptions<TTarget>;
} | {
  /**
   * An app hotkey from `defineAppHotkeys`. Kind-specific options apply
   * only while its effective hotkey has that kind.
   */
  hotkey: AppHotkey;
  callback: HotkeyCallback;
  options?: Omit<AdapterCommonOptions<TTarget>, 'meta'>;
} | {
  /**
   * A hotkey whose kind is not known statically, such as user data typed
   * `Hotkey`. Accepts only shared options.
   */
  hotkey: RegisterableHotkey;
  callback: HotkeyCallback;
  options?: AdapterHotkeyOptions<TTarget>;
};
/** Context for `prepareHotkeyDefinitions`. */
export interface PrepareHotkeyDefinitionsOptions<TTarget> {
  /** The provider's app hotkeys store, so app hotkeys use custom hotkeys. */
  appHotkeysStore?: AppHotkeysStore | null;
  /** Provider defaults, applied first. */
  defaults?: AdapterCommonOptions<TTarget>;
  /** Options for every definition, applied after app hotkey declarations. */
  commonOptions?: AdapterCommonOptions<TTarget>;
  /**
   * Resolves a framework target, such as a ref. Return `undefined` for the
   * document or `null` to skip registration until the target exists.
   * Without it, targets pass through and `null` means document.
   */
  resolveTarget?: (target: TTarget) => Target | null | undefined;
}
/**
 * Converts adapter definitions into `createHotkeyBindings` definitions.
 * Options merge in this order: defaults, app hotkey declaration, common
 * options, per-definition options. App hotkeys resolve their effective hotkey
 * from the store, and an unbound app hotkey keeps its position but registers
 * nothing.
 */
export declare function prepareHotkeyDefinitions<TTarget>(definitions: ReadonlyArray<AdapterHotkeyDefinition<TTarget>>, options?: PrepareHotkeyDefinitionsOptions<TTarget>): Array<HotkeyDefinition>;
/**
 * Calls `onChange` when the store published with `publishAppHotkeysStore` or
 * `provideAppHotkeys` changes, or when its app hotkeys or custom hotkeys
 * change. For adapters that resolve app hotkeys without a provider. Returns an
 * unsubscribe function.
 */
export declare function subscribePublishedAppHotkeys(onChange: () => void): () => void;
/** Scope props shared by framework providers. */
export interface HotkeysProviderScopeProps {
  /**
   * Scope for hotkeys registered inside this provider, active while it is
   * mounted and enabled. Defaults to the parent provider's scope, or
   * `'global'` at the root. App hotkeys that declare a scope keep it.
   */
  scope?: string;
  /**
   * While mounted and enabled, suspend hotkeys in every other scope,
   * including `'global'`, except scopes of nested providers. Pass
   * `{ allow: [...] }` to keep other scopes active, such as `'global'`. Use
   * with `scope`, for dialogs and other overlays.
   */
  exclusive?: ActivateHotkeyScopeOptions['exclusive'];
  /**
   * Set false to deactivate this provider's scope, and the scopes of
   * providers nested in it, without unmounting. Defaults to true.
   */
  enabled?: boolean;
}
/**
 * Merges a provider's default options over its parent's. A provider with a
 * `scope` sets `hotkey.scope`, so hotkeys registered inside it use that scope.
 */
export declare function mergeHotkeysProviderDefaults<T extends {
  hotkey?: object;
  hotkeyRecorder?: object;
}>(parent: T | undefined, own: T | undefined, scope: string | undefined): T;
/**
 * A key for a provider's scope activation, or `null` when the scope should not
 * be active. Equal keys mean the same activation, so adapters reactivate only
 * when the key changes, not when an inline `exclusive` object is recreated.
 */
export declare function getHotkeysProviderScopeKey(options: {
  scope: string | undefined;
  exclusive: ActivateHotkeyScopeOptions['exclusive'];
  /** Whether this provider and every ancestor are enabled. */
  active: boolean;
  /** The parent provider's scope. */
  parent: string | undefined;
}): string | null;
/**
 * Activates the scope described by a key from `getHotkeysProviderScopeKey`.
 * Returns a function that releases the activation.
 */
export declare function activateHotkeysProviderScope(key: string): () => void;
//#endregion