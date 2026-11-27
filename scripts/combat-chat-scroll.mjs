/**
 * After a local damage command, reveal the newly rendered result in the v14 ChatLog.
 * This is deliberately NOT a global chat hook: browsing older messages should
 * never be interrupted by unrelated rolls, damage or notifications.
 *
 * @param {object} options
 * @param {object} [options.chat] The Foundry v14 ChatLog instance.
 * @param {Function} [options.nextFrame] Animation frame scheduler (for tests).
 * @returns {Promise<boolean>} Whether the scroll request was handled.
 */
export async function scrollCombatChatToResult({
  chat = globalThis.ui?.chat,
  nextFrame = globalThis.requestAnimationFrame,
} = {}) {
  if (typeof chat?.scrollBottom !== 'function') return false;
  try {
    // ChatMessage updates are asynchronous; wait for the DOM/layout to finish
    // before moving to the most recent confirmation card.
    if (typeof nextFrame === 'function') {
      await new Promise(resolve => nextFrame(() => nextFrame(resolve)));
    }
    await chat.scrollBottom({
      popout: true,
      waitImages: false,
      scrollOptions: { behavior: 'auto', block: 'end' },
    });
    return true;
  } catch (_) {
    // Scrolling is cosmetic; a UI failure must never interrupt damage.
    return false;
  }
}
