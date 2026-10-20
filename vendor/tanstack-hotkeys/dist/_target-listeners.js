import { getHotkeysEnvironment } from "./environment.js";

//#region src/_target-listeners.ts
/** Shares keyboard listeners within each target and capture phase. */
var TargetListeners = class {
	dispatch;
	#targets = /* @__PURE__ */ new Map();
	#processed = /* @__PURE__ */ new WeakMap();
	constructor(dispatch) {
		this.dispatch = dispatch;
	}
	add(target, capture, id) {
		const environment = getHotkeysEnvironment();
		if (environment.defaultTarget() === void 0) return;
		let phases = this.#targets.get(target);
		if (!phases) {
			phases = /* @__PURE__ */ new Map();
			this.#targets.set(target, phases);
		}
		let group = phases.get(capture);
		if (!group) {
			const ids = /* @__PURE__ */ new Set();
			const listener = (eventType) => (rawEvent) => {
				const event = rawEvent;
				let processed = this.#processed.get(event);
				const first = !processed || processed.groups.has(ids);
				if (!processed || first) {
					processed = {
						ids: /* @__PURE__ */ new Set(),
						groups: /* @__PURE__ */ new Set()
					};
					this.#processed.set(event, processed);
				}
				processed.groups.add(ids);
				const pending = /* @__PURE__ */ new Set();
				for (const registrationId of ids) if (!processed.ids.has(registrationId)) {
					processed.ids.add(registrationId);
					pending.add(registrationId);
				}
				this.dispatch(event, target, eventType, capture, pending, first);
			};
			const removeKeydown = environment.listen(target, "keydown", listener("keydown"), capture);
			const removeKeyup = environment.listen(target, "keyup", listener("keyup"), capture);
			group = {
				ids,
				remove: () => {
					removeKeydown();
					removeKeyup();
				}
			};
			phases.set(capture, group);
		}
		group.ids.add(id);
	}
	remove(target, capture, id) {
		const phases = this.#targets.get(target);
		const group = phases?.get(capture);
		if (!group) return;
		group.ids.delete(id);
		if (group.ids.size === 0) {
			group.remove();
			phases.delete(capture);
			if (phases.size === 0) this.#targets.delete(target);
		}
	}
	destroy() {
		for (const phases of this.#targets.values()) for (const group of phases.values()) group.remove();
		this.#targets.clear();
		this.#processed = /* @__PURE__ */ new WeakMap();
	}
};

//#endregion
export { TargetListeners };