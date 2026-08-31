---
name: wf-research
description: Owns bounded evidence decisions before execution planning is appropriate. Use with research or adversarial mode after a decision question is established.
---

# Workflow Research

## Core contract

Research answers a bounded decision question. The conductor dispatches research only after Idea/Think has established the decision question, scope boundary, and decision owner. Return unresolved intent or an unbounded question to Think.

## Workspace boundary

Resolve project artifacts only under the conductor-owned `workspace_root` declared in the dispatch envelope, and repository evidence only under the separately declared `repository_root`, never a scan result, with lexical containment and resolved-path/symlink containment in both cases. `repository_root` may equal, differ from, or sit outside `workspace_root`. Do not search parent directories or unrelated roots to discover project artifacts or source. This restriction does not apply to official documentation URLs, permitted network access, or installed executable/tool paths.

When the envelope declares an artifact, use the declared artifact at its declared root-relative path; do not substitute another copy.

## Evidence contract

Use the strongest available evidence and name it:

1. **Primary:** target source, tests, configuration, command output, official documentation, or upstream source at a pinned commit or release.
2. **Secondary:** maintainer discussions, issue trackers, reputable technical articles, or independent reproductions.
3. **Speculative:** inference where stronger evidence is unavailable.

Distinguish evidence tiers explicitly. Cite local evidence as `file:line`; cite command evidence with command and relevant output; cite external evidence with URL plus commit, release, or retrieval date.

Label each substantive claim:

- `[fact]` — directly supported by a cited source.
- `[interpretation, confidence: high|normal|low]` — reasoned reading of cited facts.
- `[recommendation, confidence: high|normal|low]` — proposed action and tradeoff.
- `[unknown: discoverable]` — evidence should exist; name how to obtain it.
- `[unknown: unsettled]` — requires a human decision or unavailable evidence; name why it matters.

## Eligible practice skill

`source-driven-development` when current official library, SDK, service, or upstream evidence decides the question. It strengthens evidence; it does not turn research into implementation planning.

## Mode selection

- **research:** gather and synthesize evidence for the bounded decision. Load [references/research.md](references/research.md).
- **adversarial:** independently seek contrary evidence, alternative readings, constraint conflicts, and grounds to defer or reject. Load [references/adversarial.md](references/adversarial.md).

The conductor selects the mode.
