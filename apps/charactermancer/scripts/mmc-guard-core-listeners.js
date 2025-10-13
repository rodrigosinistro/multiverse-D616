
// v0.6.95 — guard to prevent 'parentElement' crash when another module re-renders MMCCharactermancer mid-render
Hooks.once('init', () => {
  const register = () => {
    try {
      if (globalThis.libWrapper) {
        libWrapper.register('marvel-multiverse-charactermancer',
          'Application.prototype._activateCoreListeners',
          function (wrapped, html) {
            try {
              if (this?.constructor?.name === "MMCCharactermancer" && (!html?.[0] || !html[0]?.parentElement)) {
                console.warn('[mmc] guard: skip _activateCoreListeners (no parentElement)');
                return; // avoid crash
              }
            } catch (e) { /* ignore */ }
            return wrapped(html);
          },
          'MIXED'
        );
        return;
      }
    } catch (e) {}
    // Fallback without libWrapper
    const proto = (globalThis.Application || foundry.applications?.ApplicationV2 || foundry.applications?.Application)?.prototype || Application.prototype;
    const _orig = proto._activateCoreListeners;
    proto._activateCoreListeners = function(html) {
      try {
        if (this?.constructor?.name === "MMCCharactermancer" && (!html?.[0] || !html[0]?.parentElement)) {
          console.warn('[mmc] guard(fallback): skip _activateCoreListeners (no parentElement)');
          return;
        }
      } catch (e) {}
      return _orig.call(this, html);
    };
  };
  register();
});
