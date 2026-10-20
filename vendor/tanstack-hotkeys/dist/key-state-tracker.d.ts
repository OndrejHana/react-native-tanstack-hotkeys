import { Store } from "@tanstack/store";
//#region src/key-state-tracker.d.ts
/**
 * State interface for the KeyStateTracker.
 */
export interface KeyStateTrackerState {
  /**
   * Array of currently held key names (normalized, e.g. "Control", "A").
   */
  heldKeys: Array<string>;
  /**
   * Map from normalized key name to the physical `event.code` (e.g. "KeyA", "ShiftLeft").
   * Useful for debugging which physical key was pressed.
   */
  heldCodes: Record<string, string>;
}
/**
 * Singleton tracker for currently held keyboard keys.
 *
 * This class maintains a list of all keys currently being pressed,
 * which is useful for:
 * - Displaying currently held keys to users
 * - Custom shortcut recording for rebinding
 * - Complex chord detection
 *
 * State Management:
 * - Uses TanStack Store for reactive state management
 * - State can be accessed via `tracker.store.state` when using the class directly
 * - When using framework adapters (React), use `useHeldKeys` and `useHeldKeyCodes` hooks for reactive state
 *
 * @example
 * ```ts
 * const tracker = KeyStateTracker.getInstance()
 *
 * // Access state directly
 * console.log(tracker.store.state.heldKeys) // ['Control', 'Shift']
 *
 * // Subscribe to changes with TanStack Store
 * const unsubscribe = tracker.store.subscribe(() => {
 *   console.log('Currently held:', tracker.store.state.heldKeys)
 * })
 *
 * // Check current state
 * console.log(tracker.getHeldKeys()) // ['Control', 'Shift']
 * console.log(tracker.isKeyHeld('Control')) // true
 *
 * // Cleanup
 * unsubscribe()
 * ```
 */
export declare class KeyStateTracker {
  #private;
  /**
   * The TanStack Store instance containing the tracker state.
   * Use this to subscribe to state changes or access current state.
   */
  readonly store: Store<KeyStateTrackerState>;
  private constructor();
  /**
   * Gets the singleton instance of KeyStateTracker.
   */
  static getInstance(): KeyStateTracker;
  /**
   * Resets the singleton instance. Useful for testing.
   */
  static resetInstance(): void;
  /**
   * Gets an array of currently held key names.
   *
   * @returns Array of key names currently being pressed
   */
  getHeldKeys(): Array<string>;
  /**
   * Checks if a specific key is currently being held.
   *
   * @param key - The key name to check (case-insensitive)
   * @returns True if the key is currently held
   */
  isKeyHeld(key: string): boolean;
  /**
   * Checks if any of the given keys are currently held.
   *
   * @param keys - Array of key names to check
   * @returns True if any of the keys are currently held
   */
  isAnyKeyHeld(keys: Array<string>): boolean;
  /**
   * Checks if all of the given keys are currently held.
   *
   * @param keys - Array of key names to check
   * @returns True if all of the keys are currently held
   */
  areAllKeysHeld(keys: Array<string>): boolean;
  /**
   * Destroys the tracker and removes all listeners.
   */
  destroy(): void;
}
/**
 * Gets the singleton KeyStateTracker instance.
 * Convenience function for accessing the tracker.
 */
export declare function getKeyStateTracker(): KeyStateTracker;
//#endregion