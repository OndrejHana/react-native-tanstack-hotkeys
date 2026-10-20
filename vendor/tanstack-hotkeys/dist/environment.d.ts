//#region src/environment.d.ts
/**
 * Objects hotkeys can listen on, by name. Hosts other than the browser add
 * their target types through declaration merging:
 *
 * @example
 * ```ts
 * declare module '@tanstack/hotkeys' {
 *   interface HotkeyTargets {
 *     native: MyNativeTarget
 *   }
 * }
 * ```
 */
export interface HotkeyTargets {
  element: HTMLElement;
  document: Document;
  window: Window;
}
/** An element, document, or window (or a host's own target) that hotkeys can listen on. */
export type Target = HotkeyTargets[keyof HotkeyTargets];
/** Event types hotkeys listen for. Hosts can ignore types they cannot deliver, such as mouse events. */
export type HotkeysEventType = 'keydown' | 'keyup' | 'blur' | 'mousedown' | 'mousemove';
/**
 * Everything hotkeys need from the host that delivers keyboard events. The
 * browser implementation is the default; hosts without a DOM, such as React
 * Native, provide their own with `setHotkeysEnvironment` before registering
 * hotkeys.
 */
export interface HotkeysEnvironment {
  /**
   * Target registrations and recorders use when none is given (the document
   * in browsers). `undefined` when there is none, as during SSR: hotkeys
   * without an explicit target are then inert.
   */
  defaultTarget: () => Target | undefined;
  /**
   * Target for app-wide listeners (the window in browsers): held-key tracking
   * and recording guards listen here for `keydown` and `keyup` during capture,
   * and for `blur` when the app loses focus.
   */
  globalTarget: () => Target | undefined;
  /** Adds an event listener and returns a function that removes it. */
  listen: (target: Target, type: HotkeysEventType, listener: EventListener, capture: boolean) => () => void;
  /** The platform used to resolve `Mod` and format hotkeys. */
  detectPlatform: () => 'mac' | 'windows' | 'linux';
  /** Whether an event a listener on `target` received is for that target (originated from or bubbled to it). */
  isEventForTarget: (event: KeyboardEvent, target: Target) => boolean;
  /** Whether an event's propagation path reaches `target`. */
  eventReachesTarget: (event: KeyboardEvent, target: Target) => boolean;
  /**
   * Whether a focused control inside `registrationTarget` handles the key
   * itself, such as typing in a text field. See `HotkeyOptions.ignoreInputs`.
   */
  shouldIgnoreInputEvent: (event: KeyboardEvent, listenerTarget: Target, registrationTarget: Target) => boolean;
  /** Whether an event comes from a text field inside `target`. */
  isTypingEvent: (event: KeyboardEvent, target: Target) => boolean;
  /** Whether hotkeys on one target can receive the same events as hotkeys on the other. */
  targetsOverlap: (a: Target, b: Target) => boolean;
  /** Creates the synthetic event passed to callbacks triggered programmatically, such as from devtools. */
  createKeyboardEvent: (type: 'keydown' | 'keyup', init: KeyboardEventInit) => KeyboardEvent;
}
/** The browser environment: DOM events on elements, the document, and the window. */
export declare const domEnvironment: HotkeysEnvironment;
/** Returns the environment hotkeys use to listen for and interpret keyboard events. */
export declare function getHotkeysEnvironment(): HotkeysEnvironment;
/**
 * Replaces the environment hotkeys use to listen for and interpret keyboard
 * events, or restores the browser environment with `null`. Call it before
 * registering hotkeys: existing listeners stay with the previous environment.
 */
export declare function setHotkeysEnvironment(environment: HotkeysEnvironment | null): void;
//#endregion