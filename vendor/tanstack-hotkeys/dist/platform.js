import { getHotkeysEnvironment } from "./environment.js";

//#region src/platform.ts
/**
* Detects the current platform. In browsers this reads navigator properties;
* other hosts report it through their `HotkeysEnvironment`.
*
* Used internally to resolve platform-adaptive modifiers like 'Mod' (Command on Mac,
* Control elsewhere) and for platform-specific hotkey formatting.
*
* @returns The detected platform: 'mac', 'windows', or 'linux'
* @remarks In browsers, defaults to 'linux' in SSR environments where navigator is undefined
*
* @example
* ```ts
* const platform = detectPlatform() // 'mac' | 'windows' | 'linux'
* const modifier = resolveModifier('Mod', platform) // 'Meta' on Mac, 'Control' elsewhere
* ```
*/
function detectPlatform() {
	return getHotkeysEnvironment().detectPlatform();
}
/**
* Resolves the platform-adaptive 'Mod' modifier to the appropriate canonical modifier.
*
* The 'Mod' token represents the "primary modifier" on each platform:
* - macOS: 'Meta' (Command key ⌘)
* - Windows/Linux: 'Control' (Ctrl key)
*
* This enables cross-platform hotkey definitions like 'Mod+S' that automatically
* map to Command+S on Mac and Ctrl+S on Windows/Linux.
*
* @param modifier - The modifier to resolve. If 'Mod', resolves based on platform.
* @param platform - The target platform. Defaults to auto-detection.
* @returns The canonical modifier name ('Control', 'Shift', 'Alt', or 'Meta')
*
* @example
* ```ts
* resolveModifier('Mod', 'mac') // 'Meta'
* resolveModifier('Mod', 'windows') // 'Control'
* resolveModifier('Control', 'mac') // 'Control' (unchanged)
* ```
*/
function resolveModifier(modifier, platform = detectPlatform()) {
	if (modifier === "Mod") return platform === "mac" ? "Meta" : "Control";
	return modifier;
}

//#endregion
export { detectPlatform, resolveModifier };