# Pre-Brief Methods

When work cannot safely advance because intent, behavior, or scope is unresolved, the conductor loads the appropriate method. These are not workflow lanes — their output feeds Think.

## Interview

Trigger: continuing would require silent assumptions about who, why, success, constraints, or priorities.

Method: load `interview-me`. Hypothesis first, one question at a time, each question carries a guess, then restate and confirm.

Completion: a confirmed statement of intent — outcome, constraints, acceptance, and decision owner are settled enough to write a Brief.

Output feeds Think. An interview result is not itself a Brief.

## Prototype

Trigger: direction is known but the user needs something concrete to react to before committing to acceptance criteria.

Method: load `prototype`. Propose prototyping before writing throwaway code unless explicitly invoked.

Contract:

```md
## Prototype Question
<one decision this prototype should inform>

## Assumption
<current best direction>

## Reaction Test
<what the user should inspect, try, compare, or decide>

## Disposable Boundary
<where prototype code lives and how it remains outside production>

## Decision Output
<adopt | revise | reject | unresolved, with rationale>
```

Completion: a runnable reaction surface plus a recorded decision.

Output feeds Think. Prototype code is disposable — it cannot satisfy production ACs or enter Act lineage.

## Wayfinding

Trigger: the destination spans multiple sessions with dependent decisions and substantial uncertainty beyond the current frontier.

Method: suggest `wayfinder`. The user decides whether to invoke it.

Completion: a shared decision map with a resolvable frontier. A bounded destination or resolved decision re-enters through Think.

The conductor suggests wayfinding; it does not create tracker structure automatically.

## Research

For factual questions that block progress, load [references/research.md](research.md). Research is shared across Think, Plan, and standalone contexts — not specific to pre-Brief work.
