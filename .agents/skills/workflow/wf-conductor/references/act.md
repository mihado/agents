# Act

## Plan gate

1. Parse `active.md` frontmatter `current_artifact_path` and read the artifact at that exact path. Require `artifact_role: plan`, `readiness: implementation-ready|human-approved`, and a matching settled `brief_id` with upstream research identities. A `plan-draft` or `readiness: draft` fails this gate. A human-approved Plan must include its `approval` record.
2. If the route decision is unsettled, load `references/plan.md` to select Research or Think. If the pointer or required metadata is malformed or mismatched, return `BLOCKED — Plan gate` and name the failed field.

## Attempt lifecycle

Each operator invocation starts a fresh attempt. Attempts are immutable once their evidence is written.

3. Create the absolute `<invocation_dir>/.agent-contexts/work/<work-id>/execution/attempt-<n>/` directory (incrementing from the highest existing attempt). Update the absolute `<invocation_dir>/.agent-contexts/active.md` frontmatter `latest_attempt` to the invocation-relative identifier (e.g. `work/<work-id>/execution/attempt-01`). Do not move `current_artifact_path` away from the governing Plan.

## Execution cycle

4. **Dispatch operator.** Resolve the Plan's pinned governing candidate and validate its path, identity, revision, and Brief binding. When its Implementation Units include more than one independently-verifiable unit — regardless of how the Plan was published, including human-approved, which bypasses the readiness gate that would otherwise catch this — this attempt scopes to only the next unit without an accepted completion, never the full remaining set; route it through Verify, Review, and its concern-scoped commit before starting the next attempt for the following unit (return to step 3). Send the configured `operator` with `Required skill: wf-execution`, the minimal dispatch envelope — `dispatch_id`, canonical `invocation_dir`, declared `repository_root`, `observed_target` — and the settled Plan, Brief, pinned candidate, this attempt's scoped unit(s), and any concrete prior finding when repairing. The Plan and Brief ride as dispatch content; the pinned candidate is a declared validated input. Persist the operator result to the canonical absolute `<invocation_dir>/.agent-contexts/work/<work-id>/execution/attempt-<n>/operator.md` with metadata binding it to the Plan, Brief, candidate, attempt, and observed target.

5. **Route on operator status:**
   - `COMPLETE`: continue to Verify. Pass operator.md to the verifier; require all Plan units included in this dispatch to have completed.
   - `BLOCKED`: stop. Persist the operator result and return the dependency or safety disposition to the user.
   - `NEEDS_CONTEXT`: stop. Persist the operator result and return the missing decision to Plan, Think, or the named decision owner.

6. **Dispatch verifier.** Send the configured `verifier` with `Required skill: wf-verification`, `Mode: slice`, the dispatch envelope, and validated ordered declared inputs — the Brief, Plan, and operator result — plus the Plan evidence profile, scoped to only the AC evidence this unit's own Execution Slices row names as its contribution. An AC the Plan splits across multiple named slices is not checked against its full evidence until every contributing slice has landed — a later slice's evidence being absent here is expected, not `INCOMPLETE`. Validate them under [references/artifacts.md](artifacts.md) § Dispatch inputs (path containment and expected frontmatter identity). Write its result to the absolute `<invocation_dir>/.agent-contexts/work/<work-id>/execution/attempt-<n>/verify.md` path with metadata binding it to the Brief, Plan, attempt, observed target, and evidence scope.

7. **Route on verdict:**
    - `PASS`: dispatch Review.
    - `FAIL` with a concrete repair hypothesis and safe retry conditions: persist verify.md, then apply repair gate (see below).
    - `FAIL` without a concrete hypothesis or with unsafe retry conditions: stop for human disposition.
    - `INCOMPLETE`: route by the verifier's evidence routing record:
      - `implementation` with `Ownership: owned`, a concrete repair hypothesis, and safe retry conditions: persist verify.md, then apply the repair gate.
      - `plan`: return to Plan. Missing materially applicable commands, evidence contracts, command classifications, target scope, preconditions, cleanup/recovery, or stop conditions are Plan defects. Dispatch bounded proof research for the implementation fact needed to repair the cited Plan defect, persist it, then revise the candidate or replacement Plan with the Verify artifact and that proof as declared validated planner inputs. Publish a superseding Plan before another execution attempt; this does not consume the repair budget.
      - `external`, `manual`, or ambiguous ownership: stop for the named owner.
    - `BLOCKED`: stop for the stated dependency, safety boundary, or owner.

