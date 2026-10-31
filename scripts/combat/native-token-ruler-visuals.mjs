/**
 * Foundry V14 keeps the token's movement history, plotted waypoints and cost
 * accounting in TokenRuler. Multiverse-D616 renders its OWN short-lived preview,
 * therefore only the native ruler's VISUAL DECORATIONS are suppressed.
 *
 * No methods that calculate or commit movement are wrapped. Manual Rulers
 * (foundry.canvas.interaction.Ruler) are intentionally unaffected.
 */
const patched = new WeakSet();

/** Applies a reversible-at-runtime (via enabled callback) visual-only wrapper. */
export function installQuietTokenRuler(RulerClass, enabled = () => true) {
  const proto = RulerClass?.prototype;
  if (!proto || patched.has(proto)) return !!proto;
  const override = (method, quietResult) => {
    const original = proto[method];
    if (typeof original !== 'function') return;
    Object.defineProperty(proto, method, {
      configurable: true, writable: true,
      value: function(...args) {
        if (!enabled()) return original.apply(this,args);
        // For graphics, avoid computing any extra decoration while quiet. The
        // Foundry movement data, cost, path and collision continue untouched.
        if (method === '_getWaypointLabelContext') return undefined;
        const prior = original.apply(this,args);
        return quietResult(prior);
      },
    });
  };
  override('_getWaypointLabelContext', () => undefined);
  override('_getSegmentStyle', style => ({...style, alpha:0, width:0}));
  override('_getWaypointStyle', style => ({...style, alpha:0, radius:0}));
  override('_getGridHighlightStyle', style => ({...style, alpha:0}));
  override('_configureOutline', style => ({...style, thickness:0}));
  patched.add(proto);
  return true;
}

/** Install only on the TokenRuler type actually used by v14. */
export function quietFoundryTokenRulers(enabled) {
  const TokenRuler = globalThis.foundry?.canvas?.placeables?.tokens?.TokenRuler;
  return installQuietTokenRuler(TokenRuler,enabled);
}
