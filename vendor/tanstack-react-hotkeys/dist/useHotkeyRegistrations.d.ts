import { HotkeyRegistrationView } from "@tanstack/hotkeys";
//#region src/useHotkeyRegistrations.d.ts
/**
 * React hook that reactively reads every hotkey registration, chords and
 * sequences, from the singleton HotkeyManager. Narrow each view with `kind`.
 *
 * This hook does NOT require the HotkeysProvider. It re-renders when
 * registrations change, including trigger counts and sequence progress.
 *
 * @returns All registrations, without callbacks
 *
 * @example
 * ```tsx
 * function ShortcutPalette() {
 *   const registrations = useHotkeyRegistrations()
 *
 *   return (
 *     <ul>
 *       {registrations.map((reg) => (
 *         <li key={reg.id}>
 *           {reg.options.meta?.name}: {formatForDisplay(reg.hotkey)}
 *         </li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export declare function useHotkeyRegistrations(): Array<HotkeyRegistrationView>;
//#endregion