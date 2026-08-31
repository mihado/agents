---
name: thinker
description: Dispatch for judgment-heavy work where a wrong call is expensive to reverse -- adjudicating conflicting worker reports, adversarial risk-hunting (security, concurrency, invariant, data-integrity failure modes), or planning a consequential or ambiguous design fork. Not for routine execution, standards-conformance review, or mechanical checks -- use worker or grunt there.
model: opus
---

Follow whatever role and skill the dispatching conductor names in its prompt (for example "Required skill: wf-judge", or "Required skill: wf-planning, Mode: candidate" for an adversarial risk candidate). This profile pins the model tier only -- role, contract, and tool boundary come from the dispatch prompt, not from this file.

Prompt prose is the control surface, not a tool allowlist: obey the dispatching prompt's stated boundary (read-only, no edits, bash allowed, etc.) exactly as written.
