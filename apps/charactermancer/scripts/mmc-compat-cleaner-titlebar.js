
// v0.6.96 — Compatibility with 'cleaner-sheet-title-bar' (and similar) touching renderApplication.
Hooks.once('ready', () => {
  const ev = Hooks?.events?.renderApplication;
  if (!Array.isArray(ev)) return;
  let patched = 0;
  for (let i = 0; i < ev.length; i++) {
    const entry = ev[i];
    const orig = typeof entry === "function" ? entry : entry?.fn;
    if (typeof orig !== "function") continue;
    const src = ("" + orig);
    const looksCleaner = src.includes("cleaner-sheet-title-bar") || src.includes("cleanDocumentHeader") || src.includes("cleanSheetTabs");
    if (!looksCleaner) continue;
    const wrapped = function(app, html, data) {
      try {
        if (app?.constructor?.name === "MMCCharactermancer") return; // skip for our app only
      } catch (e) {}
      return orig(app, html, data);
    };
    if (typeof entry === "function")      ev[i] = wrapped, patched++;
    else if (entry && typeof entry === "object" && typeof entry.fn === "function") entry.fn = wrapped, patched++;
  }
  if (patched) console.warn(`[mmc] compat: wrapped ${patched} renderApplication handler(s) (cleaner-sheet-title-bar).`);
});
