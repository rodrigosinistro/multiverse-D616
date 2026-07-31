
// v0.6.95 — guard to prevent 'parentElement' crash when another module re-renders MMCCharactermancer mid-render
Hooks.once('init', () => {
  const register = () => {
    try {
      if (globalThis.libWrapper) {
        libWrapper.register('multiverse-d616',
          'Application.prototype._activateCoreListeners',
          function (wrapped, html) {
            try {
              if (this?.constructor?.name === "MMCCharactermancer" && (!html?.[0] || !html[0]?.parentElement)) {
                console.debug('[mmc] guard: skipped incomplete V1 render');
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
    const proto = foundry.appv1.api.Application.prototype;
    const _orig = proto._activateCoreListeners;
    proto._activateCoreListeners = function(html) {
      try {
        if (this?.constructor?.name === "MMCCharactermancer" && (!html?.[0] || !html[0]?.parentElement)) {
          console.debug('[mmc] guard(fallback): skipped incomplete V1 render');
          return;
        }
      } catch (e) {}
      return _orig.call(this, html);
    };
  };
  register();
});
