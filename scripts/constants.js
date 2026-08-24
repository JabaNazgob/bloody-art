export const MODULE_ID = "bloody-art";
export const REBREYA_MODULE_ID = "rebreya-main";
export const MODULE_PATH = `modules/${MODULE_ID}/`;
export const SOCKET_CHANNEL = `module.${MODULE_ID}`;

export const IMPACT_TYPES = Object.freeze({
  BLUNT: "BLUNT",
  PIERCE: "PIERCE",
  SLASH: "SLASH"
});

export const OUTCOMES = Object.freeze({
  HIT: "HIT",
  SHIELD_BLOCK: "SHIELD_BLOCK",
  ARMOR_DEFLECT: "ARMOR_DEFLECT",
  PARRY: "PARRY",
  DODGE: "DODGE",
  CLEAN_MISS: "CLEAN_MISS",
  OBJECT_BLOCK: "OBJECT_BLOCK"
});

export const DAMAGE_TYPE_TO_IMPACT = Object.freeze({
  bludgeoning: IMPACT_TYPES.BLUNT,
  piercing: IMPACT_TYPES.PIERCE,
  slashing: IMPACT_TYPES.SLASH
});

export const MESH_EVENT_TYPES = Object.freeze({
  DODGE: "dodge",
  SHAKE: "shake"
});

export const OBJECT_TYPE_NAMES = new Set(["object", "объект"]);
