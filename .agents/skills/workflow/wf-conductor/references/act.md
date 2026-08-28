# Act

## Plan gate

1. Parse `active.md` frontmatter `current_artifact_path` and read the artifact at that exact path. Require `artifact_role: plan`, `readiness: implementation-ready|human-approved`, and a matching settled `brief_id` with upstream research identities. A `plan-draft` or `readiness: draft` fails this gate. A human-approved Plan must include its `approval` record.
2. If the route decision is unsettled, load `references/plan.md` to select Research or Think. If the pointer or required metadata is malformed or mismatched, return `BLOCKED — Plan gate` and name the failed field.

## Attempt lifecycle

Each operator invocation starts a fresh attempt. Attempts are immutable once their evidence is written.

3. Create `execution/attempt-<n>/` (incrementing from the highest existing attempt). Update `active.md` frontmatter `latest_attempt` to the full `.agent-contexts/`-relative path (e.g. `work/<work-id>/execution/attempt-01`). Do not move `current_artifact_path` away from the governing Plan.

## Execution cycle

4. **Dispatch operator.** Send the configured `operator` with `Required skill: wf-execution`, the minimal dispatch envelope — `dispatch_id`, canonical `workspace_root`, declared `repository_root`, `observed_target` — and the settled Plan, Brief, and any concrete prior finding when repairing; the Plan and Brief ride as dispatch content, not declared `inputs`. Persist the operator result to `execution/attempt-<n>/operator.md` with metadata binding it to the Plan, Brief, attempt, and observed target.

5. **Route on operator status:**
   - `COMPLETE`: continue to Verify. Pass operator.md to the verifier; require all Plan units included in this dispatch to have completed.
   - `BLOCKED`: stop. Persist the operator result and return the dependency or safety disposition to the user.
   - `NEEDS_CONTEXT`: stop. Persist the operator result and return the missing decision to Plan, Think, or the named decision owner.

6. **Dispatch verifier.** Send the configured `verifier` with `Required skill: wf-verification`, `Mode: slice`, the dispatch envelope, and validated ordered declared inputs — the Brief, Plan, and operator result — plus the Plan evidence profile. Validate them under [references/artifacts.md](artifacts.md) § Dispatch inputs (path containment and expected frontmatter identity). Write its result to `execution/attempt-<n>/verify.md` with metadata binding it to the Brief, Plan, attempt, observed target, and evidence scope.

7. **Route on verdict:**
   - `PASS`: dispatch Review.
   - `FAIL` with a concrete repair hypothesis and safe retry conditions: persist verify.md, then apply repair gate (see below).
   - `FAIL` without a concrete hypothesis or with unsafe retry conditions: stop for human disposition.
   - `INCOMPLETE` or `BLOCKED`: stop for human disposition.

8. **Persist and route on review:** Persist the Review result to `execution/attempt-<n>/review.md`, then route on disposition:
   - `no-actionable-findings`: slice complete (see below).
   - `repair-change`: apply repair gate (see below) with the bounded finding as input.
   - `replan-required`: classify the finding under the user blocker classifier in [SKILL.md](../SKILL.md) — route implementation mechanics through Research or Plan, return boundary-changing evidence to Think, and stop only for a genuine user-owned decision.
   - `human-decision-required`: stop for the stated decision.

## Dispatch failure

Dispatch failures follow the dispatch-failure contract in [SKILL.md](../SKILL.md): persist the diagnostic; a `DISPATCH_FAILURE` carries no domain, gate, readiness, lineage, acceptance, or revision-budget authority. Operator and verifier dispatches receive no automatic retry — a dispatch failure on either is `BLOCKED`, and the attempt rules above still apply. Read-only dispatches retry once per that contract; a second failure persists a second diagnostic and returns `BLOCKED — DISPATCH_FAILURE`, and no report or gate advances.

## Repair gate

Before starting any repair attempt:

1. Persist the current Verify or Review artifact that authorized the repair.
2. If this attempt was itself a repair, evaluate evidence progress against its predecessor and update counters.
3. Apply the repair budget. If the budget is exhausted or a hard pause applies, stop.
4. Start a fresh attempt (return to step 3 in the execution cycle) only if the budget permits, a concrete safe repair hypothesis exists, and retry is safe.

## Evidence progress

Evaluated after every completed repair's verification or review. Compare with the attempt that authorized this repair (its immediate predecessor):

**Verify-driven repairs:**
- Changed failure signature, OR
- Fewer failing required checks, OR
- A previously-unmet acceptance criterion newly becomes `MET`.

**Review-driven repairs:**
- The concrete prior review finding that authorized the repair is demonstrably resolved in the new Review result.

The initial failing attempt provides the baseline for the first repair. Reset the consecutive no-progress counter when progress occurs.

## Unsafe retry conditions

A repair is unsafe (stop for human disposition) when:
- the diff is unchanged from the prior attempt
- the operation is partial or non-idempotent
- the Plan is defective (the failure is in the Plan, not the implementation)
- the environment has failed (credentials, services, infrastructure)

## Repair budget

Count verifier-driven and review-driven repairs in one shared budget:
- After **two consecutive no-progress repairs**: hard pause. Escalate to the user; the next repair requires explicit user approval.
- After **three total repair cycles**: stop regardless of progress.
- `INCOMPLETE`, `BLOCKED`, unsafe retry conditions, or material scope drift: stop for human disposition immediately.

