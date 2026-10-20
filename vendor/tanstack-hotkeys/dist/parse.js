import { MODIFIER_ORDER, normalizeKeyName } from "./constants.js";
import { detectPlatform, resolveModifier } from "./platform.js";
import { assertLogicalKey, modifierAlias, normalizeKeyboardEvent, physicalCodeOf, splitChordParts } from "./_keyboard-event.js";

//#region src/parse.ts
/** Builds a ParsedHotkeyChord, listing held modifiers in canonical order. */
function toParsedChord(identity, ctrl, shift, alt, meta) {
	const held = {
		Control: ctrl,
		Alt: alt,
		Shift: shift,
		Meta: meta
	};
	return {
		...identity,
		ctrl,
		shift,
		alt,
		meta,
		modifiers: MODIFIER_ORDER.filter((modifier) => held[modifier])
	};
}
/**
* Whether a hotkey is a sequence. Use this instead of `Array.isArray`, which
* does not narrow readonly arrays.
*/
function isHotkeySequence(hotkey) {
	return Array.isArray(hotkey);
}
function simplifyHotkey(hotkey) {
	return isHotkeySequence(hotkey) && hotkey.length === 1 ? hotkey[0] : hotkey;
}
function parseChordString(chord, platform) {
	const parts = splitChordParts(chord);
	const modifiers = /* @__PURE__ */ new Set();
	let key = "";
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i].trim();
		if (i === parts.length - 1) key = normalizeKeyName(part);
		else {
			const alias = modifierAlias(part);
			if (alias) {
				const resolved = resolveModifier(alias, platform);
				modifiers.add(resolved);
			} else if (parts.length === 1) key = normalizeKeyName(part);
		}
	}
	if (!key && parts.length > 0) key = normalizeKeyName(parts[parts.length - 1].trim());
	const code = physicalCodeOf(key);
	return toParsedChord(code !== void 0 ? { code } : { key }, modifiers.has("Control"), modifiers.has("Shift"), modifiers.has("Alt"), modifiers.has("Meta"));
}
/** Resolves a chord object's modifiers. Omitted modifiers are false. */
function parseChordObject(chord, platform) {
	if (chord.code === void 0) assertLogicalKey(chord.key);
	let ctrl = chord.ctrl ?? false;
	const shift = chord.shift ?? false;
	const alt = chord.alt ?? false;
	let meta = chord.meta ?? false;
	if (chord.mod) {
		if (resolveModifier("Mod", platform) === "Control") ctrl = true;
		else meta = true;
	}
	return toParsedChord(chord.code !== void 0 ? { code: chord.code } : { key: normalizeKeyName(chord.key) }, ctrl, shift, alt, meta);
}
function parseChord(chord, platform) {
	return typeof chord === "string" ? parseChordString(chord, platform) : parseChordObject(chord, platform);
}
/**
* The canonical string for a parsed chord: `Mod` first when the platform
* allows, then `Alt`, then `Shift`; otherwise full `Control+Alt+Shift+Meta`
* order.
*/
function normalizeParsedChord(parsed, platform) {
	if (parsed.code === void 0) assertLogicalKey(parsed.key);
	const canUseMod = platform === "mac" ? parsed.meta && !parsed.ctrl : parsed.ctrl && !parsed.meta;
	const parts = [];
	if (canUseMod) {
		parts.push("Mod");
		if (parsed.alt) parts.push("Alt");
		if (parsed.shift) parts.push("Shift");
	} else for (const modifier of MODIFIER_ORDER) if (parsed.modifiers.includes(modifier)) parts.push(modifier);
	parts.push(parsed.code !== void 0 ? `[${parsed.code}]` : normalizeKeyName(parsed.key));
	return parts.join("+");
}
function parseHotkey(hotkey, platform = detectPlatform()) {
	return Array.isArray(hotkey) ? hotkey.map((step) => parseChord(step, platform)) : parseChord(hotkey, platform);
}
function normalizeHotkey(hotkey, platform = detectPlatform()) {
	if (Array.isArray(hotkey)) {
		const steps = hotkey.map((step) => normalizeParsedChord(parseChord(step, platform), platform));
		return steps.length === 1 ? steps[0] : steps;
	}
	return normalizeParsedChord(parseChord(hotkey, platform), platform);
}
/**
* Checks if a string is a recognized modifier token (including aliases).
*
* For a `KeyboardEvent`, use `isModifier(normalizeKeyName(event.key))` so DOM
* spellings like `OS` / `Win` match the same alias table.
*
* @param key - Key name or alias (e.g. from a hotkey string or `event.key`)
* @returns True if the string is a recognized modifier
*/
function isModifierKey(key) {
	return modifierAlias(key) !== void 0;
}
/**
* Parses a KeyboardEvent into the chord it pressed, in the same format as
* `parseHotkey()`. Pass the result to `normalizeHotkey` for its canonical string.
*
* @param event - The KeyboardEvent to parse
* @param platform - The target platform for resolving modifiers (defaults to auto-detection)
* @returns The parsed chord for the keyboard event
*
* @example
* ```ts
* document.addEventListener('keydown', (event) => {
*   const parsed = parseKeyboardEvent(event)
*   console.log(parsed) // { key: 'S', ctrl: true, shift: false, ... }
* })
* ```
*/
function parseKeyboardEvent(event, platform) {
	const normalized = normalizeKeyboardEvent(event, platform);
	const ctrl = normalized.altGraph ? false : normalized.ctrl;
	const alt = normalized.altGraph ? false : normalized.alt;
	const shift = normalized.shift;
	return toParsedChord({ key: normalized.key }, ctrl, shift, alt, normalized.meta);
}
/**
* Checks if a chord contains at least one non-modifier key.
*
* This is useful for validating that a recorded chord is complete and not
* just a combination of modifiers without an action key.
*
* @param chord - The chord string or parsed chord to check
* @param platform - The target platform for parsing (defaults to auto-detection)
* @returns True if the chord contains at least one non-modifier key
*
* @example
* ```ts
* hasNonModifierKey('Control+Shift+S') // true
* hasNonModifierKey('Control+Shift') // false (no action key)
* hasNonModifierKey(parseHotkey('Mod+A')) // true
* ```
*/
function hasNonModifierKey(chord, platform = detectPlatform()) {
	const parsed = typeof chord === "string" ? parseChordString(chord, platform) : chord;
	if (parsed.code !== void 0) return parsed.code.length > 0 && !/^(Control|Shift|Alt|Meta)(Left|Right)$/.test(parsed.code);
	return !isModifierKey(parsed.key) && parsed.key.length > 0;
}

//#endregion
export { hasNonModifierKey, isHotkeySequence, isModifierKey, normalizeHotkey, parseHotkey, parseKeyboardEvent, simplifyHotkey };