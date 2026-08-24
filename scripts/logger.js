import { MODULE_ID } from "./constants.js";

export class BloodyArtLogger {
  get debugEnabled() {
    try {
      return Boolean(globalThis.game?.settings?.get(MODULE_ID, "debug"));
    } catch {
      return false;
    }
  }

  debug(record) {
    if (this.debugEnabled) console.debug("Bloody Art | resolved melee attack", record);
  }

  error(message, error) {
    console.error(message, error);
  }
}
