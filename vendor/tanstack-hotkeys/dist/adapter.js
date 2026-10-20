import { getHotkeysEnvironment } from "./environment.js";
import { detectPlatform } from "./platform.js";
import { isHotkeySequence, normalizeHotkey } from "./parse.js";
import { defaultHotkeyOptions } from "./_registration.js";
import { getHotkeyManager } from "./hotkey-manager.js";
import { getAppHotkeyRegistrationOptions, isAppHotkey, resolveAppHotkey } from "./app-hotkeys.js";

//#region src/adapter.ts
/** Reconciles adapter registrations while retaining handles for option updates. */
function createHotkeyBindings() {
	const registrations = /* @__PURE__ */ new Map();
	return {
		/**
		* Registers new definitions, updates existing ones in place, and removes
		* stale ones. Definitions with an empty sequence or a null target are skipped.
		*/
		update(definitions, commonOptions = {}) {
			const prepared = [];
			definitions.forEach((definition, index) => {
				const merged = {
					...commonOptions,
					...definition.options
				};
				const options = {
					...defaultHotkeyOptions,
					...merged,
					ignoreInputs: merged.ignoreInputs ?? "auto",
					target: "target" in merged ? merged.target ?? null : getHotkeysEnvironment().defaultTarget() ?? null,
					platform: merged.platform ?? detectPlatform()
				};
				if (!options.target || isHotkeySequence(definition.hotkey) && definition.hotkey.length === 0) return;
				const hotkey = normalizeHotkey(definition.hotkey, options.platform);
				if (isHotkeySequence(hotkey)) delete options.requireReset;
				else delete options.timeout;
				prepared.push({
					key: `${index}:${isHotkeySequence(hotkey) ? hotkey.join(" ") : hotkey}`,
					callback: definition.callback,
					options,
					register: () => getHotkeyManager().register(hotkey, definition.callback, options)
				});
			});
			const keys = new Set(prepared.map((binding) => binding.key));
			for (const [key, registration] of registrations) if (!keys.has(key)) {
				registration.handle.unregister();
				registrations.delete(key);
			}
			for (const binding of prepared) {
				const previous = registrations.get(binding.key);
				const { target, platform } = binding.options;
				if (previous?.handle.isActive && previous.target === target && previous.platform === platform) {
					previous.handle.callback = binding.callback;
					const reset = Object.fromEntries(Object.keys(previous.options).map((key) => [key, void 0]));
					previous.handle.setOptions({
						...reset,
						...binding.options
					});
					previous.options = binding.options;
				} else {
					previous?.handle.unregister();
					registrations.set(binding.key, {
						handle: binding.register(),
						target,
						platform,
						options: binding.options
					});
				}
			}
		},
		destroy() {
			for (const { handle } of registrations.values()) handle.unregister();
			registrations.clear();
		}
	};
}
/**
* Converts adapter definitions into `createHotkeyBindings` definitions.
* Options merge in this order: defaults, app hotkey declaration, common
* options, per-definition options. App hotkeys resolve their effective hotkey
* from the store, and an unbound app hotkey keeps its position but registers
* nothing.
*/
function prepareHotkeyDefinitions(definitions, options = {}) {
	return definitions.map((definition) => {
		let hotkey = definition.hotkey;
		let declared = {};
		if (isAppHotkey(hotkey)) {
			const appHotkey = resolveAppHotkey(hotkey, options.appHotkeysStore);
			declared = getAppHotkeyRegistrationOptions(appHotkey);
			hotkey = appHotkey.hotkey ?? [];
		}
		const { target, ...merged } = {
			...options.defaults,
			...declared,
			...options.commonOptions,
			...definition.options
		};
		const resolved = target === void 0 ? void 0 : options.resolveTarget ? options.resolveTarget(target) : target ?? void 0;
		return {
			hotkey,
			callback: definition.callback,
			options: resolved === void 0 ? merged : {
				...merged,
				target: resolved
			}
		};
	});
}
/**
* Calls `onChange` when the store published with `publishAppHotkeysStore` or
* `provideAppHotkeys` changes, or when its app hotkeys or custom hotkeys
* change. For adapters that resolve app hotkeys without a provider. Returns an
* unsubscribe function.
*/
function subscribePublishedAppHotkeys(onChange) {
	const slot = getHotkeyManager().appHotkeys;
	let inner;
	const follow = () => {
		inner?.unsubscribe();
		inner = slot.state?.store.subscribe(onChange);
	};
	follow();
	const outer = slot.subscribe(() => {
		follow();
		onChange();
	});
	return () => {
		outer.unsubscribe();
		inner?.unsubscribe();
	};
}
/**
* Merges a provider's default options over its parent's. A provider with a
* `scope` sets `hotkey.scope`, so hotkeys registered inside it use that scope.
*/
function mergeHotkeysProviderDefaults(parent, own, scope) {
	return {
		hotkey: {
			...parent?.hotkey,
			...own?.hotkey,
			...scope && { scope }
		},
		hotkeyRecorder: {
			...parent?.hotkeyRecorder,
			...own?.hotkeyRecorder
		}
	};
}
/**
* A key for a provider's scope activation, or `null` when the scope should not
* be active. Equal keys mean the same activation, so adapters reactivate only
* when the key changes, not when an inline `exclusive` object is recreated.
*/
function getHotkeysProviderScopeKey(options) {
	const { scope, exclusive, active, parent } = options;
	if (!scope || !active) return null;
	return JSON.stringify([
		scope,
		typeof exclusive === "object" ? exclusive.allow : !!exclusive,
		parent ?? null
	]);
}
/**
* Activates the scope described by a key from `getHotkeysProviderScopeKey`.
* Returns a function that releases the activation.
*/
function activateHotkeysProviderScope(key) {
	const [scope, exclusive, parent] = JSON.parse(key);
	return getHotkeyManager().activateScope(scope, {
		exclusive: Array.isArray(exclusive) ? { allow: exclusive } : exclusive,
		parent: parent ?? void 0
	});
}

//#endregion
export { activateHotkeysProviderScope, createHotkeyBindings, getHotkeysProviderScopeKey, mergeHotkeysProviderDefaults, prepareHotkeyDefinitions, subscribePublishedAppHotkeys };