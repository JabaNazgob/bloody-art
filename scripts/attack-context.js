import { DAMAGE_TYPE_TO_IMPACT, OBJECT_TYPE_NAMES, REBREYA_MODULE_ID } from "./constants.js";
import { resolveAcContributions } from "./ac-contribution-resolver.js";
import { resolveOutcome } from "./outcome-resolver.js";
import { getOriginalMeleeProfile } from "./original-melee-profiles.js";

function collectionValues(collection) {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (typeof collection.values === "function") return Array.from(collection.values());
  if (typeof collection[Symbol.iterator] === "function") return Array.from(collection);
  if (typeof collection === "object") return Object.values(collection);
  return [];
}

function damageTypesFromPart(part) {
  const types = part?.types ?? part?.[1];
  if (typeof types === "string") return [types];
  if (types && typeof types[Symbol.iterator] === "function") return Array.from(types);
  return [];
}

export function extractPhysicalImpactType(workflow) {
  const activityParts = workflow?.activity?.damage?.parts ?? [];
  const baseTypes = workflow?.item?.system?.damage?.base?.types ?? [];
  const legacyParts = workflow?.item?.system?.damage?.parts ?? [];
  const candidates = [
    ...collectionValues(activityParts).flatMap(damageTypesFromPart),
    ...collectionValues(baseTypes),
    ...collectionValues(legacyParts).flatMap(damageTypesFromPart)
  ];
  for (const type of candidates) {
    if (DAMAGE_TYPE_TO_IMPACT[type]) return DAMAGE_TYPE_TO_IMPACT[type];
  }
  return null;
}

function itemActionTypes(item) {
  const types = [item?.system?.actionType];
  const activities = collectionValues(item?.system?.activities ?? item?.activities);
  for (const activity of activities) types.push(activity?.actionType, activity?.attack?.type?.value);
  return types.filter(Boolean);
}

export function isEquippedMeleeWeapon(item) {
  return Boolean(
    item?.type === "weapon"
    && item.system?.equipped === true
    && itemActionTypes(item).includes("mwak")
  );
}

function isObjectTarget(target) {
  const actor = target?.actor;
  const custom = String(actor?.system?.details?.type?.custom ?? "").trim().toLocaleLowerCase();
  return actor?.type === "vehicle" || OBJECT_TYPE_NAMES.has(custom);
}

function exactMaterialId(document) {
  return document?.flags?.[REBREYA_MODULE_ID]?.predominantMaterialId ?? null;
}

function randomIndex(length, rng) {
  return Math.min(length - 1, Math.max(0, Math.floor(rng() * length)));
}

function targetWasHit(workflow, target) {
  return Boolean(workflow?.hitTargets?.has?.(target) || workflow?.hitTargetsEC?.has?.(target));
}

export function buildAttackContexts(workflow, { materialResolver, rng = Math.random } = {}) {
  const item = workflow?.item;
  const attackerToken = workflow?.token;
  const actionType = workflow?.activity?.actionType ?? item?.system?.actionType;
  const impactType = extractPhysicalImpactType(workflow);
  const profile = getOriginalMeleeProfile(impactType);
  if (!attackerToken || item?.type !== "weapon" || item.system?.equipped === false || actionType !== "mwak" || !profile) return [];

  const attackTotal = Number(workflow?.attackTotal ?? workflow?.attackRoll?.total ?? 0);
  const contexts = [];
  for (const targetToken of collectionValues(workflow?.targets)) {
    const targetActor = targetToken?.actor;
    if (!targetActor) continue;
    const items = collectionValues(targetActor.items);
    const defenderWeapon = items.find(isEquippedMeleeWeapon) ?? null;
    const acContributions = resolveAcContributions(targetActor);
    const targetAC = Number(targetActor.system?.attributes?.ac?.value ?? 0);
    const isObject = isObjectTarget(targetToken);
    const outcomeResult = resolveOutcome({
      isHit: targetWasHit(workflow, targetToken),
      isObject,
      attackTotal,
      targetAC,
      acContributions,
      dexterity: Number(targetActor.system?.abilities?.dex?.value ?? 10),
      canParry: Boolean(defenderWeapon),
      rng
    });
    const shield = acContributions.shield.item;
    const armor = acContributions.armor.item;
    const resolveMaterial = document => materialResolver?.resolve(exactMaterialId(document))
      ?? { exactId: exactMaterialId(document), materialClass: "fallback" };
    const actorMaterial = resolveMaterial(targetActor);
    contexts.push({
      attackerToken,
      targetToken,
      attacker: { id: attackerToken.id, name: attackerToken.name ?? attackerToken.actor?.name ?? null },
      target: { id: targetToken.id, name: targetToken.name ?? targetActor.name ?? null, isObject },
      attackTotal,
      targetAC,
      isHit: targetWasHit(workflow, targetToken),
      outcome: outcomeResult.outcome,
      missWeights: outcomeResult.weights,
      impactType,
      motionType: profile.motionType,
      profile,
      acContributions,
      items: { attackerWeapon: item, defenderWeapon, shield, armor },
      materials: {
        attackerWeapon: resolveMaterial(item),
        defenderWeapon: resolveMaterial(defenderWeapon),
        shield: resolveMaterial(shield),
        armor: resolveMaterial(armor),
        object: actorMaterial.exactId ? actorMaterial : resolveMaterial(targetToken.document)
      },
      selected: {
        attackImage: profile.attackImages[randomIndex(profile.attackImages.length, rng)],
        hitSound: profile.hitSounds[randomIndex(profile.hitSounds.length, rng)],
        missSound: profile.missSounds[randomIndex(profile.missSounds.length, rng)],
        mirrorY: rng() >= 0.5,
        side: rng() >= 0.5 ? 1 : -1,
        impactRotation: rng() * 360,
        blockScale: 0.55 + (rng() * 0.4),
        shakeAmplitudeGrid: 0.05 + (rng() * 0.15)
      }
    });
  }
  return contexts;
}

export function toDebugRecord(context, presentation = {}) {
  const itemSummary = item => item ? { id: item.id, name: item.name, type: item.type } : null;
  const contributionSummary = contribution => ({
    reliable: contribution?.reliable ?? false,
    contribution: contribution?.contribution ?? 0,
    without: contribution?.without ?? null,
    reason: contribution?.reason ?? null
  });
  return {
    attacker: context.attacker,
    target: context.target,
    attackTotal: context.attackTotal,
    targetAC: context.targetAC,
    hit: context.isHit,
    resolvedOutcome: context.outcome,
    acContributions: {
      shield: contributionSummary(context.acContributions.shield),
      armor: contributionSummary(context.acContributions.armor)
    },
    attackerWeapon: itemSummary(context.items.attackerWeapon),
    defenderWeapon: itemSummary(context.items.defenderWeapon),
    shield: itemSummary(context.items.shield),
    armor: itemSummary(context.items.armor),
    materials: context.materials,
    selectedAnimationProfile: { id: context.profile.id, motionType: context.motionType, sequenceFile: context.profile.sequenceFile },
    selectedSoundImpactVariant: { ...context.selected, ...presentation }
  };
}
