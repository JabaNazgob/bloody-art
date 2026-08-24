import { IMPACT_TYPES, MODULE_PATH } from "./constants.js";

function variants(directory, stem, from, to, extension) {
  return Array.from({ length: to - from + 1 }, (_, index) => (
    `${MODULE_PATH}${directory}/${stem}${index + from}.${extension}`
  ));
}

const common = {
  attackScale: 2,
  attackZIndex: 3,
  impactDuration: 1000,
  impactFadeOut: 500,
  impactZIndex: 2,
  hitSoundVolume: 0.25,
  missSoundVolume: 0.35,
  missSounds: variants("templates/attackSound", "Промах", 0, 5, "wav")
};

export const ORIGINAL_MELEE_PROFILES = Object.freeze({
  [IMPACT_TYPES.BLUNT]: Object.freeze({
    ...common,
    id: IMPACT_TYPES.BLUNT,
    motionType: "one-handed-heavy-swing",
    sequenceFile: "jb2a.melee_generic.bludgeoning.one_handed",
    attackImages: variants("templates/attackImg", "Дробящий", 0, 5, "webp"),
    hitSounds: variants("templates/attackSound", "Попадание-дробящий", 1, 3, "wav"),
    playbackRate: 1,
    impactScale: 1.7,
    impactOffsetX: 0.2,
    hitSoundDelay: 200,
    shakeDelay: 155
  }),
  [IMPACT_TYPES.PIERCE]: Object.freeze({
    ...common,
    id: IMPACT_TYPES.PIERCE,
    motionType: "one-handed-thrust",
    sequenceFile: "jb2a.melee_generic.piercing.one_handed",
    attackImages: variants("templates/attackImg", "Колющий", 0, 5, "webp"),
    hitSounds: variants("templates/attackSound", "Попадание-колющий", 1, 3, "wav"),
    playbackRate: 1,
    impactScale: 2,
    impactOffsetX: -0.2,
    hitSoundDelay: 200,
    shakeDelay: 155
  }),
  [IMPACT_TYPES.SLASH]: Object.freeze({
    ...common,
    id: IMPACT_TYPES.SLASH,
    motionType: "one-handed-slash",
    sequenceFile: "jb2a.melee_generic.slashing.one_handed",
    attackImages: variants("templates/attackImg", "Режущий", 0, 5, "webp"),
    hitSounds: variants("templates/attackSound", "Попадание-режущий", 1, 3, "wav"),
    playbackRate: 1.75,
    impactScale: 2,
    impactOffsetX: -0.2,
    hitSoundDelay: 300,
    shakeDelay: 255
  })
});

export const PARRY_SOUND = `${MODULE_PATH}templates/attackSound/Парирование.wav`;

export function getOriginalMeleeProfile(impactType) {
  return ORIGINAL_MELEE_PROFILES[impactType] ?? null;
}