8. **Persist and route on review:** Persist the Review result to the absolute `<invocation_dir>/.agent-contexts/work/<work-id>/execution/attempt-<n>/review.md` path, then route on disposition:
   - `no-actionable-findings`: slice complete (see below).
   - `repair-change`: apply repair gate (see below) with the bounded finding as input.
    - `replan-required`: classify the finding under the user blocker classifier in [SKILL.md](../SKILL.md). For implementation mechanics, dispatch proof research, persist it, then return to Plan with the proof as a declared planner input; return boundary-changing evidence to Think; stop only for a genuine user-owned decision.
   - `human-decision-required`: stop for the stated decision.

## Dispatch failure

Dispatch failures follow the dispatch-failure contract in [SKILL.md](../SKILL.md): persist the diagnostic; a `DISPATCH_FAILURE` carries no domain, gate, readiness, lineage, acceptance, or revision-budget authority. Operator and verifier dispatches receive no automatic retry — a dispatch failure on either is `BLOCKED`, and the attempt rules above still apply. Read-only dispatches retry once per that contract; a second failure persists a second diagnostic and returns `BLOCKED — DISPATCH_FAILURE`, and no report or gate advances.

## Repair gate

Before starting any repair attempt:

1. Persist the current Verify or Review artifact that authorized the repair.
2. If this attempt was itself a repair, evaluate evidence progress against its predecessor and update counters.
3. Apply the repair budget. If the budget is exhausted or a hard pause applies, stop.
4. Choose **inline repair** (the conductor applies the fix directly, no operator dispatch) only when the fix is named exactly by the authorizing finding, touches one file or a handful of adjacent lines, and needs no design judgment beyond what the finding already settled. Otherwise dispatch **operator repair**: start a fresh attempt (return to step 3 in the execution cycle). Either path requires the budget, hypothesis, ownership, and safety conditions above and in Unsafe retry conditions below to hold, and either path still routes through independent Verify and Review before the repair counts toward slice acceptance — inline repair changes who applies the fix, never who confirms it.

## Owned state

Owned state is repository state declared by the Plan, explicitly user-directed as a named test artifact, or created and precisely identified by the current attempt.

A declared test fixture, generated environment file, Compose override, disposable test container, temporary directory, or process started by the current attempt is owned state. The conductor may create, remove, or repair owned state when the operation is bounded, deterministic, idempotent, and has a concrete verification path. Record a user-directed artifact in the next Plan or repair evidence before changing it.

A local configuration file, credential source, service, process, or environment value outside the declared test contract is external state. Diagnose external state without mutation and stop for its owner.

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
- the target is external state or ownership is ambiguous
- the Plan does not authorize the required command, state lifecycle, or evidence contract
- credentials, services, infrastructure, or another unavailable dependency prevent meaningful verification

## Repair budget

Count verifier-driven and review-driven repairs in one shared budget:
- After **two consecutive no-progress repairs**: hard pause. Escalate to the user; the next repair requires explicit user approval.
- After **three total repair cycles**: stop regardless of progress.
- `BLOCKED`, unsafe retry conditions, or material scope drift: stop for human disposition immediately. Route `INCOMPLETE` under the evidence-routing record above.

## Completion candidate

A successful `Operator → Verify → Review` cycle with `PASS` and `no-actionable-findings` completes one unit's attempt. When the pinned candidate has other Implementation Units without an accepted completion yet, capture this unit's concern-scoped commit and start a fresh attempt for the next uncompleted unit (return to step 3); do not evaluate slice acceptance until every unit has one. Once every unit is complete, the conductor validates **slice acceptance**:

### Slice acceptance binding

A slice is accepted when all of the following hold for the same Plan and attempt:

