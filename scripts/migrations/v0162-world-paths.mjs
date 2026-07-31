const SYSTEM_ID = "multiverse-d616";
const LEGACY_PREFIX = "systems/marvel-multiverse/";
const CURRENT_PREFIX = `systems/${SYSTEM_ID}/`;

function primaryGM() {
  return game.users?.find?.((user) => user.active && user.isGM) ?? null;
}

function isPrimaryGM() {
  return primaryGM()?.id === game.user?.id;
}

function migratedPath(value) {
  if (typeof value !== "string" || !value.includes(LEGACY_PREFIX)) return null;
  return value.split(LEGACY_PREFIX).join(CURRENT_PREFIX);
}

async function updateEmbeddedImages(parent, documentName, documents) {
  const updates = [];
  for (const document of documents ?? []) {
    const img = migratedPath(document?.img);
    if (img && img !== document.img) updates.push({ _id: document.id, img });
  }
  if (!updates.length) return 0;
  await parent.updateEmbeddedDocuments(documentName, updates);
  return updates.length;
}

export async function migrateLegacySystemAssetPaths() {
  if (game.system?.id !== SYSTEM_ID || !isPrimaryGM()) return 0;

  let updated = 0;

  for (const item of game.items ?? []) {
    const img = migratedPath(item.img);
    if (!img || img === item.img) continue;
    await item.update({ img });
    updated += 1;
  }

  for (const actor of game.actors ?? []) {
    const actorImg = migratedPath(actor.img);
    if (actorImg && actorImg !== actor.img) {
      await actor.update({ img: actorImg });
      updated += 1;
    }
    updated += await updateEmbeddedImages(actor, "Item", actor.items);
    updated += await updateEmbeddedImages(actor, "ActiveEffect", actor.effects);
  }

  if (updated) {
    console.log(`[${SYSTEM_ID}] Migrated ${updated} legacy world asset path(s) to ${CURRENT_PREFIX}`);
  }
  return updated;
}

Hooks.once("ready", () => {
  migrateLegacySystemAssetPaths().catch((error) =>
    console.error(`[${SYSTEM_ID}] Legacy asset-path migration failed`, error)
  );
});
