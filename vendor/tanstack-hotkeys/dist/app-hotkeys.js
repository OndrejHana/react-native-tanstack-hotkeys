import { detectPlatform } from "./platform.js";
import { isHotkeySequence, simplifyHotkey } from "./parse.js";
import { validateHotkey } from "./validate.js";
import { areHotkeysEqual } from "./match.js";
import { GLOBAL_SCOPE } from "./_registration.js";
import { getHotkeyManager } from "./hotkey-manager.js";
import { Store } from "@tanstack/store";

//#region src/app-hotkeys.ts
/**
* Declares every app hotkey up front, without registering any, so cheat
* sheets and settings screens can list hotkeys whose components have not
* mounted. Pass the result to `HotkeysProvider` as `appHotkeys`.
*
* @example
* ```ts
* export const appHotkeys = defineAppHotkeys({
*   'doc.save': { hotkey: 'Mod+S', meta: { name: 'Save', group: 'Document' } },
*   'nav.home': { hotkey: ['G', 'H'], meta: { name: 'Go home' }, options: { timeout: 800 } },
*   'palette.open': { hotkey: null, meta: { name: 'Command palette' } },
* })
* ```
*/
function defineAppHotkeys(definitions) {
	const result = {};
	for (const [id, input] of Object.entries(definitions)) {
		const hotkey = input.hotkey === null ? null : simplifyHotkey(input.hotkey);
		result[id] = {
			"~appHotkey": true,
			id,
			hotkey,
			defaultHotkey: hotkey,
			meta: input.meta,
			scope: input.scope,
			options: input.options
		};
	}
	return result;
}
/** Whether a value is an app hotkey created by `defineAppHotkeys`. */
function isAppHotkey(value) {
	return typeof value === "object" && value !== null && value["~appHotkey"] === true;
}
function hotkeysEqual(left, right, platform) {
	if (left === null || right === null) return left === right;
	return areHotkeysEqual(left, right, platform);
}
/** Whether an app hotkey's effective hotkey differs from its default. */
function isCustomHotkey(appHotkey, platform = detectPlatform()) {
	return !hotkeysEqual(appHotkey.hotkey, appHotkey.defaultHotkey, platform);
}
/** Parses a saved custom hotkey. Returns `undefined` when it is not a valid hotkey. */
function parseCustomHotkey(value) {
	if (value === null) return null;
	return (typeof value === "string" || Array.isArray(value) && value.every((step) => typeof step === "string")) && validateHotkey(value).valid ? simplifyHotkey(value) : void 0;
}
/** Applies custom hotkeys to declarations. Unchanged entries keep their identity. */
function applyCustomHotkeys(appHotkeys, customHotkeys) {
	const custom = customHotkeys;
	const result = {};
	for (const [id, appHotkey] of Object.entries(appHotkeys)) {
		const hotkey = custom[id] === void 0 ? appHotkey.defaultHotkey : custom[id];
		result[id] = hotkey === appHotkey.hotkey ? appHotkey : {
			...appHotkey,
			hotkey
		};
	}
	return result;
}
/** Keeps only valid custom hotkeys for known ids, warning about the rest. */
function sanitizeCustomHotkeys(appHotkeys, saved) {
	const result = {};
	if (typeof saved !== "object" || saved === null) return result;
	for (const [id, value] of Object.entries(saved)) {
		if (value === void 0) continue;
		if (!(id in appHotkeys)) {
			console.warn(`Ignoring custom hotkey for unknown app hotkey '${id}'`);
			continue;
		}
		const hotkey = parseCustomHotkey(value);
		if (hotkey === void 0) {
			console.warn(`Ignoring invalid custom hotkey for app hotkey '${id}':`, value);
			continue;
		}
		result[id] = hotkey;
	}
	return result;
}
/** Whether two app hotkeys can apply at the same time. */
function scopesOverlap(a, b) {
	const left = a.scope ?? "global";
	const right = b.scope ?? "global";
	return left === "global" || right === "global" || left === right;
}
/** Whether two hotkeys collide: equal chords, or one sequence starts with the other. */
function hotkeysOverlap(left, right, platform) {
	const a = isHotkeySequence(left) ? left : [left];
	const b = isHotkeySequence(right) ? right : [right];
	const length = Math.min(a.length, b.length);
	for (let i = 0; i < length; i++) if (!areHotkeysEqual(a[i], b[i], platform)) return false;
	return true;
}
/**
* Holds declared app hotkeys and the user's custom hotkeys. Framework
* providers create one and expose it through hooks; devtools read it from
* `HotkeyManager.appHotkeys`.
*
* @example
* ```ts
* const store = new AppHotkeysStore(appHotkeys, {
*   customHotkeys: JSON.parse(localStorage.getItem('hotkeys') ?? '{}'),
*   onCustomHotkeysChange: (custom) =>
*     localStorage.setItem('hotkeys', JSON.stringify(custom)),
* })
* store.setCustomHotkey('doc.save', 'Mod+Shift+S')
* ```
*/
var AppHotkeysStore = class {
	store;
	#declarations;
	#options;
	constructor(appHotkeys, options = {}) {
		this.#declarations = appHotkeys;
		this.#options = options;
		const customHotkeys = sanitizeCustomHotkeys(appHotkeys, options.customHotkeys);
		this.store = new Store({
			appHotkeys: applyCustomHotkeys(appHotkeys, customHotkeys),
			customHotkeys
		});
	}
	get #platform() {
		return this.#options.platform ?? detectPlatform();
	}
	/** Effective app hotkeys. */
	get appHotkeys() {
		return this.store.state.appHotkeys;
	}
	/** The user's hotkeys that differ from the defaults. */
	get customHotkeys() {
		return this.store.state.customHotkeys;
	}
	/** Updates callbacks and other options without resetting custom hotkeys. */
	setOptions(options) {
		this.#options = {
			...this.#options,
			...options
		};
	}
	/**
	* Replaces the declarations, for example after hot module replacement.
	* Custom hotkeys for ids that still exist are kept.
	*/
	setAppHotkeys(appHotkeys) {
		if (appHotkeys === this.#declarations) return;
		this.#declarations = appHotkeys;
		const customHotkeys = sanitizeCustomHotkeys(appHotkeys, this.store.state.customHotkeys);
		this.store.setState(() => ({
			appHotkeys: applyCustomHotkeys(appHotkeys, customHotkeys),
			customHotkeys
		}));
	}
	/** Effective app hotkey for an id, or `undefined` when it is not declared. */
	get(id) {
		return this.store.state.appHotkeys[id];
	}
	/**
	* Other app hotkeys that would collide if `id` used `hotkey`. App hotkeys
	* collide when their scopes match or either is `'global'`, and their
	* hotkeys are equal or one sequence starts with the other.
	*/
	findConflicts(id, hotkey) {
		const self = this.store.state.appHotkeys[id];
		if (!self) return [];
		const candidate = simplifyHotkey(hotkey);
		return Object.values(this.store.state.appHotkeys).filter((other) => other.id !== id && other.hotkey !== null && scopesOverlap(self, other) && hotkeysOverlap(candidate, other.hotkey, this.#platform));
	}
	/**
	* Sets the user's hotkey for an app hotkey. `null` unbinds it. A hotkey
	* equal to the default removes the customization.
	*
	* @returns Conflicting app hotkeys. When any exist, nothing changes.
	*/
	setCustomHotkey(id, hotkey) {
		const appHotkey = this.store.state.appHotkeys[id];
		if (!appHotkey) {
			console.warn(`Cannot set a custom hotkey for unknown app hotkey '${id}'`);
			return [];
		}
		const next = hotkey === null ? null : simplifyHotkey(hotkey);
		if (next !== null) {
			const conflicts = this.findConflicts(id, next);
			if (conflicts.length > 0) return conflicts;
		}
		const { [id]: _previous, ...rest } = this.store.state.customHotkeys;
		this.#commit(hotkeysEqual(next, appHotkey.defaultHotkey, this.#platform) ? rest : {
			...rest,
			[id]: next
		});
		return [];
	}
	/** Restores the default hotkey for an app hotkey. */
	resetCustomHotkey(id) {
		const { [id]: _previous, ...rest } = this.store.state.customHotkeys;
		this.#commit(rest);
	}
	/** Restores every default hotkey. */
	resetCustomHotkeys() {
		this.#commit({});
	}
	#commit(customHotkeys) {
		this.store.setState(() => ({
			appHotkeys: applyCustomHotkeys(this.#declarations, customHotkeys),
			customHotkeys
		}));
		this.#options.onCustomHotkeysChange?.(customHotkeys);
	}
	/**
	* Joins app hotkeys with live registrations, in declaration order.
	* Adapters call this with the manager's registration views.
	*/
	getList(registrations) {
		const byId = /* @__PURE__ */ new Map();
		for (const registration of registrations) {
			const id = registration.options.appHotkeyId;
			if (id === void 0) continue;
			const list = byId.get(id);
			if (list) list.push(registration);
			else byId.set(id, [registration]);
		}
		const manager = getHotkeyManager();
		return Object.values(this.store.state.appHotkeys).map((appHotkey) => {
			const registered = byId.get(appHotkey.id) ?? [];
			const enabled = registered.filter((r) => r.options.enabled !== false);
			return {
				appHotkey,
				status: appHotkey.hotkey === null ? "unbound" : registered.length === 0 ? "inactive" : enabled.length === 0 ? "disabled" : enabled.some((r) => manager.isScopeActive(r.options.scope)) ? "active" : "suspended",
				isCustom: isCustomHotkey(appHotkey, this.#platform),
				registrations: registered
			};
		});
	}
};
/**
* Returns the provider's version of an app hotkey, so custom hotkeys apply
* even when a component imports the declaration directly. Falls back to the
* given app hotkey when no store declares it.
*/
function resolveAppHotkey(appHotkey, store) {
	return store?.get(appHotkey.id) ?? appHotkey;
}
/**
* Options that adapters pass to the manager when registering an app hotkey:
* declared options, scope, meta, and the app hotkey id. The manager drops options
* that do not apply to the effective hotkey's kind.
*/
function getAppHotkeyRegistrationOptions(appHotkey) {
	return {
		...appHotkey.options,
		...appHotkey.scope !== void 0 && { scope: appHotkey.scope },
		meta: appHotkey.meta,
		appHotkeyId: appHotkey.id
	};
}
/**
* Publishes a provider's store on the HotkeyManager so devtools can list
* declared hotkeys. Returns a cleanup function that unpublishes it if it is
* still the published store.
*/
function publishAppHotkeysStore(store) {
	const manager = getHotkeyManager();
	manager.appHotkeys.setState(() => store);
	return () => {
		if (manager.appHotkeys.state === store) manager.appHotkeys.setState(() => null);
	};
}
/**
* Creates an app hotkeys store and publishes it on the HotkeyManager, for
* adapters without a provider component (such as Lit and Alpine). Hotkey
* APIs in those adapters resolve app hotkeys and custom hotkeys from the
* published store. Call it once at startup. Returns the store and a function
* that unpublishes it.
*
* @example
* ```ts
* provideAppHotkeys(appHotkeys, {
*   customHotkeys: JSON.parse(localStorage.getItem('hotkeys') ?? '{}'),
*   onCustomHotkeysChange: (custom) =>
*     localStorage.setItem('hotkeys', JSON.stringify(custom)),
* })
* ```
*/
function provideAppHotkeys(appHotkeys, options = {}) {
	const store = new AppHotkeysStore(appHotkeys, options);
	return {
		store,
		dispose: publishAppHotkeysStore(store)
	};
}

//#endregion
export { AppHotkeysStore, defineAppHotkeys, getAppHotkeyRegistrationOptions, isAppHotkey, isCustomHotkey, provideAppHotkeys, publishAppHotkeysStore, resolveAppHotkey };