1. **Plan binding:** The Verify and Review artifacts both reference the same `plan-<n>` in `upstream_artifacts`.
2. **Attempt binding:** The Verify and Review artifacts both reference the same `attempt-<n>` and were produced against the same `observed_target`.
3. **AC results:** Every AC ID listed as `advanced` in the Plan's `## Brief Coverage` has an explicit `MET` verdict in a Verify artifact for this Plan — the current attempt's own, or an earlier attempt's that the current one names by ID when the repair between them could not have affected that AC's evidence. A narrow inline repair's Verify artifact names the carried-forward attempt rather than re-deriving verdicts it never re-examined. An AC naming multiple contributing slices is `MET` only once every named slice's own Verify has confirmed its declared portion — already guaranteed by `Completion candidate` not evaluating this binding until every unit is complete.
4. **Verify verdict:** `PASS`.
5. **Review disposition:** `no-actionable-findings`.
6. **Diff binding:** The Review's `observed_target` is consistent with the Verify's (the same workspace state was reviewed as was verified).
7. **Unit completeness:** every Implementation Unit in the pinned candidate has a `COMPLETE` operator result, a `PASS` Verify verdict, and a `no-actionable-findings` Review disposition — this attempt's own, or an earlier attempt's under the same Plan.
8. **Commit binding:** the accepted changes are captured in one concern-scoped commit referenced by the Verify or Review evidence.

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

1. Create the absolute `<invocation_dir>/.agent-contexts/work/<work-id>/execution/final-<n>/` directory. Update the absolute `<invocation_dir>/.agent-contexts/active.md` path with `latest_attempt: work/<work-id>/execution/final-<n>`.
2. Assemble and **persist** the cumulative evidence manifest to the absolute `<invocation_dir>/.agent-contexts/work/<work-id>/execution/final-<n>/manifest.md` path (see `references/artifacts.md` § Final gate): Brief ID, accepted slices with Plan/Verify/Review IDs and ACs advanced, cumulative commands, complete AC list, diff base from `plan-01`'s baseline.
3. **Final Verify:** dispatch the verifier with `Required skill: wf-verification`, `Mode: final`, the dispatch envelope, and validated ordered declared inputs — the Brief and the final manifest — so final verification can assess full AC bodies and contracts, not only the manifest's enumeration. Validate them under [references/artifacts.md](artifacts.md) § Dispatch inputs. No retry: a final Verify `DISPATCH_FAILURE` blocks under the dispatch-failure contract in [SKILL.md](../SKILL.md). Write to the absolute `<invocation_dir>/.agent-contexts/work/<work-id>/execution/final-<n>/verify.md` path with `artifact_role: final-verification`.
4. On `PASS`: dispatch **final Review** with `Mode: final`, the dispatch envelope, and a closed ordered declared input set — the Brief, the final manifest, the final verification, and the Plan, Verify, and Review artifacts enumerated in the manifest's `accepted_slices`; nothing else is declared. The cumulative diff remains command/source context computed from `repository_root` and the manifest's `diff_base`, not an artifact input. One read-only retry per the dispatch-failure contract; a final Review `DISPATCH_FAILURE` after that retry blocks under the same rule. Write to the absolute `<invocation_dir>/.agent-contexts/work/<work-id>/execution/final-<n>/review.md` path with `artifact_role: final-review`.
5. On final Review `no-actionable-findings`: the work is a **completion candidate**.
6. On final Verify `INCOMPLETE` with `Locus: plan`, dispatch bounded proof research for the implementation fact needed to repair the cited Plan defect, persist it, then revise the candidate or replacement Plan with the final Verify artifact and that proof as declared validated planner inputs. On final Verify `FAIL` or `BLOCKED`, final Verify `INCOMPLETE` with another locus, final Review `repair-change`, or `human-decision-required`: stop for human disposition. For final Review `replan-required`, classify the finding under the user blocker classifier: implementation mechanics dispatch proof research, persist it, then return to Plan with that proof as a declared planner input; boundary-changing evidence returns to Think; a genuine user-owned decision stops. Final gate failures are otherwise not auto-repaired.

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
- Evidence: `<invocation_dir>/.agent-contexts/work/<work-id>/execution/attempt-<n>/`
- Next: plan next slice
```

```md
## Work Complete — Completion Candidate
- All Brief ACs: MET
- Final Verification: PASS
- Final Review: no actionable findings
- Evidence: `<invocation_dir>/.agent-contexts/work/<work-id>/execution/`
- Recommend: close work?
```

```md
## Act Blocked
- Gate: <Plan | Operator | Verify | Review>
- Status: <BLOCKED | NEEDS_CONTEXT | FAIL | replan-required | human-decision-required>
- Evidence: `<invocation_dir>/.agent-contexts/work/<work-id>/execution/attempt-<n>/`
- Blocker: <short reason and disposition owner>
```

```md
## Act Incomplete
- Verification: INCOMPLETE
- Evidence: `<invocation_dir>/.agent-contexts/work/<work-id>/execution/attempt-<n>/`
- Required disposition: <missing evidence and human owner>
```