## Completion candidate

A successful `Operator → Verify → Review` cycle with `PASS` and `no-actionable-findings` completes the current slice. Before routing, the conductor validates **slice acceptance**:

### Slice acceptance binding

A slice is accepted when all of the following hold for the same Plan and attempt:

1. **Plan binding:** The Verify and Review artifacts both reference the same `plan-<n>` in `upstream_artifacts`.
2. **Attempt binding:** The Verify and Review artifacts both reference the same `attempt-<n>` and were produced against the same `observed_target`.
3. **AC results:** Every AC ID listed as `advanced` in the Plan's `## Brief Coverage` has an explicit `MET` verdict in the Verify artifact.
4. **Verify verdict:** `PASS`.
5. **Review disposition:** `no-actionable-findings`.
6. **Diff binding:** The Review's `observed_target` is consistent with the Verify's (the same workspace state was reviewed as was verified).

If any condition fails, the slice is not accepted and the conductor must investigate the mismatch before routing.

The accepted slice's Plan ID, Verify artifact ID, and Review artifact ID become the lineage inputs for the successor Plan gate.

### Slice complete, work remains

If the Brief has acceptance criteria not yet covered by accepted slice evidence:

1. Report the slice outcome with evidence references and which ACs were advanced.
2. Return to the Plan branch to plan the next slice from the current repository state.

### All ACs covered — final Brief-wide verification

**Final-gate eligibility** (closed, checkable rule):
- Every normal AC has accepted `MET` evidence from at least one slice verification, linked by Plan ID and attempt ID.
- Every `cumulative-only` AC has a complete final evidence contract declared in the Brief.
- No Brief AC is omitted, `UNMET`, or lacking an evidence path.
- The set of AC IDs in the eligibility check matches the governing Brief exactly (no extras, no missing).

When eligibility is satisfied:

1. Create `execution/final-<n>/`. Update `latest_attempt` to `work/<work-id>/execution/final-<n>`.
2. Assemble and **persist** the cumulative evidence manifest to `execution/final-<n>/manifest.md` (see `references/artifacts.md` § Final gate): Brief ID, accepted slices with Plan/Verify/Review IDs and ACs advanced, cumulative commands, complete AC list, diff base from `plan-01`'s baseline.
3. **Final Verify:** dispatch the verifier with `Required skill: wf-verification`, `Mode: final`, the dispatch envelope, and validated ordered declared inputs — the Brief and the final manifest — so final verification can assess full AC bodies and contracts, not only the manifest's enumeration. Validate them under [references/artifacts.md](artifacts.md) § Dispatch inputs. No retry: a final Verify `DISPATCH_FAILURE` blocks under the dispatch-failure contract in [SKILL.md](../SKILL.md). Write to `execution/final-<n>/verify.md` with `artifact_role: final-verification`.
4. On `PASS`: dispatch **final Review** with `Mode: final`, the dispatch envelope, and a closed ordered declared input set — the Brief, the final manifest, the final verification, and the Plan, Verify, and Review artifacts enumerated in the manifest's `accepted_slices`; nothing else is declared. The cumulative diff remains command/source context computed from `repository_root` and the manifest's `diff_base`, not an artifact input. One read-only retry per the dispatch-failure contract; a final Review `DISPATCH_FAILURE` after that retry blocks under the same rule. Write to `execution/final-<n>/review.md` with `artifact_role: final-review`.
5. On final Review `no-actionable-findings`: the work is a **completion candidate**.
6. On final Verify `FAIL`, `INCOMPLETE`, `BLOCKED`, or final Review `repair-change` / `replan-required` / `human-decision-required`: stop for human disposition. Final gate failures are not auto-repaired.

The conductor:
1. Reports the successful outcome to the user with evidence references.
2. Recommends closure (all Brief acceptance criteria `MET`).
3. Leaves `work_status: active` until the user explicitly confirms completion.
4. On user confirmation: update `active.md` with `work_status: completed`, `closed_at`, and `closure_reason`.

## Completion formats

```md
## Slice Complete — Work Continues
- Slice Plan: `plan-<n>`
- Verification: PASS
- Review: no actionable findings
- ACs advanced: <AC IDs>
- ACs remaining: <AC IDs>
- Evidence: `.agent-contexts/work/<work-id>/execution/attempt-<n>/`
- Next: plan next slice
```

```md
## Work Complete — Completion Candidate
- All Brief ACs: MET
- Final Verification: PASS
- Final Review: no actionable findings
- Evidence: `.agent-contexts/work/<work-id>/execution/`
- Recommend: close work?
```

```md
## Act Blocked
- Gate: <Plan | Operator | Verify | Review>
- Status: <BLOCKED | NEEDS_CONTEXT | FAIL | replan-required | human-decision-required>
- Evidence: `.agent-contexts/work/<work-id>/execution/attempt-<n>/`
- Blocker: <short reason and disposition owner>
```

```md
## Act Incomplete
- Verification: INCOMPLETE
- Evidence: `.agent-contexts/work/<work-id>/execution/attempt-<n>/`
- Required disposition: <missing evidence and human owner>
```
