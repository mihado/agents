---
name: design-review
description: Full design review chain — craft, audit, polish. Use before merging any UI work, or when the user says "design review", "design pass", "clean up the UI", "make it look good".
disable-model-invocation: true
---

Run these three skills in sequence on the current UI. Load each one with the `skill` tool, apply it, then move to the next.

## Pass 1: Craft

Load `refactoring-ui` with the `skill` tool. Score the UI 0-10 against its seven principles:

1. Visual hierarchy — does it pass the blur test?
2. Spacing & sizing — constrained scale, not arbitrary values?
3. Typography — modular scale, correct line heights?
4. Color — grayscale-first, systematic palette?
5. Depth & shadows — appropriate elevation?
6. Images & icons — deliberate sizing, overlays?
7. Layout & composition — not everything centered?

Fix issues found. Then move to Pass 2.

## Pass 2: Audit

Load `ux-heuristics` with the `skill` tool. Run the usability audit against the current state (after Pass 1 fixes):

1. Krug's trunk test — can users answer what this is, where they are, what they can do?
2. Nielsen's 10 heuristics — severity-rate each violation 0-4
3. Accessibility checklist — keyboard nav, screen readers, contrast
4. Dark patterns — flag anything deceptive

Fix issues found. Then move to Pass 3.

## Pass 3: Polish

Load `microinteractions` with the `skill` tool. Review the small details that separate functional from delightful:

1. Triggers — do interactive elements have clear affordances?
2. Feedback — do actions produce visible response?
3. States — are hover, active, disabled, loading, error, empty all handled?
4. Loops — progressive reveals or one-shot interactions?
5. Modes — unnecessary modal barriers?

Fix issues found.

## Output

After all three passes, produce a summary:

- Pass 1 score (out of 10) and key fixes made
- Pass 2 severity findings and fixes made
- Pass 3 polish items and fixes made
- Any remaining issues worth noting for a future session
