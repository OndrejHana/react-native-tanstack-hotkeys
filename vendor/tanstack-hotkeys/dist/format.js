import { MODIFIER_ORDER, normalizeKeyName } from "./constants.js";
import { KEY_DISPLAY_SYMBOLS, LINUX_MODIFIER_LABELS, MAC_MODIFIER_LABELS, MAC_MODIFIER_SYMBOLS, PUNCTUATION_KEY_DISPLAY_LABELS, WINDOWS_MODIFIER_LABELS } from "./display-labels.js";
import { detectPlatform } from "./platform.js";
import { assertLogicalKey, codeToLogicalKey, modifierAlias, physicalCodeOf, splitChordParts } from "./_keyboard-event.js";
import { normalizeHotkey } from "./parse.js";

//#region src/format.ts
function formatHotkey(parsed) {
	return Array.isArray(parsed) ? parsed.map((step) => formatParsedChord(step)) : formatParsedChord(parsed);
}
function formatParsedChord(parsed) {
	if (parsed.code === void 0) assertLogicalKey(parsed.key);
	const parts = [];
	for (const modifier of MODIFIER_ORDER) if (parsed.modifiers.includes(modifier)) parts.push(modifier);
	parts.push(parsed.code !== void 0 ? `[${parsed.code}]` : parsed.key);
	return parts.join("+");
}
function formatForDisplay(hotkey, options = {}) {
	if (Array.isArray(hotkey)) {
		const steps = hotkey.map((step) => formatChordParts(step, options));
		return options.parts ? steps : steps.map((parts) => parts.join(chordSeparator(options))).join(options.sequenceSeparator ?? " ");
	}
	const parts = formatChordParts(hotkey, options);
	return options.parts ? parts : parts.join(chordSeparator(options));
}
function modifierSymbolsEnabled(options) {
	const symbols = options.useSymbols ?? true;
	return typeof symbols === "boolean" ? symbols : symbols.modifiers ?? true;
}
function chordSeparator(options) {
	const platform = options.platform ?? detectPlatform();
	return options.separatorToken ?? (platform === "mac" && modifierSymbolsEnabled(options) ? " " : "+");
}
function formatChordParts(hotkey, options) {
	const platform = options.platform ?? detectPlatform();
	const symbols = options.useSymbols ?? true;
	const modifierSymbols = modifierSymbolsEnabled(options);
	const keySymbols = typeof symbols === "boolean" ? symbols : symbols.keys ?? true;
	const normalized = normalizeHotkey(hotkey, platform);
	const segments = splitChordParts(normalized);
	if (platform === "mac") {
		const modifierIndex = (segment) => {
			const index = MODIFIER_ORDER.indexOf(segment === "Mod" ? "Meta" : segment);
			return index === -1 ? MODIFIER_ORDER.length : index;
		};
		segments.sort((a, b) => modifierIndex(a) - modifierIndex(b));
	}
	return segments.map((segment) => {
		const modifier = modifierAlias(segment);
		if (modifier) return platform === "mac" ? modifierSymbols ? MAC_MODIFIER_SYMBOLS[modifier] : MAC_MODIFIER_LABELS[modifier] : platform === "windows" ? WINDOWS_MODIFIER_LABELS[modifier] : LINUX_MODIFIER_LABELS[modifier];
		const code = physicalCodeOf(segment);
		const label = options.keyLabels?.[code ?? segment];
		if (label !== void 0) return label;
		const numpad = code?.startsWith("Numpad") ?? false;
		let displayKey = code ?? segment;
		const mappedKey = code ? options.layoutMap?.get(code) : void 0;
		if (mappedKey) displayKey = normalizeKeyName(mappedKey);
		else if (code) displayKey = numpad ? code.slice(6) : codeToLogicalKey(code) ?? code;
		const display = (keySymbols ? KEY_DISPLAY_SYMBOLS : PUNCTUATION_KEY_DISPLAY_LABELS)[displayKey] ?? displayKey;
		return numpad ? `Numpad ${display.replace(/([a-z])([A-Z])/g, "$1 $2")}` : display;
	});
}

//#endregion
export { formatForDisplay, formatHotkey };