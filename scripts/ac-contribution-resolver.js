const EPSILON = 0.001;

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function approximatelyEqual(left, right) {
  return Math.abs(left - right) <= EPSILON;
}

function actorItems(actor) {
  return Array.from(actor?.items ?? []);
}

function equippedDefenses(actor) {
  return actorItems(actor).filter(item => (
    item?.type === "equipment"
    && item.system?.equipped === true
    && typeof item.system?.type?.value === "string"
  ));
}

function unreliable(reason, item = null) {
  return { reliable: false, contribution: 0, without: null, item, reason };
}

export function resolveAcContributions(actor) {
  const ac = actor?.system?.attributes?.ac ?? {};
  const currentAC = numberOrNull(ac.value);
  const defenses = equippedDefenses(actor);
  const shields = defenses.filter(item => item.system.type.value === "shield");
  const armors = defenses.filter(item => item.system.type.value !== "shield");
  const result = {
    currentAC,
    calc: ac.calc ?? null,
    shield: unreliable("not-proven", shields[0] ?? null),
    armor: unreliable("not-proven", armors[0] ?? null)
  };

  if (currentAC === null) return result;

  const base = numberOrNull(ac.base);
  const shieldValue = numberOrNull(ac.shield);
  const bonus = numberOrNull(ac.bonus);
  const cover = numberOrNull(ac.cover);
  const minimum = numberOrNull(ac.min);
  const allPreparedPartsKnown = [base, shieldValue, bonus, cover, minimum].every(value => value !== null);

  if (shields.length === 1 && allPreparedPartsKnown && shieldValue > 0) {
    const itemValue = numberOrNull(shields[0].system?.armor?.value);
    const expectedCurrent = Math.max(minimum, base + shieldValue + bonus + cover);
    const without = Math.max(minimum, base + bonus + cover);
    if (itemValue !== null && approximatelyEqual(itemValue, shieldValue)
      && approximatelyEqual(expectedCurrent, currentAC) && without < currentAC) {
      result.shield = {
        reliable: true,
        contribution: currentAC - without,
        without,
        item: shields[0],
        reason: "prepared-dnd5e-shield"
      };
    }
  } else if (shields.length > 1) {
    result.shield.reason = "multiple-equipped-shields";
  }

  if (ac.calc !== "default") {
    result.armor.reason = `unsupported-ac-calc:${ac.calc ?? "missing"}`;
    return result;
  }
  if (armors.length !== 1) {
    result.armor.reason = armors.length > 1 ? "multiple-equipped-armors" : "no-equipped-armor";
    return result;
  }

  const armor = armors[0];
  const armorValue = numberOrNull(ac.armor);
  const armorItemValue = numberOrNull(armor.system?.armor?.value);
  const preparedDex = numberOrNull(ac.dex);
  const dexterityModifier = numberOrNull(actor?.system?.abilities?.dex?.mod);
  const magicalBonus = numberOrNull(armor.system?.armor?.magicalBonus);
  const magicIsAmbiguous = magicalBonus > 0 && typeof armor.system?.magicAvailable !== "boolean";
  const armorPartsKnown = [base, shieldValue, bonus, cover, minimum, armorValue, armorItemValue, preparedDex, dexterityModifier]
    .every(value => value !== null);

  if (!armorPartsKnown || magicIsAmbiguous) {
    result.armor.reason = magicIsAmbiguous ? "ambiguous-magic-bonus" : "missing-prepared-ac-data";
    return result;
  }
  if (bonus !== 0 || cover !== 0 || minimum > 0) {
    result.armor.reason = "other-ac-contributions-present";
    return result;
  }

  const expectedBase = armorValue + preparedDex;
  const expectedCurrent = expectedBase + shieldValue;
  const without = 10 + dexterityModifier + shieldValue;
  if (approximatelyEqual(armorValue, armorItemValue)
    && approximatelyEqual(base, expectedBase)
    && approximatelyEqual(currentAC, expectedCurrent)
    && without < currentAC) {
    result.armor = {
      reliable: true,
      contribution: currentAC - without,
      without,
      item: armor,
      reason: "verified-default-equipment-ac"
    };
  } else {
    result.armor.reason = "prepared-ac-does-not-match-equipment";
  }

  return result;
}
