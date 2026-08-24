import { MESH_EVENT_TYPES, MODULE_ID, OUTCOMES } from "./constants.js";
import { cleanMissDestination, legacyPerpendicularOffset, objectSurfacePoint, pointTowardAttacker } from "./contact-geometry.js";
import { PARRY_SOUND, ORIGINAL_MELEE_PROFILES } from "./original-melee-profiles.js";
import { toDebugRecord } from "./attack-context.js";

const MATERIAL_PRESENTATION = Object.freeze({
  metal: { volume: 0.4, scale: 1.0 },
  wood: { volume: 0.34, scale: 0.92 },
  bone: { volume: 0.36, scale: 0.95 },
  stone: { volume: 0.42, scale: 0.9 },
  leather: { volume: 0.25, scale: 0.82 },
  cloth: { volume: 0.18, scale: 0.72 },
  crystal: { volume: 0.38, scale: 0.88 },
  organic: { volume: 0.3, scale: 0.86 },
  fallback: { volume: 0.32, scale: 0.9 }
});

function randomId() {
  return globalThis.foundry?.utils?.randomID?.() ?? `${Date.now()}-${Math.random()}`;
}

function addIncoming(sequence, context, destination = context.targetToken) {
  const profile = context.profile;
  sequence.effect()
    .file(profile.sequenceFile)
    .atLocation(context.attackerToken)
    .stretchTo(destination)
    .playbackRate(profile.playbackRate)
    .mirrorY(context.selected.mirrorY)
    .scale(profile.attackScale)
    .zIndex(profile.attackZIndex);
  return sequence;
}

function addMissSound(sequence, context) {
  sequence.sound().file(context.selected.missSound).volume(context.profile.missSoundVolume);
}

function impactMaterial(context) {
  switch (context.outcome) {
    case OUTCOMES.SHIELD_BLOCK: return context.materials.shield;
    case OUTCOMES.ARMOR_DEFLECT: return context.materials.armor;
    case OUTCOMES.OBJECT_BLOCK: return context.materials.object;
    case OUTCOMES.PARRY: {
      const pair = [context.materials.attackerWeapon, context.materials.defenderWeapon];
      return pair.find(value => ["metal", "crystal", "stone"].includes(value.materialClass)) ?? pair[1] ?? pair[0];
    }
    default: return context.materials.attackerWeapon;
  }
}

function addContactSound(sequence, context, material) {
  const presentation = MATERIAL_PRESENTATION[material.materialClass] ?? MATERIAL_PRESENTATION.fallback;
  const hardContact = ["metal", "crystal", "stone"].includes(material.materialClass);
  sequence.sound()
    .file(context.outcome === OUTCOMES.PARRY || hardContact ? PARRY_SOUND : context.selected.hitSound)
    .volume(presentation.volume);
  return presentation;
}

function addImpact(sequence, context, location, scale, material) {
  const presentation = MATERIAL_PRESENTATION[material.materialClass] ?? MATERIAL_PRESENTATION.fallback;
  sequence.effect()
    .file("jb2a.impact.008.orange")
    .atLocation(location)
    .spriteRotation(context.selected.impactRotation)
    .playbackRate(0.8)
    .scale(scale * presentation.scale);
  return presentation;
}

function sequenceInstance() {
  return new globalThis.Sequence({ moduleName: MODULE_ID, softFail: true });
}

export class AnimationDirector {
  constructor({ visualSync, logger }) {
    this.visualSync = visualSync;
    this.logger = logger;
  }

  async play(context) {
    let presentation = {};
    try {
      switch (context.outcome) {
        case OUTCOMES.HIT: presentation = await this.playHit(context); break;
        case OUTCOMES.DODGE: presentation = await this.playDodge(context); break;
        case OUTCOMES.PARRY: presentation = await this.playParry(context); break;
        case OUTCOMES.SHIELD_BLOCK: presentation = await this.playBlock(context, 0.25, context.selected.blockScale); break;
        case OUTCOMES.ARMOR_DEFLECT: presentation = await this.playBlock(context, 0.08, 0.5); break;
        case OUTCOMES.OBJECT_BLOCK: presentation = await this.playObjectBlock(context); break;
        case OUTCOMES.CLEAN_MISS: presentation = await this.playCleanMiss(context); break;
      }
    } catch (error) {
      this.logger?.error?.("Bloody Art | animation degraded after an error", error);
    } finally {
      this.logger?.debug?.(toDebugRecord(context, presentation));
    }
  }

