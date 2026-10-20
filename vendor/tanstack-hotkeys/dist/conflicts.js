import { getHotkeysEnvironment } from "./environment.js";
import { detectPlatform } from "./platform.js";
import { isHotkeySequence, parseHotkey } from "./parse.js";
import { parsedChordsEqual } from "./_match.js";
import { matchesKeyboardEvent } from "./match.js";
import { managerRef } from "./_manager-ref.js";
import { toHotkeyRegistrationView } from "./hotkey-manager.js";

//#region src/conflicts.ts
/**
* Find equivalent bindings and sequence-prefix conflicts in the live registry.
* With source events, also checks observed logical/physical overlap. Does not
* discover unmounted handlers, external listeners, or other keyboard layouts.
*/
function findHotkeyConflicts(candidate, options = {}) {
	const steps = isHotkeySequence(candidate) ? candidate : [candidate];
	if (steps.length === 0) return [];
	const platform = options.platform ?? detectPlatform();
	const parsed = steps.map((step) => parseHotkey(step, platform));
	const environment = getHotkeysEnvironment();
	const target = options.target ?? environment.defaultTarget();
	const conflicts = [];
	const matches = (registration, bindings) => {
		if (!options.includeDisabled && registration.options.enabled === false || (registration.options.eventType ?? "keydown") !== (options.eventType ?? "keydown") || options.excludeIds?.includes(registration.id) || options.exclude?.(registration) || options.scope !== "all" && target && !environment.targetsOverlap(target, registration.target)) return false;
		return parsed.slice(0, Math.min(parsed.length, bindings.length)).every((a, index) => {
			const b = parseHotkey(bindings[index], registration.options.platform);
			const event = options.events?.[index];
			return parsedChordsEqual(a, b) || event !== void 0 && matchesKeyboardEvent(event, a, platform) && matchesKeyboardEvent(event, b, registration.options.platform);
		});
	};
	const registrations = managerRef.current?.registrations.state.values() ?? [];
	for (const registration of registrations) {
		const view = toHotkeyRegistrationView(registration);
		if (matches(view, view.kind === "sequence" ? view.hotkey : [view.hotkey])) conflicts.push({ registration: view });
	}
	return conflicts;
}

//#endregion
export { findHotkeyConflicts };