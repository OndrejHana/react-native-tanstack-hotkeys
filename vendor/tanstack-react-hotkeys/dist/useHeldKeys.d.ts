//#region src/useHeldKeys.d.ts
/**
 * React hook that returns an array of currently held keyboard keys.
 *
 * This hook uses `useSelector` from `@tanstack/react-store` to subscribe
 * to the global KeyStateTracker and updates whenever keys are pressed
 * or released.
 *
 * @returns Array of currently held key names
 *
 * @example
 * ```tsx
 * function KeyDisplay() {
 *   const heldKeys = useHeldKeys()
 *
 *   return (
 *     <div>
 *       Currently pressed: {heldKeys.join(' + ') || 'None'}
 *     </div>
 *   )
 * }
 * ```
 */
export declare function useHeldKeys(): Array<string>;
//#endregion