import { MODIFIER_ALIASES, PUNCTUATION_CODE_MAP, normalizeKeyName } from "./constants.js";

//#region src/_keyboard-event.ts
/** Normalizes Unicode key names and modifier flags while retaining physical code and IME state. */
function normalizeKeyboardEvent(event, platform) {
	let altGraph = false;
	try {
		altGraph = platform !== "mac" && typeof event.getModifierState === "function" && event.getModifierState("AltGraph");
	} catch {}
	const key = (event.key || "").normalize("NFC");
	const normalizedKey = normalizeKeyName(key);
	const controlAlt = platform === "windows" && altGraph && !altGraphTypedCharacter({
		key: normalizedKey,
		altGraph
	});
	return {
		key: normalizedKey,
		code: event.code || "",
		ctrl: controlAlt || Boolean(event.ctrlKey),
		shift: Boolean(event.shiftKey),
		alt: controlAlt || Boolean(event.altKey),
		meta: Boolean(event.metaKey),
		altGraph: altGraph && !controlAlt,
		location: event.location,
		isComposing: Boolean(event.isComposing) || key === "Process" || key === "Unidentified"
	};
}
/**
* Maps familiar positions to compatibility fallback keys for the logical matcher.
* This assumes conventional positions, not the active layout; never use it to
* turn recorded physical bindings into logical bindings or display labels.
*/
function codeToLogicalKey(code) {
	if (/^Key[A-Z]$/i.test(code)) return code.slice(3).toUpperCase();
	if (/^Digit[0-9]$/i.test(code)) return code.slice(5);
	if (/^Numpad[0-9]$/i.test(code)) return code.slice(6);
	const punctuation = PUNCTUATION_CODE_MAP[code];
	if (punctuation) return punctuation;
	return {
		NumpadAdd: "+",
		NumpadSubtract: "-",
		NumpadMultiply: "*",
		NumpadDivide: "/",
		NumpadDecimal: ".",
		NumpadEnter: "Enter",
		Space: "Space"
	}[code];
}
/**
* Whether AltGr changed what a key typed, as in AltGr+Q typing `@`. False when
* AltGr is not held, or when the key typed its plain value: a named key such
* as Home, or an ASCII letter or digit (AltGr+F typing `f` on layouts with
* nothing on that key).
*/
function altGraphTypedCharacter(event) {
	if (!event.altGraph) return false;
	if (event.key === "Dead") return true;
	return isPrintableKey(event.key) && !/^[A-Za-z0-9]$/.test(event.key);
}
/** Tests for one Unicode code point, including characters represented by a surrogate pair. */
function isPrintableKey(key) {
	return key !== "" && Array.from(key).length === 1;
}
/**
* Resolves a modifier token or alias case-insensitively: `ctrl` → `Control`,
* `cmd` → `Meta`, `mod` → `Mod`. Returns undefined for anything else.
*/
function modifierAlias(token) {
	const lower = token.toLowerCase();
	return Object.hasOwn(MODIFIER_ALIASES, lower) ? MODIFIER_ALIASES[lower] : void 0;
}
/** Whether a string has the shape of a `KeyboardEvent.code`, such as `KeyS`. */
function isCodeName(code) {
	return /^[A-Za-z][A-Za-z0-9]*$/.test(code);
}
/** The code inside a physical token: `[KeyS]` → `KeyS`. Undefined for anything else. */
function physicalCodeOf(token) {
	return token.startsWith("[") && token.endsWith("]") && isCodeName(token.slice(1, -1)) ? token.slice(1, -1) : void 0;
}
/** Splits modifier tokens while retaining a trailing literal plus: `Control++` → `['Control', '+']`. */
function splitChordParts(hotkey) {
	if (!hotkey.endsWith("+")) return hotkey.split("+");
	const parts = hotkey.slice(0, -1).split("+");
	if (parts.at(-1) === "") parts.pop();
	parts.push("+");
	return parts;
}
/** Identifies ASCII letters whose layout-produced value takes precedence over positional fallbacks. */
function isAsciiLetter(key) {
	return /^[A-Za-z]$/.test(key);
}
/** Identifies a single Latin-script character, including accented letters. */
function isLatinLetter(key) {
	return /^\p{Script_Extensions=Latin}$/u.test(key);
}
/** Compares letters without case, preserving accents and avoiding expansions such as ß → SS. */
function keysEqual(left, right) {
	if (/^\p{Letter}$/u.test(left) && /^\p{Letter}$/u.test(right)) return left.localeCompare(right, void 0, { sensitivity: "accent" }) === 0;
	return left === right;
}
/** Rejects reserved physical-token syntax in logical object fields while allowing Unicode characters. */
function assertLogicalKey(key) {
	if (/^\[.*\]$/s.test(key.trim())) throw new Error("Logical key must not contain a bracketed physical code. Use the code field instead.");
}

//#endregion
export { altGraphTypedCharacter, assertLogicalKey, codeToLogicalKey, isAsciiLetter, isCodeName, isLatinLetter, isPrintableKey, keysEqual, modifierAlias, normalizeKeyboardEvent, physicalCodeOf, splitChordParts };