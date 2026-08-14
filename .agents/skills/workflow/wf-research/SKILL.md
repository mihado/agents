---
name: wf-research
description: Owns bounded evidence decisions before execution planning is appropriate. Use with research or adversarial mode after a decision question is settled.
---

# Workflow Research

## Core contract

Research answers a bounded decision question. It does not write `plan.md`, implementation units, or code. The conductor writes research artifacts after receiving the report.

Use research only when Idea/Think have already established the decision question, scope boundary, and decision owner. Return unresolved intent or an unbounded question to Think.

## Evidence contract

Use the strongest available evidence and name it in the report:

1. **Primary:** target source, tests, configuration, command output, official documentation, or upstream source at a pinned commit or release.
2. **Secondary:** maintainer discussions, issue trackers, reputable technical articles, or independent reproductions.
3. **Speculative:** inference where stronger evidence is unavailable.

Do not present secondary or speculative evidence as established behavior. Cite local evidence as `file:line`; cite command evidence with command and relevant output; cite external evidence with URL plus commit, release, or retrieval date.

Label each substantive claim:

- `[fact]` — directly supported by a cited source.
- `[interpretation, confidence: high|normal|low]` — reasoned reading of cited facts.
- `[recommendation, confidence: high|normal|low]` — proposed action and tradeoff.
- `[unknown: discoverable]` — evidence should exist; name how to obtain it.
- `[unknown: unsettled]` — requires a human decision or unavailable evidence; name why it matters.

## Eligible practice skill

Use `source-driven-development` when current official library, SDK, service, or upstream evidence decides the question. It strengthens evidence; it does not turn research into implementation planning.

## Mode selection

- **research:** gather and synthesize evidence for the bounded decision.
- **adversarial:** independently seek contrary evidence, alternative readings, constraint conflicts, and grounds to defer or reject.

The conductor selects the mode. Both modes are read-only and return a report to the conductor.

## Branch selection

- `Mode: research`: load [references/research.md](references/research.md).
- `Mode: adversarial`: load [references/adversarial.md](references/adversarial.md).
