const EXACT_CLASSES = new Map([
  ["zhelezo", "metal"], ["stal", "metal"], ["med", "metal"], ["olovo", "metal"],
  ["svinets", "metal"], ["serebro", "metal"], ["zoloto", "metal"], ["platina", "metal"],
  ["iron", "metal"], ["steel", "metal"], ["metal", "metal"],
  ["derevo", "wood"], ["wood", "wood"],
  ["kost", "bone"], ["bone", "bone"],
  ["kamen", "stone"], ["slanets", "stone"], ["glina", "stone"], ["kirpich", "stone"], ["izvest", "stone"],
  ["stone", "stone"],
  ["kozha", "leather"], ["pergament", "leather"], ["leather", "leather"],
  ["tkan", "cloth"], ["shyolk", "cloth"], ["sherst", "cloth"], ["lyon", "cloth"], ["khlopok", "cloth"],
  ["bumaga", "cloth"], ["cloth", "cloth"],
  ["steklo", "crystal"], ["glass", "crystal"], ["crystal", "crystal"]
]);

const PATTERNS = [
  ["metal", /(?:metal|steel|iron|adamant|mithral|bronze|copper|silver|gold|platinum|сталь|желез|металл|мед[ьи]|серебр|золот|платин|бронз|латун)/iu],
  ["wood", /(?:wood|oak|ash|bamboo|derev|дерев|дуб|ясен|бамбук)/iu],
  ["bone", /(?:bone|kost|кость|кост|клык|зуб|рог|череп|хитин|панцир|когт)/iu],
  ["crystal", /(?:crystal|quartz|glass|gem|кристалл|кварц|стекл|самоцвет|драгоцен)/iu],
  ["stone", /(?:stone|rock|kamen|slate|clay|brick|granite|obsidian|кам|слан|глин|кирпич|гранит|обсидиан|известняк)/iu],
  ["leather", /(?:leather|hide|skin|kozha|кож|шкур|пергамент)/iu],
  ["cloth", /(?:cloth|fabric|silk|wool|linen|cotton|paper|ткан|ш[её]лк|шерст|л[её]н|хлоп|бумаг)/iu],
  ["organic", /(?:organic|flesh|blood|meat|plant|creature|орган|плот|кров|мяс|растен|существо)/iu]
];

function classify(exactId, metadata = null) {
  const normalized = String(exactId ?? "").trim().toLocaleLowerCase();
  if (EXACT_CLASSES.has(normalized)) return EXACT_CLASSES.get(normalized);
  const searchable = [exactId, metadata?.name, metadata?.type, metadata?.subtype].filter(Boolean).join(" ");
  for (const [materialClass, pattern] of PATTERNS) {
    if (pattern.test(searchable)) return materialClass;
  }
  if (["Существо", "Растение"].includes(metadata?.type)) return "organic";
  return "fallback";
}

export class MaterialImpactResolver {
  constructor(catalog = []) {
    this.catalog = new Map(catalog.map(entry => [String(entry.id), entry]));
  }

  resolve(exactId) {
    const preserved = exactId === null || exactId === undefined || exactId === "" ? null : String(exactId);
    return {
      exactId: preserved,
      materialClass: preserved ? classify(preserved, this.catalog.get(preserved)) : "fallback"
    };
  }
}

export async function loadRebreyaMaterialCatalog(fetchImplementation = globalThis.fetch) {
  if (typeof fetchImplementation !== "function") return [];
  try {
    const response = await fetchImplementation("modules/rebreya-main/data/materials.json");
    if (!response?.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
