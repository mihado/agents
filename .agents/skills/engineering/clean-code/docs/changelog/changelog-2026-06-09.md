# Changelog — 2026-06-09

## Created the `clean-code` agent skill

### What
A new skill that guides a coding agent to refactor any codebase using Martin Fowler's refactoring catalog as organized by refactoring.guru. Files: `SKILL.md` + three reference docs (`clean-code-principles.md`, `code-smells.md`, `refactoring-techniques.md`), plus `README.md`.

### Why these decisions

- **Progressive disclosure (thin SKILL.md + deep references).** Per the write-a-skill guidance, the entry file stays ~100 lines and carries only the operating loop and rules; the bulky catalog (22 smells, 60+ techniques) lives in `references/` and is loaded only when a task needs it. Keeps token cost low while preserving the "deep research" the user asked for.

- **Three references split by job, not by topic dump.**
  - `code-smells.md` is the *diagnosis* index (symptom → technique).
  - `refactoring-techniques.md` is the *fix* catalog (technique → before/after).
  - `clean-code-principles.md` is the *prevention* layer (habits that stop smells).
  This mirrors the natural workflow: detect → choose → apply, and lets the agent open exactly one file for the step it's on.

- **Before → after code for high-frequency techniques only.** Extract Method, Guard Clauses, Replace Conditional with Polymorphism, Introduce Parameter Object, etc. get full examples; the long tail gets a tight "what/when." Rationale: examples are where the value is, but a worked example for all 60 would bloat the file past usefulness.

- **Behavior-preserving framed as a hard contract.** The single biggest risk with an agent "cleaning code" is silent behavior change. SKILL.md makes "refactoring never changes behavior; tests stay green every step; refactor and feature work go in separate commits" non-negotiable, drawn directly from refactoring.guru's "How to refactor" page.

- **Opposing-pairs warning.** Included the smell/technique inverses (Divergent Change ↔ Shotgun Surgery, Middle Man ↔ Message Chains, Hide Delegate ↔ Remove Middle Man, Extract ↔ Inline) so the agent doesn't over-correct one smell into its opposite — a common failure mode of mechanical "clean up everything" passes.

- **Language-agnostic examples.** Used neutral JS/TS/Python-style snippets and noted the patterns apply to any OO/procedural codebase, satisfying the "any codebase" requirement.

### Sources
Researched and synthesized from refactoring.guru pages: what-is-refactoring, when, how-to, /techniques, /smells. Underlying method credited to Fowler's *Refactoring*.

### Verification
- All files written and present under the repo root.
- SKILL.md frontmatter has `name` + trigger-rich `description` per skill spec.
- Reference links in SKILL.md point to existing files (`references/*.md`), one level deep.

---

## Added a GitHub Pages landing page and made the repo public

### What
A single-file `index.html` landing page at the repo root, served via GitHub Pages. The repo visibility was switched from private to public (explicit user request).

### Why these decisions

- **Single static `index.html`, no framework, no build step.** GitHub Pages serves the file directly. Pulling in React/Tailwind would add a build pipeline Pages cannot run without Actions, violating "smallest correct change." The design-authority guidance (taste-skill) names React/Tailwind, but its rules are contextual: the page honors the *principles* (typography, single accent, contrast, motion discipline, accessibility) in honest vanilla CSS.

- **Dark single-mode lock, justified.** Code samples are the primary content of a refactoring page and read best on a dark canvas; a light/dark toggle would dilute the identity. Recorded per the taste pre-flight ("single-mode lock justified").

- **One accent (emerald green), semantic before/after.** Green reads as "clean / passing," on-theme for refactoring. Rose marks "before/smell" and green marks "after/clean" as semantic state, not a second brand accent. Keyword-blue in code is syntax highlighting, expected by readers.

- **Code panels are the real visuals, not stock imagery.** For a refactoring skill, genuine before/after code is more honest than decorative hero images, and avoids AI-slop. This satisfies the "real component preview" allowance and the div-fake-screenshot ban.

- **Dials: VARIANCE 6 / MOTION 3 / DENSITY 4.** Calm editorial dev-tool read. Motion is CSS-only reveal via IntersectionObserver (no scroll listeners), disabled under `prefers-reduced-motion`.

### Verification (real, via headless Chrome screenshots)
- Rendered and visually QA'd at desktop (1440) and the narrowest viewport headless Chrome will honor (~500px). Injected a measurement script: widest element equals the viewport itself (`scrollWidth == innerWidth`), so there is zero horizontal overflow.
- Fixed during QA: hero headline forced to 2 lines; grid blowout from fixed-width code panels resolved with `minmax(0,1fr)` tracks plus `min-width:0` / `overflow:hidden` on cells and `overflow-x:auto` on `pre`; loop steps go 5-col then 1-col to avoid an orphan cell at mid-width.
- Static checks: zero em/en dashes (`grep`), one accent token, one radius scale (8/12/16), reduced-motion guards present, no manual scroll listeners.
- QA screenshots live under `.qa/` and are gitignored.

### Note
Repository made public at the user's explicit request. Pages source: `main` branch, root. Live URL once the branch is pushed: https://cskwork.github.io/clean-code-skill/
