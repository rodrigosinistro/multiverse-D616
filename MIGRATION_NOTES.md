# Multiverse-D616 — v13 Compatibility Update

This package adapts the system **Multiverse-D616 (D616)** for **Foundry VTT v13**.

## What changed
- `system.json`: switched to the v10+ manifest schema and set package compatibility for v13:
  ```json
  "compatibility": { "minimum": "13", "verified": "13.341" }
  ```
- Bumped version to `2.2.0-v13-compat` to avoid collision with upstream 2.2.0.
- No code changes were required after a quick static scan for common v13 removals (`TokenConfig`, `TextEditor.enrichHTML` changes, deprecated coreVersion fields, etc.).

## Manual test checklist (v13)
1. Create a world on v13.341+ and install this zip locally.
2. Create an Actor (character) and an Item (power/trait). Ensure item sheets open and save.
3. Roll: Checks, Challenges and Attacks from the character sheet; verify chat cards, edge/trouble, fantastic results.
4. Targeting: select a token, target another, roll an Attack > verify GM sees damage prompt and auto-apply (if system supports it).
5. Effects: add/remove an Active Effect and confirm toggles work on items and actor.
6. Packs: import a compendium entry (if the system ships packs).

## Known / To watch
- If you use custom modules which hook into this system, verify they’re v13-ready.
- If you see a console warning about old manifest fields, clear any cached `minimumCoreVersion`/`compatibleCoreVersion` (we removed them here).

---

*This local update was produced for testing and is not affiliated with the upstream repository.*