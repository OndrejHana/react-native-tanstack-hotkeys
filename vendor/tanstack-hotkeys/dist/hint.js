import { MODIFIER_KEYS, normalizeKeyName } from "./constants.js";
import { isHotkeySequence, parseHotkey } from "./parse.js";

//#region src/hint.ts
/**
* Returns whether held modifiers should reveal a shortcut hint.
* By default, any nonempty subset of the binding's modifiers qualifies; an
* unrelated modifier hides the hint. `exact` requires every binding modifier.
* Nonmodifier keys are ignored. This does not check registration or focus.
* A sequence reveals its hint from its first step.
*
* @example
* matchesHeldModifiers('Alt+Shift+[KeyK]', ['Alt']) // true
* matchesHeldModifiers('Alt+Shift+[KeyK]', ['Alt', 'Control']) // false
*/
function matchesHeldModifiers(hotkey, heldKeys, options = {}) {
	if (heldKeys.includes("AltGraph")) return false;
	const held = [...new Set(heldKeys.map(normalizeKeyName).filter((key) => MODIFIER_KEYS.has(key)))];
	const first = isHotkeySequence(hotkey) ? hotkey[0] : hotkey;
	if (first === void 0) return false;
	const { modifiers } = parseHotkey(first, options.platform);
	return held.length > 0 && held.every((key) => modifiers.includes(key)) && (!options.exact || held.length === modifiers.length);
}

//#endregion
export { matchesHeldModifiers };