  async playHit(context) {
    const profile = context.profile;
    const sequence = addIncoming(sequenceInstance(), context);
    sequence.effect()
      .file(context.selected.attackImage)
      .atLocation(context.attackerToken)
      .stretchTo(context.targetToken)
      .mirrorX()
      .mirrorY(!context.selected.mirrorY)
      .scale(profile.impactScale)
      .duration(profile.impactDuration)
      .fadeOut(profile.impactFadeOut)
      .zIndex(profile.impactZIndex)
      .spriteOffset({ x: profile.impactOffsetX }, { gridUnits: true });
    sequence.sound()
      .delay(profile.hitSoundDelay)
      .file(context.selected.hitSound)
      .volume(profile.hitSoundVolume);
    const source = context.attackerToken.center;
    const target = context.targetToken.center;
    const dx = Math.sign(target.x - source.x);
    const dy = Math.sign(target.y - source.y);
    const amplitude = context.selected.shakeAmplitudeGrid * (globalThis.canvas?.grid?.size ?? 100);
    const event = {
      eventId: randomId(),
      type: MESH_EVENT_TYPES.SHAKE,
      sceneId: context.targetToken.document?.parent?.id ?? globalThis.canvas?.scene?.id,
      tokenId: context.targetToken.id,
      delay: profile.shakeDelay,
      duration: 450,
      offset: { x: -amplitude * dy, y: amplitude * dx }
    };
    await Promise.allSettled([sequence.play(), this.visualSync.broadcast(event)]);
    return { sound: context.selected.hitSound, impact: context.selected.attackImage, meshEvent: event };
  }

  async playDodge(context) {
    const sequence = addIncoming(sequenceInstance(), context);
    addMissSound(sequence, context);
    const event = {
      eventId: randomId(),
      type: MESH_EVENT_TYPES.DODGE,
      sceneId: context.targetToken.document?.parent?.id ?? globalThis.canvas?.scene?.id,
      tokenId: context.targetToken.id,
      duration: 400,
      offset: legacyPerpendicularOffset(context.attackerToken, context.targetToken, context.selected.side)
    };
    await Promise.allSettled([sequence.play(), this.visualSync.broadcast(event)]);
    return { sound: context.selected.missSound, impact: null, meshEvent: event };
  }

  async playParry(context) {
    const contact = pointTowardAttacker(context.attackerToken, context.targetToken, 0.25);
    const material = impactMaterial(context);
    const sequence = addIncoming(sequenceInstance(), context);
    const parryProfile = ORIGINAL_MELEE_PROFILES.SLASH;
    sequence.effect()
      .file(parryProfile.sequenceFile)
      .atLocation(context.targetToken)
      .stretchTo(context.attackerToken)
      .spriteOffset({ x: -1.5 }, { gridUnits: true })
      .playbackRate(parryProfile.playbackRate)
      .mirrorY(!context.selected.mirrorY)
      .scale(parryProfile.attackScale)
      .zIndex(parryProfile.attackZIndex);
    const impact = addImpact(sequence, context, contact, context.selected.blockScale, material);
    addContactSound(sequence, context, material);
    await sequence.play();
    return { sound: PARRY_SOUND, impact: "jb2a.impact.008.orange", material, presentation: impact };
  }

  async playBlock(context, contactFraction, scale) {
    const contact = pointTowardAttacker(context.attackerToken, context.targetToken, contactFraction);
    const material = impactMaterial(context);
    const sequence = addIncoming(sequenceInstance(), context, contact);
    const impact = addImpact(sequence, context, contact, scale, material);
    addContactSound(sequence, context, material);
    await sequence.play();
    return { sound: material.materialClass, impact: "jb2a.impact.008.orange", material, presentation: impact };
  }

  async playObjectBlock(context) {
    const contact = objectSurfacePoint(context.attackerToken, context.targetToken);
    const material = impactMaterial(context);
    const sequence = addIncoming(sequenceInstance(), context, contact);
    const impact = addImpact(sequence, context, contact, context.selected.blockScale, material);
    addContactSound(sequence, context, material);
    await sequence.play();
    return { sound: material.materialClass, impact: "jb2a.impact.008.orange", material, presentation: impact };
  }

  async playCleanMiss(context) {
    const destination = cleanMissDestination(context.attackerToken, context.targetToken, context.selected.side);
    const sequence = addIncoming(sequenceInstance(), context, destination);
    addMissSound(sequence, context);
    await sequence.play();
    return { sound: context.selected.missSound, impact: null, destination };
  }
}
