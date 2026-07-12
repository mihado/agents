---
name: research-and-planning
description: Grounds execution plans and research decisions in inspectable evidence. Use when planning implementation work or comparing external approaches before a decision.
---

# Research and Planning

## Overview

Planning includes research. Resolve factual questions from the target repository, tests, configuration, and authoritative documentation before proposing action. Do not turn an unsettled decision into an implementation plan.

Use one of two modes selected explicitly by the conductor:

- **Execution-planning mode** turns a settled Brief into an ordered, evidence-grounded execution plan.
- **Research mode** answers a bounded decision question with source-backed findings and recommendations. It does not produce implementation units or write `plan.md`.

## Evidence Discipline

### Source hierarchy

Use the strongest available source and name it in the report:

1. **Primary:** target repository source, tests, configuration, command output, official documentation, or upstream source at a pinned commit or release.
2. **Secondary:** maintainer discussions, issue trackers, reputable technical articles, or independent reproductions.
3. **Speculative:** an inference where stronger evidence is unavailable.

Do not state secondary or speculative evidence as established behavior. Prefer a source URL plus commit, release, or retrieval date for external repositories. Cite local evidence as `file:line`; cite command evidence with the command and relevant output.

### Claim labels

Label each substantive research claim:

- `[fact]` — directly supported by a cited source.
- `[interpretation, confidence: high|normal|low]` — reasoned reading of cited facts.
- `[recommendation, confidence: high|normal|low]` — proposed action, including its relevant tradeoff.
- `[unknown: discoverable]` — evidence should exist but was not obtained; state how to obtain it.
- `[unknown: unsettled]` — requires a human decision or evidence that does not yet exist; state why it matters.

## Execution-Planning Mode

1. Read the Brief and repository instructions.
2. Inspect the relevant code, tests, configuration, and official documentation before making factual claims.
3. Separate observed repository facts from assumptions that need a user decision.
4. Produce narrow, complete tracer-bullet implementation units with files, dependencies, and verification.
5. Name source-backed patterns the implementer should follow and list unresolved risks.

Do not inflate an execution plan with research notes. Put only evidence needed for an implementer to act in the plan.

## Research Mode

1. Restate the decision sought and its scope boundary. Reject or flag a request that cannot yet be phrased as a bounded question.
2. Gather primary evidence independently. For external repositories, inspect implementation and tests, not only README claims.
3. Record evidence before conclusions. Keep facts, interpretations, recommendations, and unknowns distinct.
4. Compare each finding against the Brief's constraints and existing workflow contract.
5. Stop when the requested decision can be made, or state precisely what evidence blocks it. Do not design implementation unless the conductor asks for a later execution plan.

### Research report format

```md
## Decision Question
<bounded decision this report informs>

## Evidence Sources
| Source | Tier | Locator | What it establishes |
| --- | --- | --- | --- |
| <source> | primary / secondary / speculative | <file:line, URL@ref, or command> | <scope> |

## Findings
- [fact] <claim> — <citation>
- [interpretation, confidence: normal] <claim> — <supporting citations>

## Recommendations
- [recommendation, confidence: high] <adopt / defer / reject decision> — <tradeoff and supporting citations>

## Unknowns
- [unknown: discoverable] <unknown> — <why it matters; how to resolve>
- [unknown: unsettled] <unknown> — <why it matters; decision owner>

## Next Decision
<the one next decision or execution Brief this report enables>
```

## Adversarial Independence

An adversarial researcher must inspect sources independently before evaluating the constructive position. It may recommend **defer** or **reject** when the evidence or fit is insufficient, but it must not invent a solution. Shared evidence rules do not replace independent source selection or contrary-evidence search.

## Rules

- Do not edit files.
- Do not present an uncited assertion as a fact.
- Do not hide missing evidence behind confident prose.
- Do not use research mode to bypass Idea-stage ambiguity resolution. Use it only when the decision question is already bounded; use `wayfinder` or interview discipline when it is not.
- In research mode, return analysis to the conductor. The conductor writes `.agent-contexts/research/` artifacts.
