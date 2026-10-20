import { ALL_KEYS, normalizeKeyName } from "./constants.js";
import { modifierAlias, physicalCodeOf, splitChordParts } from "./_keyboard-event.js";

//#region src/validate.ts
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
function validateHotkey(hotkey) {
	if (typeof hotkey !== "string") {
		if (hotkey.length === 0) return {
			valid: false,
			warnings: [],
			errors: ["Sequence cannot be empty"]
		};
		if (hotkey.length === 1) return validateChord(hotkey[0]);
		const results = hotkey.map(validateChord);
		const prefixed = (key) => results.flatMap((result, i) => result[key].map((message) => `Step ${i + 1}: ${message}`));
		return {
			valid: results.every((result) => result.valid),
			warnings: prefixed("warnings"),
			errors: prefixed("errors")
		};
	}
	return validateChord(hotkey);
}
function validateChord(hotkey) {
	const warnings = [];
	const errors = [];
	if (!hotkey || hotkey.trim() === "") return {
		valid: false,
		warnings: [],
		errors: ["Hotkey cannot be empty"]
	};
	const parts = splitChordParts(hotkey).map((p) => p.trim());
	if (parts.length === 0 || parts.some((p) => p === "")) return {
		valid: false,
		warnings: [],
		errors: ["Invalid hotkey format: empty parts detected"]
	};
	const modifierParts = parts.slice(0, -1);
	const keyPart = parts[parts.length - 1];
	for (const modifier of modifierParts) if (!modifierAlias(modifier)) errors.push(`Unknown modifier: '${modifier}'`);
	if (keyPart.length > 1 && (keyPart.startsWith("[") || keyPart.endsWith("]")) && physicalCodeOf(keyPart) === void 0) errors.push("Invalid physical key: use a bracketed KeyboardEvent.code, such as [KeyS]");
	if (!isKnownKey(normalizeKeyName(keyPart))) warnings.push(`Unknown key: '${keyPart}'. This may still work but won't have type-safe autocomplete.`);
	return {
		valid: errors.length === 0,
		warnings,
		errors
	};
}
/** Physical codes, single characters, and named keys are known. */
function isKnownKey(key) {
	return physicalCodeOf(key) !== void 0 || Array.from(key).length === 1 || ALL_KEYS.has(key);
}
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
function assertValidHotkey(hotkey) {
	const result = validateHotkey(hotkey);
	if (!result.valid) throw new Error(`Invalid hotkey '${String(hotkey)}': ${result.errors.join(", ")}`);
}
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
function checkHotkey(hotkey) {
	const result = validateHotkey(hotkey);
	if (result.errors.length > 0) console.error(`Hotkey '${String(hotkey)}' errors:`, result.errors.join("; "));
	if (result.warnings.length > 0) console.warn(`Hotkey '${String(hotkey)}' warnings:`, result.warnings.join("; "));
	return result.valid;
}

//#endregion
export { assertValidHotkey, checkHotkey, validateHotkey };