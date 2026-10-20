//#region src/_manager-ref.ts
/**
* The HotkeyManager singleton, once created. Code that only reads the live
* registry, such as conflict checks, reads this instead of importing the
* manager, so a recorder bundle does not include hotkey dispatch.
*/
const managerRef = { current: null };

//#endregion
export { managerRef };