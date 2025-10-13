// scripts/utils/mmc-load-traits-tags.js
/**
 * Carrega TRAITS e TAGS de TODOS os compêndios de Item (sistema, módulos e MUNDO).
 * Sem cache persistente: força índice fresco (v13) e fallback (v12).
 * Normaliza tipos: "trait"/"mm-trait" e "tag"/"mm-tag".
 */
export async function loadTraitsAndTags() {
  const traitsData = [];
  const tagsData = [];

  const itemPacks = game.packs.filter(p => p.documentName === "Item");

  for (const pack of itemPacks) {
    try {
      let index;
      try {
        // v13+ - força recarregar índice
        index = await pack.getIndex({ fields: ["name", "type", "system", "img", "flags"], reload: true });
      } catch (e) {
        // v12 fallback
        const docs = await pack.getDocuments();
        index = docs.map(d => ({
          _id: d.id, name: d.name, type: d.type, img: d.img, system: d.system, flags: d.flags
        }));
      }

      for (const entry of index) {
        const itemType = String(entry.type || "").toLowerCase();
        const normalizedType = itemType.includes("trait") ? "trait"
          : itemType.includes("tag") ? "tag"
          : itemType;
        const canonicalType = entry.type && String(entry.type).trim() ? entry.type : normalizedType;
        const mmcKind = normalizedType || String(canonicalType || "").toLowerCase();
        const base = {
          _id: entry._id,
          id: entry._id,
          uuid: `Compendium.${pack.metadata.id}.${entry._id}`,
          name: entry.name,
          type: canonicalType,
          mmcKind,
          img: entry.img || (itemType.includes("tag") ? "icons/svg/tag.svg" : "icons/svg/mystery-man.svg"),
          pack: pack.metadata.id,
          system: entry.system || {},
          flags: entry.flags || {},
          source: pack.metadata.label
        };
        if (mmcKind === "trait") traitsData.push(base);
        else if (mmcKind === "tag") tagsData.push(base);
      }
    } catch (err) {
      console.warn(`Marvel Multiverse Charactermancer | Erro ao carregar pack ${pack?.metadata?.id}:`, err);
    }
  }

  traitsData.sort((a,b)=> (a?.name||"").localeCompare(b?.name||""));
  tagsData.sort((a,b)=> (a?.name||"").localeCompare(b?.name||""));
  console.log(`Marvel Multiverse Charactermancer | Passo 4 carregou ${traitsData.length} traits e ${tagsData.length} tags`);
  return { traits: traitsData, tags: tagsData };
}
