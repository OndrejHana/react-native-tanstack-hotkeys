import { Hotkey } from "./hotkey.types.js";
//#region src/validate.d.ts
/** A hotkey to validate: a chord string, a sequence, or untyped input such as saved data. */
export type ValidatableHotkey = Hotkey | (string & {}) | ReadonlyArray<string>;
/**
 * Validates a hotkey and returns any warnings or errors.
 * Sequences are validated step by step, and messages name the failing step.
 *
 * Checks for:
 * - Valid syntax (modifier+...+key format)
 * - Known modifiers
 * - Known keys
 *
 * @param hotkey - The hotkey string to validate
 * @returns A ValidationResult with validity status, warnings, and errors
 *
 * @example
 * ```ts
 * validateHotkey('Mod+S')
 * // { valid: true, warnings: [], errors: [] }
 *
 * validateHotkey('')
 * // { valid: false, warnings: [], errors: ['Hotkey cannot be empty'] }
 *
 * validateHotkey(['G', 'Foo+H'])
 * // { valid: false, warnings: [], errors: ["Step 2: Unknown modifier: 'Foo'"] }
 * ```
 */
export declare function validateHotkey(hotkey: ValidatableHotkey): ValidationResult;
/**
 * Validates a hotkey and throws an error if invalid.
 * Useful for development-time validation.
 *
 * @param hotkey - The hotkey string to validate
 * @throws Error if the hotkey is invalid
 *
 * @example
 * ```ts
 * assertValidHotkey('Mod+S') // OK
 * assertValidHotkey('') // Throws Error: Invalid hotkey: Hotkey cannot be empty
 * ```
 */
export declare function assertValidHotkey(hotkey: ValidatableHotkey): void;
/**
 * Validates a hotkey and logs warnings to the console.
 * Useful for development-time feedback.
 *
 * @param hotkey - The hotkey string to validate
 * @returns True if the hotkey is valid (may still have warnings)
 *
 * @example
 * ```ts
 * checkHotkey('Alt+C')
 * // Console: Warning: Alt+C may not work reliably on macOS...
 * // Returns: true
 * ```
 */
export declare function checkHotkey(hotkey: ValidatableHotkey): boolean;
/**
 * Result of validating a hotkey string.
 */
export interface ValidationResult {
  /** Whether the hotkey is valid (can still have warnings) */
  valid: boolean;
  /** Warning messages about potential issues */
  warnings: Array<string>;
  /** Error messages about invalid syntax */
  errors: Array<string>;
}
//#endregion